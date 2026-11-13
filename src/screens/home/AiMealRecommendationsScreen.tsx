import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from '../../components/LinearGradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import apiConst from '../../abase/constant/apiConst';
import {
  cacheCurrentHousehold,
  invalidateCachedHouseholdMealPlan,
  invalidateCachedMealPlan,
  selectCurrentHousehold,
  selectHouseholdLoaded,
  selectMealPlanDestination,
  setMealPlanDestination,
} from '../../reduxs/reduces/appData';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { useAppDispatch } from '../../reduxs/store';
import { fetchCurrentHousehold } from '../../utils/householdApi';
import { navigate } from '../../utils/navigation';
import { addMealToPlan } from '../../utils/mealPlanApi';
import { scaleEstimatedPrice } from '../../utils/priceUtils';
import ScreenKeys from '../../utils/screenKey';
import {
  hasAiRecommendationConsent,
  requestAiRecommendationConsent,
  saveAiRecommendationConsent,
} from '../../utils/aiRecommendationConsent';
import { getUtcDateKey } from '../../utils/dateUtils';
import { getApiError } from '../../utils/homeUtils';
import { setSyncUser, syncApi } from '../../utils/syncUtils';
import type {
  AiMealRecommendation,
  AiMealRecommendationsResponse,
  MealPeriod,
} from '../../utils/types';
import HomeRecipeCard from './homeRecipeCard';
import ScreenHeader from '../component/ScreenHeader';
import { useFullscreenAdOnFocus } from '../component/FullscreenAdProvider';

type ScreenState = {
  recommendations: AiMealRecommendationsResponse['data'] | null;
  loading: boolean;
  error: string;
};

const PERIODS: MealPeriod[] = ['LUNCH', 'DINNER'];
const getEstimatedMealPrice = (recommendation: AiMealRecommendation) =>
  recommendation.estimatedPrice ??
  scaleEstimatedPrice(
    recommendation.estimatedPricePerServing,
    recommendation.recommendedServings,
  );

const AiMealRecommendationsScreen = () => {
  useFullscreenAdOnFocus();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useSelector(selectUserInfo);
  const household = useSelector(selectCurrentHousehold);
  const householdLoaded = useSelector(selectHouseholdLoaded);
  const destination = useSelector(selectMealPlanDestination);
  const requestId = useRef(0);
  const [state, setState] = useState<ScreenState>({
    recommendations: null,
    loading: false,
    error: '',
  });
  const [addingKey, setAddingKey] = useState<string | null>(null);

  const loadRecommendations = useCallback(async () => {
    if (!user?.accessToken || !user.id) {
      setState(previous => ({
        ...previous,
        error: 'Đăng nhập để nhận gợi ý cá nhân hóa.',
      }));
      return;
    }
    if (!user.healthProfile) {
      setState(previous => ({
        ...previous,
        error: 'Hoàn thành hồ sơ sức khỏe để nhận gợi ý cá nhân hóa.',
      }));
      return;
    }

    const currentRequestId = ++requestId.current;
    setSyncUser(user);
    setState(previous => ({ ...previous, loading: true, error: '' }));
    try {
      const date = getUtcDateKey(new Date());
      const response = (await syncApi(apiConst.getAiMealRecommendations, {
        date,
        consent: true,
      })) as AiMealRecommendationsResponse;
      const recommendationData = response.data;
      if (!response?.success || !recommendationData?.recommendations) {
        throw new Error(
          response?.message ||
            response?.ErrorMessage ||
            'Không thể tạo gợi ý AI lúc này.',
        );
      }
      if (currentRequestId !== requestId.current) return;
      setState(previous => ({
        ...previous,
        recommendations: {
          ...recommendationData,
          date,
        },
        loading: false,
        error: '',
      }));
    } catch (error) {
      if (currentRequestId === requestId.current) {
        setState(previous => ({
          ...previous,
          loading: false,
          error: getApiError(error, 'Không thể kết nối để tạo gợi ý AI.'),
        }));
      }
    }
  }, [user]);

  const requestRecommendations = useCallback(() => {
    if (!user?.accessToken || !user.id) {
      setState(previous => ({
        ...previous,
        error: 'Đăng nhập để nhận gợi ý cá nhân hóa.',
      }));
      return;
    }
    if (!user.healthProfile) {
      setState(previous => ({
        ...previous,
        error: 'Hoàn thành hồ sơ sức khỏe để nhận gợi ý cá nhân hóa.',
      }));
      return;
    }
    if (user.healthProfile.age < 18 || hasAiRecommendationConsent(user.id)) {
      loadRecommendations();
      return;
    }
    setState(previous => ({
      ...previous,
      recommendations: null,
      loading: false,
    }));
    const userId = user.id;
    function handleConsent() {
      saveAiRecommendationConsent(userId, true);
      loadRecommendations();
    }

    requestAiRecommendationConsent(handleConsent);
  }, [loadRecommendations, user]);

  useFocusEffect(
    useCallback(() => {
      requestRecommendations();
      return () => {
        requestId.current += 1;
      };
    }, [requestRecommendations]),
  );

  const openRecipe = useCallback((mealId: string) => {
    navigate(ScreenKeys.RECIPE_DETAIL, { mealId });
  }, []);

  const addRecommendationsToPlan = useCallback(
    async (
      period: MealPeriod,
      recommendations: AiMealRecommendation[],
      actionKey: string,
    ) => {
      if (!user?.accessToken || !user.id) {
        Alert.alert('Cần đăng nhập', 'Đăng nhập để thêm món vào thực đơn.');
        return;
      }
      if (!recommendations.length) return;
      setAddingKey(actionKey);
      let activeHousehold = destination === 'HOUSEHOLD' ? household : null;
      let addedCount = 0;
      let addedDirectlyToPlan = false;
      const date = state.recommendations?.date ?? getUtcDateKey(new Date());
      const invalidateMealPlan = () => {
        dispatch(
          setMealPlanDestination({
            userId: user.id,
            destination,
          }),
        );
        if (destination === 'HOUSEHOLD' && activeHousehold) {
          dispatch(
            invalidateCachedHouseholdMealPlan({
              userId: user.id,
              householdId: activeHousehold.id,
              date,
            }),
          );
        } else {
          dispatch(invalidateCachedMealPlan({ userId: user.id, date }));
        }
      };
      try {
        if (destination === 'HOUSEHOLD' && !householdLoaded) {
          const householdResponse = await fetchCurrentHousehold(user);
          if (
            !householdResponse?.success ||
            householdResponse.data === undefined
          ) {
            throw new Error(
              householdResponse?.message ||
                'Không thể kiểm tra gia đình. Vui lòng thử lại.',
            );
          }
          activeHousehold = householdResponse.data;
          dispatch(
            cacheCurrentHousehold({
              userId: user.id,
              household: activeHousehold,
            }),
          );
        }
        if (destination === 'HOUSEHOLD' && !activeHousehold) {
          throw new Error(
            'Hãy tạo hoặc tham gia gia đình trước khi thêm món vào thực đơn chung.',
          );
        }
        for (const recommendation of recommendations) {
          const response = await addMealToPlan(user, destination, {
            mealId: recommendation.meal.id,
            date,
            mealPeriod: period,
            servings:
              destination === 'HOUSEHOLD'
                ? Math.max(1, activeHousehold?.members.length ?? 1)
                : 1,
          });
          if (!response?.success) {
            throw new Error(response?.message || 'Vui lòng thử lại.');
          }
          addedCount += 1;
          addedDirectlyToPlan =
            addedDirectlyToPlan || Boolean(response.data?.addedDirectlyToPlan);
        }
        invalidateMealPlan();
        const destinationText =
          destination === 'HOUSEHOLD'
            ? addedDirectlyToPlan
              ? 'đã thêm vào thực đơn gia đình'
              : 'đã gửi đề xuất cho gia đình'
            : 'đã thêm vào thực đơn';
        Alert.alert(
          'Đã thêm món',
          `${addedCount} món ${destinationText} ngày ${date}.`,
        );
      } catch (error) {
        if (addedCount > 0) invalidateMealPlan();
        const message =
          error instanceof Error ? error.message : 'Vui lòng thử lại.';
        Alert.alert(
          addedCount > 0 ? 'Đã thêm một phần món' : 'Không thể thêm món',
          addedCount > 0
            ? `Đã thêm ${addedCount}/${recommendations.length} món. ${message}`
            : message,
        );
      } finally {
        setAddingKey(null);
      }
    },
    [
      destination,
      dispatch,
      household,
      householdLoaded,
      state.recommendations?.date,
      user,
    ],
  );
  const addMealHandlers = React.useMemo(
    () =>
      new Map(
        PERIODS.flatMap(period =>
          (state.recommendations?.recommendations[period] ?? []).map(
            recommendation => {
              const actionKey = `${period}:${recommendation.meal.id}`;
              return [
                actionKey,
                () =>
                  addRecommendationsToPlan(period, [recommendation], actionKey),
              ] as const;
            },
          ),
        ),
      ),
    [addRecommendationsToPlan, state.recommendations],
  );
  const addAllLunch = useCallback(
    () =>
      addRecommendationsToPlan(
        'LUNCH',
        state.recommendations?.recommendations.LUNCH ?? [],
        'LUNCH',
      ),
    [addRecommendationsToPlan, state.recommendations],
  );
  const addAllDinner = useCallback(
    () =>
      addRecommendationsToPlan(
        'DINNER',
        state.recommendations?.recommendations.DINNER ?? [],
        'DINNER',
      ),
    [addRecommendationsToPlan, state.recommendations],
  );

  function renderPeriod(period: MealPeriod, index: number) {
    const recommendations =
      state.recommendations?.recommendations[period] ?? [];
    const mealBudget = state.recommendations?.mealBudgets?.[period];
    const estimatedMealTotal = recommendations.reduce((total, recommendation) => {
      const estimatedPrice = getEstimatedMealPrice(recommendation);
      return total + (estimatedPrice?.maxVnd ?? 0);
    }, 0);
    const estimatedMealTotalLabel = `${Math.round(
      estimatedMealTotal,
    ).toLocaleString('vi-VN')}đ`;
    const mealBudgetLabel =
      mealBudget === undefined
        ? ''
        : `${Math.round(mealBudget).toLocaleString('vi-VN')}đ`;

    function renderRecommendation(recommendation: AiMealRecommendation) {
      return (
        <HomeRecipeCard
          key={recommendation.meal.id}
          meal={recommendation.meal}
          onPress={openRecipe}
          onAdd={addMealHandlers.get(`${period}:${recommendation.meal.id}`)}
          adding={addingKey === `${period}:${recommendation.meal.id}`}
          disableAdd={state.loading || addingKey !== null}
          recommendationReason={recommendation.recommendationReason}
          recommendedServings={recommendation.recommendedServings}
          estimatedPrice={recommendation.estimatedPrice}
        />
      );
    }

    return (
      <View key={period} style={index > 0 && styles.periodSection}>
        <View style={styles.periodHeader}>
          <Text style={styles.periodTitle}>
            {period === 'LUNCH' ? 'Bữa trưa' : 'Bữa tối'}
          </Text>
          {mealBudget !== undefined ? (
            <Text style={styles.budgetAmount}>
              {estimatedMealTotalLabel} / {mealBudgetLabel}
            </Text>
          ) : null}
        </View>
        {recommendations.length ? (
          recommendations.map(renderRecommendation)
        ) : (
          <Text style={styles.emptyText}>
            {state.recommendations?.consumedPeriods.includes(period)
              ? 'Đã ghi nhận bữa này.'
              : mealBudget !== undefined
              ? `Chưa tìm thấy món phù hợp với calo còn lại và ngân sách ${mealBudgetLabel}.`
              : 'Chưa tìm thấy món phù hợp cho bữa này. Thử đổi bữa hoặc cập nhật mục tiêu dinh dưỡng.'}
          </Text>
        )}
        {recommendations.length ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Thêm tất cả món vào ${
              period === 'LUNCH' ? 'bữa trưa' : 'bữa tối'
            }`}
            disabled={state.loading || addingKey !== null}
            onPress={period === 'LUNCH' ? addAllLunch : addAllDinner}
            style={[
              styles.addAllButton,
              (state.loading || addingKey !== null) && styles.disabled,
            ]}
          >
            {addingKey === period ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.addAllButtonText}>Thêm tất cả</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        eyebrow="HEALTH AI COACH"
        title="Gợi ý món ăn bằng AI"
        rightAction={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Làm mới gợi ý"
            disabled={state.loading || addingKey !== null}
            onPress={requestRecommendations}
            style={[
              styles.refreshButton,
              (state.loading || addingKey !== null) && styles.disabled,
            ]}
          >
            {state.loading ? (
              <ActivityIndicator color={COLORS.green} />
            ) : (
              <Text style={styles.refreshText}>↻</Text>
            )}
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {state.error ? (
          <LinearGradient colors={['#FFFFFF', '#F3FAF5']} style={styles.card}>
            <Text style={styles.error}>{state.error}</Text>
            <Pressable
              accessibilityRole="button"
              disabled={state.loading}
              onPress={requestRecommendations}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          </LinearGradient>
        ) : state.loading ? (
          <LinearGradient
            colors={['#FFFFFF', '#F3FAF5']}
            style={styles.loadingCard}
          >
            <ActivityIndicator color={COLORS.green} />
            <Text style={styles.emptyText}>
              Đang xử lý...
            </Text>
          </LinearGradient>
        ) : state.recommendations ? (
          <LinearGradient colors={['#FFFFFF', '#F3FAF5']} style={styles.card}>
            <Text style={styles.status}>
              Còn khoảng {Math.round(state.recommendations.remaining.calories)}{' '}
              kcal · Đạm {Math.round(state.recommendations.remaining.proteinG)}{' '}
              g{' · '}
              Tinh bột {Math.round(state.recommendations.remaining.carbsG)} g
              {' · '}
              Béo {Math.round(state.recommendations.remaining.fatG)} g
            </Text>
            {state.recommendations.unavailableNutritionItems > 0 ? (
              <Text style={styles.note}>
                Một số món đã ăn chưa có dữ liệu dinh dưỡng, nên chưa được tính
                vào phần còn lại.
              </Text>
            ) : null}
            {PERIODS.map(renderPeriod)}
          </LinearGradient>
        ) : (
          <LinearGradient colors={['#FFFFFF', '#F3FAF5']} style={styles.card}>
            <Text style={styles.emptyText}>
              Gợi ý bữa ăn sẽ xuất hiện tại đây.
            </Text>
          </LinearGradient>
        )}

      </ScrollView>
    </View>
  );
};

export default AiMealRecommendationsScreen;

const COLORS = {
  background: '#F5F7F5',
  white: '#FFFFFF',
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  border: '#E5EBE7',
  danger: '#B42318',
  lightGreen: '#E7F4EC',
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 8,
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 42,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  backText: {
    color: COLORS.green,
    fontSize: 34,
    lineHeight: 38,
    textAlign: 'center',
  },
  headerCopy: {},
  eyebrow: {
    color: COLORS.green,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: { marginTop: 2, color: COLORS.text, fontSize: 18, fontWeight: '800' },
  subtitle: { marginTop: 3, color: COLORS.secondary, fontSize: 10 },
  refreshButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  refreshText: { color: COLORS.green, fontSize: 27, lineHeight: 31 },
  disabled: { opacity: 0.55 },
  content: { paddingTop: 8,paddingHorizontal: 16 },
  card: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loadingCard: {
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  status: {
    marginBottom: 8,
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '800',
  },
  nutritionSummary: {
    marginBottom: 10,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 15,
  },
  note: {
    marginBottom: 8,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 15,
  },
  periodSection: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  periodTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  budgetAmount: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },
  addAllButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    borderRadius: 8,
    backgroundColor: COLORS.green,
  },
  addAllButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyText: { color: COLORS.secondary, fontSize: 11, lineHeight: 16 },
  error: { color: COLORS.danger, fontSize: 12, lineHeight: 18 },
  retryButton: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 5 },
  retryText: { color: COLORS.green, fontSize: 11, fontWeight: '800' },
  disclaimer: {
    paddingVertical: 8,
    color: COLORS.secondary,
    fontSize: 10,
    textAlign: 'center',
  },
});
