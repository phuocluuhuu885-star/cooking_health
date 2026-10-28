import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import apiConst from '../../abase/constant/apiConst';
import { selectUserInfo } from '../../reduxs/reduces/user';
import {
  cacheCurrentHousehold,
  cacheHouseholdMealPlan,
  cacheMealPlan,
  invalidateCachedConsumptionReports,
  invalidateCachedHouseholdMealPlan,
  invalidateCachedMealPlan,
  selectMealPlanDestination,
  selectCurrentHousehold,
  selectHouseholdLoaded,
  selectHouseholdMealPlan,
  selectMealPlanForDate,
  setMealPlanDestination,
} from '../../reduxs/reduces/appData';
import { useAppDispatch } from '../../reduxs/store';
import { syncApi, setSyncUser } from '../../utils/syncUtils';
import { fetchCurrentHousehold } from '../../utils/householdApi';
import type { GlobalState } from '../../type/global';
import type {
  MealPeriodOption,
  MealPeriodPlan,
  MealPlanResponse,
  MealPlanScreenState,
  Nutrition,
  PlannedMeal,
  MealPeriod,
  RecipeDetailResponse,
  HouseholdMealPlanResponse,
} from '../../utils/types';
import { aggregateMealIngredients } from '../../utils/homeUtils';
import { isHouseholdPlan } from '../../utils/mealPlanScreenUtils';
import { getVietnamDateKey } from '../../utils/dateUtils';
import { formatNumberWithOptionalDecimal } from '../../utils/numberUtils';
import { completeMealPeriod } from '../../utils/mealPlanApi';
import HomeIngredientSummaryModal from '../home/homeIngredientSummaryModal';
import PlannedMealItem from './plannedMealItem';
import HouseholdScreen from '../household';

const EMPTY_NUTRITION: Nutrition = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
};

const EMPTY_MEALS: Record<MealPeriodOption['id'], MealPeriodPlan> = {
  LUNCH: {
    items: [],
    nutritionSummary: EMPTY_NUTRITION,
    unavailableNutritionItems: 0,
  },
  DINNER: {
    items: [],
    nutritionSummary: EMPTY_NUTRITION,
    unavailableNutritionItems: 0,
  },
};

const PERIODS: MealPeriodOption[] = [
  { id: 'LUNCH', label: 'Bữa trưa' },
  { id: 'DINNER', label: 'Bữa tối' },
];

const MealPlanScreen = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useSelector(selectUserInfo);
  const household = useSelector(selectCurrentHousehold);
  const householdLoaded = useSelector(selectHouseholdLoaded);
  const viewMode = useSelector(selectMealPlanDestination);
  const [state, setState] = useState<MealPlanScreenState>({
    date: new Date().toISOString().slice(0, 10),
    selectedPeriod: 'LUNCH',
    loading: true,
    error: '',
    completingPeriod: null,
    selectedMealIds: [],
    ingredientSummary: [],
    ingredientSummaryVisible: false,
    ingredientSummaryLoading: false,
    ingredientSummaryError: '',
  });
  const cachedPersonalMealPlan = useSelector((root: GlobalState) =>
    selectMealPlanForDate(root, state.date),
  );
  const cachedHouseholdMealPlan = useSelector((root: GlobalState) =>
    viewMode === 'HOUSEHOLD' && household
      ? selectHouseholdMealPlan(root, household.id, state.date)
      : null,
  );
  const cachedMealPlan =
    viewMode === 'HOUSEHOLD' ? cachedHouseholdMealPlan : cachedPersonalMealPlan;
  const refs = useRef({
    cachedPlan: cachedMealPlan,
    ingredientRequestId: 0,
    planRequestId: 0,
  });
  refs.current.cachedPlan = cachedMealPlan;
  const meals = cachedMealPlan?.meals ?? EMPTY_MEALS;

  const loadMealPlan = useCallback(
    async (forceReload = false, silentRefresh = false) => {
      const currentRequestId = ++refs.current.planRequestId;
      const personalDate = new Date().toISOString().slice(0, 10);
      setSyncUser(user ?? null);
      if (!user?.accessToken) {
        setState(previous => ({
          ...previous,
          date: personalDate,
          loading: false,
          error: 'Vui lòng đăng nhập để xem thực đơn của bạn.',
        }));
        return;
      }
      let activeHousehold = viewMode === 'HOUSEHOLD' ? household : null;
      if (viewMode === 'HOUSEHOLD' && !householdLoaded) {
        try {
          const householdResponse = await fetchCurrentHousehold(user);
          if (
            !householdResponse?.success ||
            householdResponse.data === undefined
          ) {
            setState(previous => ({
              ...previous,
              loading: false,
              error:
                householdResponse?.message ||
                'Không thể kiểm tra thực đơn gia đình.',
            }));
            return;
          }
          activeHousehold = householdResponse.data;
          dispatch(
            cacheCurrentHousehold({
              userId: user.id,
              household: activeHousehold,
            }),
          );
        } catch {
          setState(previous => ({
            ...previous,
            loading: false,
            error: 'Không thể kết nối để kiểm tra thực đơn gia đình.',
          }));
          return;
        }
      }

      const date = activeHousehold
        ? getVietnamDateKey()
        : personalDate;
      if (
        !forceReload &&
        householdLoaded &&
        !activeHousehold &&
        refs.current.cachedPlan?.date === date
      ) {
        setState(previous => ({
          ...previous,
          date,
          loading: false,
          error: '',
        }));
        return;
      }

      setState(previous => ({
        ...previous,
        date,
        loading: silentRefresh ? previous.loading : true,
        error: '',
      }));

      try {
        const response = activeHousehold
          ? ((await syncApi(apiConst.getHouseholdMealPlan, {
              date,
            })) as HouseholdMealPlanResponse)
          : ((await syncApi(apiConst.getMealPlan, { date })) as
              | MealPlanResponse
              | undefined);
        if (currentRequestId !== refs.current.planRequestId) {
          return;
        }
        const plan = response?.data;
        if (!response?.success || !plan?.meals) {
          setState(previous => ({
            ...previous,
            loading: false,
            error: response?.message || 'Không thể tải thực đơn hôm nay.',
          }));
          return;
        }
        if (activeHousehold) {
          if (
            !isHouseholdPlan(plan) ||
            plan.householdId !== activeHousehold.id
          ) {
            setState(previous => ({
              ...previous,
              loading: false,
              error: 'Phản hồi thực đơn gia đình không hợp lệ.',
            }));
            return;
          }
          dispatch(
            cacheHouseholdMealPlan({
              userId: user.id,
              householdId: activeHousehold.id,
              date: plan.date,
              mealPlan: plan,
            }),
          );
        } else {
          if (isHouseholdPlan(plan)) {
            setState(previous => ({
              ...previous,
              loading: false,
              error: 'Phản hồi thực đơn cá nhân không hợp lệ.',
            }));
            return;
          }
          dispatch(
            cacheMealPlan({
              userId: user.id,
              date: plan.date,
              mealPlan: plan,
            }),
          );
        }
        setState(previous => ({
          ...previous,
          date: plan.date,
          loading: false,
          selectedMealIds: [],
          ingredientSummary: [],
          ingredientSummaryVisible: false,
          ingredientSummaryLoading: false,
          ingredientSummaryError: '',
        }));
      } catch {
        if (currentRequestId !== refs.current.planRequestId) {
          return;
        }
        setState(previous => ({
          ...previous,
          loading: false,
          error: 'Không thể kết nối để tải thực đơn hôm nay.',
        }));
      }
    },
    [dispatch, household, householdLoaded, user, viewMode],
  );

  const confirmMealPeriod = useCallback(
    async (mealPeriod: MealPeriod) => {
      if (!user?.accessToken) {
        return;
      }
      setState(previous => ({ ...previous, completingPeriod: mealPeriod }));
      try {
        const response = await completeMealPeriod(
          user,
          viewMode === 'HOUSEHOLD' && household ? 'HOUSEHOLD' : 'PERSONAL',
          { date: state.date, mealPeriod },
        );
        if (!response.success) {
          Alert.alert(
            'Không thể hoàn thành bữa ăn',
            response.message || 'Vui lòng thử lại.',
          );
          return;
        }
        dispatch(invalidateCachedConsumptionReports({ userId: user.id }));
        if (viewMode === 'HOUSEHOLD' && household) {
          dispatch(
            invalidateCachedHouseholdMealPlan({
              userId: user.id,
              householdId: household.id,
              date: state.date,
            }),
          );
        } else {
          dispatch(
            invalidateCachedMealPlan({ userId: user.id, date: state.date }),
          );
        }
        await loadMealPlan(true);
      } catch {
        Alert.alert('Không thể hoàn thành bữa ăn', 'Vui lòng thử lại sau.');
      } finally {
        setState(previous => ({ ...previous, completingPeriod: null }));
      }
    },
    [dispatch, household, loadMealPlan, state.date, user, viewMode],
  );

  const handleCompleteMealPeriod = useCallback(() => {
    const items = meals[state.selectedPeriod].items;
    const unrecordedItems = items.filter(item => !item.isConsumed);
    if (unrecordedItems.length === 0) {
      return;
    }
    Alert.alert(
      meals[state.selectedPeriod].isCompleted
        ? 'Ghi nhận món mới đã ăn?'
        : `Xác nhận đã ăn ${
            state.selectedPeriod === 'LUNCH' ? 'bữa trưa' : 'bữa tối'
          }?`,
      meals[state.selectedPeriod].isCompleted
        ? 'Các món mới sẽ được cộng vào báo cáo dinh dưỡng. Món đã ghi nhận trước đó không bị tính lặp.'
        : 'Tất cả món trong bữa sẽ được ghi nhận vào báo cáo dinh dưỡng của bạn.',
      [
        { text: 'Chưa ăn', style: 'cancel' },
        {
          text: meals[state.selectedPeriod].isCompleted
            ? 'Ghi nhận thêm'
            : 'Xác nhận đã ăn',
          onPress: () => confirmMealPeriod(state.selectedPeriod),
        },
      ],
    );
  }, [confirmMealPeriod, meals, state.selectedPeriod]);

  const deletePlannedMeal = useCallback(
    (item: PlannedMeal) => {
      if (!user?.accessToken) {
        return;
      }
      const isSharedPlan = viewMode === 'HOUSEHOLD' && Boolean(household);
      Alert.alert(
        isSharedPlan ? 'Bỏ phiếu không chọn món' : 'Xóa món khỏi thực đơn',
        isSharedPlan
          ? `Bạn sẽ bỏ phiếu không đồng ý với "${item.meal.name}". Món chỉ bị loại khỏi thực đơn gia đình nếu số phiếu đồng ý không nhiều hơn phiếu không đồng ý lúc 11:00.`
          : `Bạn có chắc muốn xóa "${item.meal.name}" khỏi thực đơn?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: isSharedPlan ? 'Bỏ phiếu' : 'Xóa',
            style: isSharedPlan ? 'default' : 'destructive',
            onPress: async () => {
              setSyncUser(user);
              try {
                const response = (await syncApi(
                  isSharedPlan
                    ? apiConst.deleteHouseholdPlannedMeal
                    : apiConst.deleteMealFromPlan,
                  { id: item.id },
                )) as { success: boolean; message?: string };
                if (!response?.success) {
                  Alert.alert(
                    isSharedPlan ? 'Không thể ghi phiếu' : 'Không thể xóa món',
                    response?.message || 'Vui lòng thử lại.',
                  );
                  return;
                }
                dispatch(
                  invalidateCachedConsumptionReports({ userId: user.id }),
                );
                if (isSharedPlan && household) {
                  dispatch(
                    invalidateCachedHouseholdMealPlan({
                      userId: user.id,
                      householdId: household.id,
                      date: state.date,
                    }),
                  );
                } else {
                  dispatch(
                    invalidateCachedMealPlan({
                      userId: user.id,
                      date: state.date,
                    }),
                  );
                }
                await loadMealPlan(true);
                if (isSharedPlan) {
                  Alert.alert(
                    'Đã ghi nhận phiếu',
                    'Món sẽ được xét cùng phiếu của các thành viên lúc 11:00.',
                  );
                }
              } catch {
                Alert.alert(
                  isSharedPlan ? 'Không thể ghi phiếu' : 'Không thể xóa món',
                  'Vui lòng thử lại sau.',
                );
              }
            },
          },
        ],
      );
    },
    [dispatch, household, loadMealPlan, state.date, user, viewMode],
  );

  const selectPeriod = useCallback((selectedPeriod: MealPeriod) => {
    refs.current.ingredientRequestId += 1;
    setState(previous => ({
      ...previous,
      selectedPeriod,
      selectedMealIds: [],
      ingredientSummary: [],
      ingredientSummaryVisible: false,
      ingredientSummaryLoading: false,
      ingredientSummaryError: '',
    }));
  }, []);

  const handleSelectLunch = useCallback(() => {
    selectPeriod('LUNCH');
  }, [selectPeriod]);

  const handleSelectDinner = useCallback(() => {
    selectPeriod('DINNER');
  }, [selectPeriod]);

  const handleRetryLoadMealPlan = useCallback(() => {
    loadMealPlan();
  }, [loadMealPlan]);

  const renderPeriodTab = useCallback(
    (period: MealPeriodOption) => {
      const selected = state.selectedPeriod === period.id;
      const onPress =
        period.id === 'LUNCH' ? handleSelectLunch : handleSelectDinner;
      return (
        <Pressable
          key={period.id}
          accessibilityRole="tab"
          accessibilityState={{ selected }}
          onPress={onPress}
          style={styles.periodTab}
        >
          <LinearGradient
            colors={
              selected
                ? ['#2FA878', '#168653']
                : ['#FFFFFF', '#EAF6EE']
            }
            pointerEvents="none"
            style={styles.periodTabGradient}
          />
          <Text
            style={[styles.periodTabText, selected && styles.selectedTabText]}
          >
            {period.label}
          </Text>
        </Pressable>
      );
    },
    [handleSelectDinner, handleSelectLunch, state.selectedPeriod],
  );

  const selectedMeals = useMemo(
    () =>
      PERIODS.flatMap(period => meals[period.id].items).filter(item =>
        state.selectedMealIds.includes(item.id),
      ),
    [meals, state.selectedMealIds],
  );
  const loadIngredientSummary = useCallback(
    async (mealsToSummarize: PlannedMeal[] = selectedMeals) => {
      if (mealsToSummarize.length === 0) {
        return;
      }
      const requestId = ++refs.current.ingredientRequestId;
      setState(previous => ({
        ...previous,
        ingredientSummaryVisible: true,
        ingredientSummaryLoading: true,
        ingredientSummaryError: '',
      }));
      try {
        const mealDetails = await Promise.all(
          mealsToSummarize.map(async item => {
            const response = (await syncApi(apiConst.getMealDetail, {
              id: item.meal.id,
              servings: item.servings,
            })) as RecipeDetailResponse;
            if (!response?.success || !response.data) {
              throw new Error(
                response?.message ||
                  response?.ErrorMessage ||
                  `Không thể tải nguyên liệu của món ${item.meal.name}.`,
              );
            }
            return response.data;
          }),
        );
        if (requestId !== refs.current.ingredientRequestId) {
          return;
        }
        setState(previous => ({
          ...previous,
          ingredientSummary: aggregateMealIngredients(mealDetails),
          ingredientSummaryLoading: false,
        }));
      } catch (error) {
        if (requestId === refs.current.ingredientRequestId) {
          setState(previous => ({
            ...previous,
            ingredientSummary: [],
            ingredientSummaryLoading: false,
            ingredientSummaryError:
              error instanceof Error && error.message
                ? error.message
                : 'Không thể tổng hợp nguyên liệu. Vui lòng thử lại.',
          }));
        }
      }
    },
    [selectedMeals],
  );
  const closeIngredientSummary = useCallback(() => {
    refs.current.ingredientRequestId += 1;
    setState(previous => ({
      ...previous,
      ingredientSummaryVisible: false,
      ingredientSummaryLoading: false,
    }));
  }, []);
  const activePlan = meals[state.selectedPeriod];
  const viewPeriodIngredients = useCallback(() => {
    if (activePlan.items.length === 0) {
      return;
    }
    setState(previous => ({
      ...previous,
      selectedMealIds: activePlan.items.map(item => item.id),
    }));
    loadIngredientSummary(activePlan.items);
  }, [activePlan.items, loadIngredientSummary]);

  useFocusEffect(
    useCallback(() => {
      if (viewMode === 'HOUSEHOLD') {
        return () => {
          refs.current.planRequestId += 1;
        };
      }
      loadMealPlan();
      return () => {
        refs.current.planRequestId += 1;
      };
    }, [loadMealPlan, viewMode]),
  );

  const totalNutrition = PERIODS.reduce(
    (total, period) => {
      const nutrition = meals[period.id].nutritionSummary;
      return {
        calories: total.calories + nutrition.calories,
        proteinG: total.proteinG + nutrition.proteinG,
        carbsG: total.carbsG + nutrition.carbsG,
        fatG: total.fatG + nutrition.fatG,
      };
    },
    { ...EMPTY_NUTRITION },
  );
  const dailyCaloriesTarget = user?.healthProfile?.dailyCaloriesTarget;
  const toggleViewMode = useCallback(() => {
    refs.current.ingredientRequestId += 1;
    setState(previous => ({
      ...previous,
      selectedMealIds: [],
      ingredientSummary: [],
      ingredientSummaryVisible: false,
      ingredientSummaryLoading: false,
      ingredientSummaryError: '',
    }));
    dispatch(
      setMealPlanDestination({
        userId: user?.id ?? 'guest',
        destination: viewMode === 'PERSONAL' ? 'HOUSEHOLD' : 'PERSONAL',
      }),
    );
  }, [dispatch, user?.id, viewMode]);

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top + 12 }]}>
      <View style={styles.screenHeader}>
        <View style={styles.screenHeaderText}>
          <Text style={styles.title}>
            {viewMode === 'HOUSEHOLD'
              ? 'Gia đình của bạn'
              : 'Thực đơn hôm nay'}
          </Text>
          <Text style={styles.subtitle}>
            {viewMode === 'HOUSEHOLD'
              ? household?.name ?? 'Thực đơn chung và bình chọn món'
              : `Bữa trưa và bữa tối · ${state.date}`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            viewMode === 'PERSONAL'
              ? 'Chuyển sang thực phẩm gia đình'
              : 'Chuyển sang thực phẩm cá nhân'
          }
          onPress={toggleViewMode}
          style={styles.scopeSwitch}
        >
          <Text style={styles.scopeSwitchText}>
            {viewMode === 'PERSONAL' ? 'Gia đình' : 'Cá nhân'}
          </Text>
        </Pressable>
      </View>

      {viewMode === 'HOUSEHOLD' ? (
        <HouseholdScreen embedded />
      ) : (
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {state.loading ? (
            <View style={styles.statusContainer}>
              <ActivityIndicator color={COLORS.green} />
            </View>
          ) : state.error ? (
            <View style={styles.statusContainer}>
              <Text style={styles.errorText}>{state.error}</Text>
              {user?.accessToken ? (
                <Pressable onPress={handleRetryLoadMealPlan}>
                  <Text style={styles.retryText}>Thử lại</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <>
              <LinearGradient
                colors={['#FFFFFF', '#F0F8F2']}
                style={styles.card}
              >
                <Text style={styles.cardTitle}>
                  Tổng dinh dưỡng đã lên kế hoạch
                </Text>
                <Text style={styles.calories}>
                  {totalNutrition.calories} kcal
                  {dailyCaloriesTarget ? ` / ${dailyCaloriesTarget} kcal` : ''}
                </Text>
                <Text style={styles.macros}>
                  Đạm {formatNumberWithOptionalDecimal(
                    totalNutrition.proteinG,
                  )} g · Carb{' '}
                  {formatNumberWithOptionalDecimal(totalNutrition.carbsG)} g ·
                  Béo{' '}
                  {formatNumberWithOptionalDecimal(totalNutrition.fatG)} g
                </Text>
              </LinearGradient>
              <View style={styles.periodTabs}>
                {PERIODS.map(renderPeriodTab)}
              </View>
              <LinearGradient
                colors={['#FFFFFF', '#F0F8F2']}
                style={styles.card}
              >
                <View style={styles.periodHeader}>
                  <Text style={styles.cardTitle}>
                    {PERIODS.find(period => period.id === state.selectedPeriod)
                      ?.label ?? ''}
                  </Text>
                  {activePlan.items.length > 0 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Xem nguyên liệu tất cả món ${
                        state.selectedPeriod === 'LUNCH'
                          ? 'bữa trưa'
                          : 'bữa tối'
                      }`}
                      onPress={viewPeriodIngredients}
                      style={styles.periodIngredientButton}
                    >
                      <Text style={styles.periodIngredientButtonText}>
                        Xem nguyên liệu
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {activePlan.items.length === 0 ? (
                  <Text style={styles.emptyText}>
                    Chưa có món nào. Thêm món từ tab Công thức.
                  </Text>
                ) : (
                  <>
                    {activePlan.items.map(item => (
                      <PlannedMealItem
                        key={item.id}
                        item={item}
                        canDelete={
                          !activePlan.isLocked && !activePlan.isCompleted
                        }
                        onDelete={deletePlannedMeal}
                      />
                    ))}
                    {activePlan.isCompleted ? (
                      <Text style={styles.completedMessage}>
                        Bữa ăn đã được ghi nhận. Món mới sẽ được cộng thêm khi
                        xác nhận.
                      </Text>
                    ) : activePlan.isLocked ? (
                      <Text style={styles.completedMessage}>
                        Thực đơn đã được cố định bởi một thành viên. Bạn vẫn có
                        thể xác nhận phần ăn của mình.
                      </Text>
                    ) : null}
                    {activePlan.items.some(item => !item.isConsumed) ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={
                          state.completingPeriod === state.selectedPeriod
                        }
                        onPress={handleCompleteMealPeriod}
                        style={styles.completeMealButton}
                      >
                        {state.completingPeriod === state.selectedPeriod ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text style={styles.completeMealButtonText}>
                            {activePlan.isCompleted
                              ? 'Ghi nhận món mới đã ăn'
                              : 'Xác nhận đã ăn cả bữa'}
                          </Text>
                        )}
                      </Pressable>
                    ) : null}
                  </>
                )}

                {activePlan.unavailableNutritionItems > 0 ? (
                  <Text style={styles.helperText}>
                    {activePlan.unavailableNutritionItems} món chưa tính được
                    dinh dưỡng do thiếu dữ liệu khối lượng.
                  </Text>
                ) : null}
              </LinearGradient>
            </>
          )}
          <View style={styles.bottomSpace} />
        </ScrollView>
      )}
      {viewMode === 'PERSONAL' ? (
        <HomeIngredientSummaryModal
          visible={state.ingredientSummaryVisible}
          selectedMeals={selectedMeals.map(item => ({
            id: item.meal.id,
            name: item.meal.name,
            servings: item.servings,
          }))}
          ingredients={state.ingredientSummary}
          loading={state.ingredientSummaryLoading}
          error={state.ingredientSummaryError}
          onClose={closeIngredientSummary}
          onRetry={loadIngredientSummary}
        />
      ) : null}
    </View>
  );
};

const COLORS = {
  background: '#F5F6F7',
  white: '#FFFFFF',
  text: '#1C242C',
  secondary: '#7A858E',
  green: '#2FA878',
  border: '#E9ECEF',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
    marginBottom: 48,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 124,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 18,
  },
  screenHeaderText: { flex: 1, paddingRight: 10 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    marginTop: 4,
    color: COLORS.secondary,
    fontSize: 13,
  },
  scopeSwitch: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.green,
  },
  scopeSwitchText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  calories: {
    marginTop: 12,
    color: COLORS.green,
    fontSize: 24,
    fontWeight: '800',
  },
  macros: {
    marginTop: 8,
    color: COLORS.secondary,
    fontSize: 12,
  },
  helperText: {
    marginTop: 10,
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 17,
  },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  periodTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  periodTab: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  periodTabGradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 12,
  },
  periodTabText: {
    color: COLORS.secondary,
    fontSize: 13,
    fontWeight: '700',
  },
  selectedTabText: {
    color: COLORS.white,
  },
  periodIngredientButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderRadius: 12,
    backgroundColor: '#E7F4EC',
  },
  periodIngredientButtonText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '800',
  },
  emptyText: {
    paddingTop: 6,
    color: COLORS.secondary,
    fontSize: 13,
  },
  statusContainer: {
    flex: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#B42318',
    textAlign: 'center',
  },
  retryText: {
    marginTop: 12,
    color: COLORS.green,
    fontWeight: '700',
  },
  completedMessage: {
    marginTop: 12,
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 17,
  },
  completeMealButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: COLORS.green,
  },
  completeMealButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  bottomSpace: {
    height: 32,
  },
});

export default MealPlanScreen;
