import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
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
import { selectUserInfo } from '../../reduxs/reduces/user';
import {
  cacheConsumptionReport,
  cacheCurrentHousehold,
  cacheHouseholdMealPlan,
  cacheMealCatalog,
  cacheMealPlan,
  getConsumptionReportCacheKey,
  selectConsumptionReport,
  selectCurrentHousehold,
  selectHouseholdLoaded,
  selectHouseholdMealPlan,
  selectMealCatalog,
  selectMealCatalogLoaded,
  selectMealPlanDestination,
  selectMealPlanForDate,
  setMealPlanDestination,
} from '../../reduxs/reduces/appData';
import { useAppDispatch } from '../../reduxs/store';
import type { GlobalState } from '../../type/global';
import ScreenKeys from '../../utils/screenKey';
import { navigate } from '../../utils/navigation';
import { setSyncUser, syncApi } from '../../utils/syncUtils';
import { fetchExpenses } from '../../utils/expenseApi';
import { fetchCurrentHousehold } from '../../utils/householdApi';
import { fetchHouseholdChatUnreadCount } from '../../utils/householdChatApi';
import { fetchHouseholdNotificationUnreadCount } from '../../utils/householdNotificationApi';
import { fetchMealReviewSummaries } from '../../utils/mealReviewApi';
import {
  formatDateLabel,
  getApiError,
  getDefaultMealPeriod,
} from '../../utils/homeUtils';
import { getUtcDateKey, getVietnamDateKey } from '../../utils/dateUtils';
import { welcomeTextTime } from '../../utils/stringUtils';
import { isHouseholdPlan as isHouseholdMealPlan } from '../../utils/mealPlanScreenUtils';
import type {
  ConsumptionReportResponse,
  HouseholdMealPlanResponse,
  HomeDashboardState,
  MealPlanResponse,
  MealsResponse,
  ExpenseMonthData,
} from '../../utils/types';
import HomeMealPeriod from './homeMealPeriod';
import HomeNutritionCard from './homeNutritionCard';
import HomeRecipeCard from './homeRecipeCard';
import AICoachBox from './AICoachBox';
import HouseholdChatButton from '../household/HouseholdChatButton';
import HouseholdHomeButton from '../household/HouseholdHomeButton';
import HouseholdNotificationButton from '../household/HouseholdNotificationButton';
import { createStateSetter } from '../../utils/stateUtils';

const COLORS = {
  background: '#F5F8F5',
  white: '#FFFFFF',
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  lightGreen: '#E7F4EC',
  border: '#E5EBE7',
};

const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const formatExpenseMoney = (amount: number) =>
  `${Math.round(amount).toLocaleString('vi-VN')}đ`;

const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useSelector(selectUserInfo);
  const healthProfile = user?.healthProfile ?? null;
  const date = getUtcDateKey(new Date());
  const householdDate = getVietnamDateKey(new Date());
  const ownerUserId = user?.id ?? 'guest';
  const mealCatalog = useSelector(selectMealCatalog);
  const mealCatalogLoaded = useSelector(selectMealCatalogLoaded);
  const household = useSelector(selectCurrentHousehold);
  const householdLoaded = useSelector(selectHouseholdLoaded);
  const selectedDestination = useSelector(selectMealPlanDestination);
  const cachedPersonalMealPlan = useSelector((root: GlobalState) =>
    selectMealPlanForDate(root, date),
  );
  const cachedHouseholdMealPlan = useSelector((root: GlobalState) =>
    household
      ? selectHouseholdMealPlan(root, household.id, householdDate)
      : null,
  );
  const cachedMealPlan =
    selectedDestination === 'HOUSEHOLD' && household
      ? cachedHouseholdMealPlan
      : cachedPersonalMealPlan;
  const reportCacheKey = getConsumptionReportCacheKey('WEEK', date);
  const cachedConsumptionReport = useSelector((root: GlobalState) =>
    selectConsumptionReport(root, reportCacheKey),
  );
  const refs = useRef({
    selectedDestination,
    requestId: 0,
    cache: {
      mealCatalog,
      mealCatalogLoaded,
      mealPlan: cachedMealPlan,
      personalMealPlan: cachedPersonalMealPlan,
      consumptionReport: cachedConsumptionReport,
      household,
      householdLoaded,
      householdMealPlan: cachedHouseholdMealPlan,
    },
  });
  const homeScrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  refs.current.selectedDestination = selectedDestination;
  refs.current.cache = {
    mealCatalog,
    mealCatalogLoaded,
    mealPlan: cachedMealPlan,
    personalMealPlan: cachedPersonalMealPlan,
    consumptionReport: cachedConsumptionReport,
    household,
    householdLoaded,
    householdMealPlan: cachedHouseholdMealPlan,
  };
  const [state, setState] = useState<HomeDashboardState>(() => ({
    date,
    loading: true,
    consumptionError: '',
    mealPlanError: '',
    recommendationsError: '',
    selectedMealPeriod: getDefaultMealPeriod(new Date()),
    chatUnreadCount: 0,
    notificationUnreadCount: 0,
    reviewSummaries: {},
  }));
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [expenseSummaryLoading, setExpenseSummaryLoading] = useState(true);
  const [expenseSummaryError, setExpenseSummaryError] = useState('');
  const expenseMonth = getCurrentMonthKey();
  const { chatUnreadCount, notificationUnreadCount, reviewSummaries } = state;
  const setChatUnreadCount = useMemo(
    () => createStateSetter(setState, 'chatUnreadCount'),
    [setState],
  );
  const setNotificationUnreadCount = useMemo(
    () => createStateSetter(setState, 'notificationUnreadCount'),
    [setState],
  );
  const setReviewSummaries = useMemo(
    () => createStateSetter(setState, 'reviewSummaries'),
    [setState],
  );
  const reviewMealIds = mealCatalog.map(meal => meal.id).join(',');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!user?.accessToken || !user.id) {
        setMonthlyExpenses(0);
        setExpenseSummaryError('Đăng nhập để xem tổng chi tháng.');
        setExpenseSummaryLoading(false);
        return () => {
          active = false;
        };
      }

      setExpenseSummaryLoading(true);
      setExpenseSummaryError('');
      fetchExpenses(user, 'PERSONAL', expenseMonth)
        .then(
          (response: {
            success: boolean;
            message?: string;
            data?: ExpenseMonthData;
          }) => {
            if (!active) return;
            if (!response.success || !response.data) {
              throw new Error(
                response.message || 'Không thể tải tổng chi tháng.',
              );
            }
            setMonthlyExpenses(response.data.totalAmountVnd);
          },
        )
        .catch(loadError => {
          if (!active) return;
          setExpenseSummaryError(
            loadError instanceof Error
              ? loadError.message
              : 'Không thể tải tổng chi tháng.',
          );
        })
        .finally(() => {
          if (active) setExpenseSummaryLoading(false);
        });

      return () => {
        active = false;
      };
    }, [expenseMonth, user]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!mealCatalogLoaded || !reviewMealIds) {
        return undefined;
      }
      let active = true;
      fetchMealReviewSummaries(reviewMealIds.split(','))
        .then(summaries => {
          if (active) {
            setReviewSummaries(previous => ({
              ...previous,
              ...Object.fromEntries(
                summaries.map(summary => [summary.mealId, summary]),
              ),
            }));
          }
        })
        .catch(error => {
          console.warn('Failed to load home review summaries', error);
        });
      return () => {
        active = false;
      };
    }, [mealCatalogLoaded, reviewMealIds, setReviewSummaries]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!user?.accessToken || !household?.id) {
        setChatUnreadCount(0);
        return undefined;
      }
      let active = true;
      const refreshUnreadCount = async () => {
        try {
          const count = await fetchHouseholdChatUnreadCount(user.accessToken);
          if (active) {
            setChatUnreadCount(count);
          }
        } catch (error) {
          console.error('Failed to refresh home chat unread count', error);
        }
      };
      refreshUnreadCount();
      const interval = setInterval(() => {
        refreshUnreadCount();
      }, 30_000);
      return () => {
        active = false;
        clearInterval(interval);
      };
    }, [household?.id, setChatUnreadCount, user?.accessToken]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!user?.accessToken || !household?.id) {
        setNotificationUnreadCount(0);
        return undefined;
      }
      let active = true;
      const refreshUnreadCount = async () => {
        try {
          const count = await fetchHouseholdNotificationUnreadCount(
            user.accessToken,
          );
          if (active) {
            setNotificationUnreadCount(count);
          }
        } catch (error) {
          console.error(
            'Failed to refresh home household notification unread count',
            error,
          );
        }
      };
      refreshUnreadCount();
      const interval = setInterval(refreshUnreadCount, 30_000);
      return () => {
        active = false;
        clearInterval(interval);
      };
    }, [household?.id, setNotificationUnreadCount, user?.accessToken]),
  );

  useEffect(() => {
    if (householdLoaded && !household && selectedDestination === 'HOUSEHOLD') {
      dispatch(
        setMealPlanDestination({
          userId: user?.id ?? 'guest',
          destination: 'PERSONAL',
        }),
      );
    }
  }, [dispatch, household, householdLoaded, selectedDestination, user?.id]);

  const loadDashboard = useCallback(
    async (forceReload = false) => {
      const currentRequestId = ++refs.current.requestId;
      const currentDate = getUtcDateKey(new Date());
      const isLoggedIn = Boolean(user?.accessToken);
      const cached = refs.current.cache;
      setSyncUser(user ?? null);

      let activeHousehold = cached.household;
      let householdLookupError = '';
      if (user?.accessToken && !cached.householdLoaded) {
        try {
          const response = await fetchCurrentHousehold(user);
          if (!response?.success || response.data === undefined) {
            householdLookupError =
              response?.message || 'Không thể kiểm tra thực đơn gia đình.';
          } else {
            activeHousehold = response.data;
            dispatch(
              cacheCurrentHousehold({
                userId: ownerUserId,
                household: activeHousehold,
              }),
            );
          }
        } catch (error) {
          householdLookupError = getApiError(
            error,
            'Không thể kết nối để kiểm tra thực đơn gia đình.',
          );
        }
      }
      const cachedPlan =
        refs.current.selectedDestination === 'HOUSEHOLD' && activeHousehold
          ? cached.householdMealPlan
          : cached.personalMealPlan;
      const planDate = activeHousehold
        ? getVietnamDateKey(new Date())
        : currentDate;
      setState(previous => ({
        ...previous,
        date: currentDate,
        loading:
          !cached.mealCatalogLoaded ||
          (isLoggedIn && (!cachedPlan || !cached.consumptionReport)),
        consumptionError: '',
        mealPlanError: '',
        recommendationsError: '',
      }));

      const recommendationRequest = cached.mealCatalogLoaded
        ? Promise.resolve(null)
        : (syncApi(apiConst.getAllMeal, {
            page: 1,
            limit: 100,
          }) as Promise<MealsResponse>);

      const planRequest =
        !isLoggedIn || householdLookupError
          ? Promise.resolve(null)
          : activeHousehold || forceReload || !cached.mealPlan
          ? (syncApi(
              activeHousehold
                ? apiConst.getHouseholdMealPlan
                : apiConst.getMealPlan,
              { date: planDate },
            ) as Promise<MealPlanResponse | HouseholdMealPlanResponse>)
          : Promise.resolve(null);
      const personalPlanRequest =
        isLoggedIn &&
        activeHousehold &&
        !householdLookupError &&
        (forceReload || !cached.personalMealPlan)
          ? (syncApi(apiConst.getMealPlan, {
              date: currentDate,
            }) as Promise<MealPlanResponse>)
          : Promise.resolve(null);

      const [
        recommendationsResult,
        planResult,
        personalPlanResult,
        reportResult,
      ] = await Promise.allSettled([
        recommendationRequest,
        planRequest,
        personalPlanRequest,
        isLoggedIn && !cached.consumptionReport
          ? (syncApi(apiConst.getConsumptionReport, {
              period: 'WEEK',
              date: currentDate,
            }) as Promise<ConsumptionReportResponse>)
          : Promise.resolve(null),
      ]);

      if (currentRequestId !== refs.current.requestId) {
        return;
      }

      let recommendationsError = '';
      if (recommendationsResult.status === 'rejected') {
        recommendationsError = getApiError(
          recommendationsResult.reason,
          'Không thể tải gợi ý món ăn.',
        );
      } else if (recommendationsResult.value) {
        if (
          !recommendationsResult.value.success ||
          !Array.isArray(recommendationsResult.value.data)
        ) {
          recommendationsError =
            recommendationsResult.value.message ||
            'Không thể tải gợi ý món ăn.';
        } else {
          dispatch(
            cacheMealCatalog({
              userId: ownerUserId,
              meals: recommendationsResult.value.data,
            }),
          );
        }
      }

      let mealPlanError = '';
      if (!isLoggedIn) {
        mealPlanError = 'Đăng nhập để xem thực đơn hôm nay.';
      } else if (planResult.status === 'rejected') {
        mealPlanError = getApiError(
          planResult.reason,
          'Không thể tải thực đơn hôm nay.',
        );
      } else if (householdLookupError) {
        mealPlanError = householdLookupError;
      } else if (planResult.value) {
        if (!planResult.value.success || !planResult.value.data) {
          mealPlanError =
            planResult.value.message || 'Không thể tải thực đơn hôm nay.';
        } else if (activeHousehold) {
          const plan = planResult.value.data;
          if (
            !isHouseholdMealPlan(plan) ||
            plan.householdId !== activeHousehold.id
          ) {
            mealPlanError = 'Phản hồi thực đơn gia đình không hợp lệ.';
          } else {
            dispatch(
              cacheHouseholdMealPlan({
                userId: ownerUserId,
                householdId: activeHousehold.id,
                date: plan.date,
                mealPlan: plan,
              }),
            );
          }
        } else {
          if (isHouseholdMealPlan(planResult.value.data)) {
            mealPlanError = 'Phản hồi thực đơn cá nhân không hợp lệ.';
          } else {
            dispatch(
              cacheMealPlan({
                userId: ownerUserId,
                date: planResult.value.data.date,
                mealPlan: planResult.value.data,
              }),
            );
          }
        }
      }

      let personalMealPlanError = '';
      if (personalPlanResult.status === 'rejected') {
        personalMealPlanError = getApiError(
          personalPlanResult.reason,
          'Không thể tải thực đơn cá nhân.',
        );
      } else if (personalPlanResult.value) {
        if (
          !personalPlanResult.value.success ||
          !personalPlanResult.value.data
        ) {
          personalMealPlanError =
            personalPlanResult.value.message ||
            'Không thể tải thực đơn cá nhân.';
        } else if (isHouseholdMealPlan(personalPlanResult.value.data)) {
          personalMealPlanError = 'Phản hồi thực đơn cá nhân không hợp lệ.';
        } else {
          dispatch(
            cacheMealPlan({
              userId: ownerUserId,
              date: personalPlanResult.value.data.date,
              mealPlan: personalPlanResult.value.data,
            }),
          );
        }
      }
      if (activeHousehold && refs.current.selectedDestination === 'PERSONAL') {
        mealPlanError = personalMealPlanError;
      }

      let consumptionError = '';
      if (!isLoggedIn) {
        consumptionError = 'Đăng nhập để xem dinh dưỡng đã tiêu thụ.';
      } else if (reportResult.status === 'rejected') {
        consumptionError = getApiError(
          reportResult.reason,
          'Không thể tải dữ liệu dinh dưỡng.',
        );
      } else if (reportResult.value) {
        if (!reportResult.value.success || !reportResult.value.data) {
          consumptionError =
            reportResult.value.message || 'Không thể tải dữ liệu dinh dưỡng.';
        } else {
          dispatch(
            cacheConsumptionReport({
              userId: ownerUserId,
              key: reportCacheKey,
              report: reportResult.value.data,
            }),
          );
        }
      }

      setState(previous => ({
        ...previous,
        date: currentDate,
        loading: false,
        consumptionError,
        mealPlanError,
        recommendationsError,
      }));
    },
    [dispatch, ownerUserId, reportCacheKey, user],
  );

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
      const interval = setInterval(() => {
        const currentMealPeriod = getDefaultMealPeriod(new Date());
        setState(previous =>
          previous.selectedMealPeriod === currentMealPeriod
            ? previous
            : {
                ...previous,
                selectedMealPeriod: currentMealPeriod,
              },
        );
        loadDashboard();
      }, 15_000);
      return () => {
        clearInterval(interval);
        refs.current.requestId += 1;
      };
    }, [loadDashboard]),
  );

  const consumedDay = useMemo(
    () => cachedConsumptionReport?.days.find(day => day.date === state.date),
    [cachedConsumptionReport, state.date],
  );
  const consumedNutrition = consumedDay?.nutrition ?? null;
  const calorieTarget = healthProfile?.dailyCaloriesTarget;
  const macroTargets = {
    proteinG: healthProfile?.targetProteinG,
    carbsG: healthProfile?.targetCarbsG,
    fatG: healthProfile?.targetFatG,
  };
  const fullName = user?.fullName?.trim() || 'Thành viên HealthAndCook';
  const todayLabel = formatDateLabel(state.date);
  const lunchItems = cachedMealPlan?.meals.LUNCH.items ?? [];
  const dinnerItems = cachedMealPlan?.meals.DINNER.items ?? [];
  const selectedMealItems =
    state.selectedMealPeriod === 'LUNCH' ? lunchItems : dinnerItems;
  const selectedMealLabel =
    state.selectedMealPeriod === 'LUNCH' ? 'Bữa trưa' : 'Bữa tối';
  const suggestedMeals = useMemo(
    () =>
      mealCatalog.filter(meal => meal.category === state.selectedMealPeriod),
    [mealCatalog, state.selectedMealPeriod],
  );
  const openRecipe = useCallback((mealId: string) => {
    navigate(ScreenKeys.RECIPE_DETAIL, { mealId });
  }, []);
  const openAiMealRecommendations = useCallback(() => {
    navigate(ScreenKeys.AI_MEAL_RECOMMENDATIONS);
  }, []);
  const openAiMealChat = useCallback(() => {
    navigate(ScreenKeys.AI_MEAL_CHAT);
  }, []);
  const openAiMealScan = useCallback(() => {
    navigate(ScreenKeys.AI_MEAL_SCAN);
  }, []);

  const onHouseholdChat = useCallback(() => {
    if (!household) return;
    navigate(ScreenKeys.HOUSEHOLD_CHAT, {
      householdId: household.id,
      householdName: household.name,
    });
  }, [household]);
  const openNotifications = useCallback(() => {
    navigate(ScreenKeys.NOTIFICATIONS);
  }, []);
  const openFamily = useCallback(() => {
    navigate(ScreenKeys.FAMILY);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: insets.left + 16,
            paddingRight: insets.right + 16,
          },
        ]}
      >
        <View style={styles.headerCopy}>
          <Text style={styles.greeting}>{welcomeTextTime()}</Text>
          <Text numberOfLines={1} style={styles.userName}>
            {fullName}
          </Text>
          <Text style={styles.date}>{todayLabel}</Text>
        </View>
        {user?.accessToken ? (
          <View style={styles.headerActions}>
            {household ? (
              <HouseholdChatButton
                unreadCount={chatUnreadCount}
                onPress={onHouseholdChat}
              />
            ) : null}
            <HouseholdHomeButton
              hasHousehold={Boolean(household)}
              onPress={openFamily}
            />
            <HouseholdNotificationButton
              unreadCount={notificationUnreadCount}
              onPress={openNotifications}
            />
          </View>
        ) : null}
      </View>
      <ScrollView
        ref={homeScrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <HomeNutritionCard
          loading={state.loading}
          error={state.consumptionError}
          isLoggedIn={Boolean(user?.accessToken)}
          calorieTarget={calorieTarget}
          macroTargets={macroTargets}
          nutrition={consumedNutrition}
          unavailableNutritionItems={
            consumedDay?.unavailableNutritionItems ?? 0
          }
          onRetry={loadDashboard}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mở quản lý chi tiêu"
          onPress={() => navigate(ScreenKeys.EXPENSES)}
          style={({ pressed }) => pressed && styles.expenseSummaryPressed}
        >
          <LinearGradient
            colors={['#FFFFFF', '#F1FAF4']}
            style={styles.expenseSummaryCard}
          >
            <View style={styles.expenseSummaryCopy}>
              <Text style={styles.expenseSummaryLabel}>TỔNG CHI THÁNG NÀY</Text>
              {expenseSummaryLoading ? (
                <ActivityIndicator
                  color={COLORS.green}
                  size="small"
                  style={styles.expenseSummarySpinner}
                />
              ) : (
                <Text
                  style={[
                    styles.expenseSummaryAmount,
                    Boolean(expenseSummaryError) && styles.expenseSummaryError,
                  ]}
                  numberOfLines={1}
                >
                  {expenseSummaryError
                    ? expenseSummaryError
                    : formatExpenseMoney(monthlyExpenses)}
                </Text>
              )}
              <Text style={styles.expenseSummaryHint}>
                Chi tiêu cá nhân · Chạm để xem chi tiết
              </Text>
            </View>
            <View style={styles.expenseSummaryIcon}>
              <Text style={styles.expenseSummaryIconText}>₫</Text>
            </View>
          </LinearGradient>
        </Pressable>

        <AICoachBox
          onMealSuggestions={openAiMealRecommendations}
          onWeeklyPlan={() => navigate(ScreenKeys.WEEKLY_MEAL_PLAN)}
          onProgressAnalysis={() => navigate(ScreenKeys.EATING_PROGRESS)}
          onSmartShopping={() => navigate(ScreenKeys.SMART_SHOPPING)}
          onAiChat={openAiMealChat}
          onMealScan={openAiMealScan}
        />

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Thực đơn hôm nay</Text>
            <Text style={styles.sectionSubtitle}>{selectedMealLabel}</Text>
          </View>
          {state.loading ? (
            <ActivityIndicator color={COLORS.green} size="small" />
          ) : null}
        </View>
        {state.mealPlanError ? (
          <LinearGradient colors={['#FFFFFF', '#F2F8F4']} style={styles.card}>
            <Text style={styles.messageText}>{state.mealPlanError}</Text>
            {user?.accessToken ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => loadDashboard()}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Thử lại</Text>
              </Pressable>
            ) : null}
          </LinearGradient>
        ) : (
          <LinearGradient colors={['#FFFFFF', '#F2F8F4']} style={styles.card}>
            {selectedMealItems.length > 0 ? (
              <HomeMealPeriod
                title={selectedMealLabel}
                items={selectedMealItems}
                onPress={openRecipe}
              />
            ) : (
              <Text style={styles.emptyText}>
                {selectedMealLabel} chưa có món. Chọn một gợi ý bên dưới để xem
                chi tiết và thêm vào thực đơn.
              </Text>
            )}
          </LinearGradient>
        )}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Gợi ý cho {selectedMealLabel.toLocaleLowerCase()}
            </Text>
            <Text style={styles.sectionSubtitle}>
              Chọn món để xem công thức và thêm vào thực đơn
            </Text>
          </View>
          {state.loading ? (
            <ActivityIndicator color={COLORS.green} size="small" />
          ) : null}
        </View>
        {state.recommendationsError ? (
          <LinearGradient colors={['#FFFFFF', '#F2F8F4']} style={styles.card}>
            <Text style={styles.messageText}>{state.recommendationsError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => loadDashboard()}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          </LinearGradient>
        ) : (
          <LinearGradient colors={['#FFFFFF', '#F2F8F4']} style={styles.card}>
            {suggestedMeals.length > 0 ? (
              suggestedMeals.map(meal => (
                <HomeRecipeCard
                  key={meal.id}
                  meal={meal}
                  onPress={openRecipe}
                  reviewSummary={reviewSummaries[meal.id]}
                />
              ))
            ) : !state.loading ? (
              <Text style={styles.emptyText}>
                Chưa có món gợi ý cho bữa này.
              </Text>
            ) : null}
          </LinearGradient>
        )}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    paddingBottom: 17,
  },
  avatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.lightGreen,
  },
  avatarText: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: '800',
  },
  headerCopy: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greeting: {
    color: COLORS.secondary,
    fontSize: 12,
  },
  userName: {
    marginTop: 2,
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '800',
  },
  date: {
    marginTop: 3,
    color: COLORS.secondary,
    fontSize: 10,
  },
  card: {
    padding: 15,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  expenseSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  expenseSummaryCopy: { flex: 1, paddingRight: 12 },
  expenseSummaryLabel: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  expenseSummaryAmount: {
    marginTop: 6,
    color: COLORS.text,
    fontSize: 23,
    fontWeight: '800',
  },
  expenseSummaryError: {
    color: '#A43C36',
    fontSize: 12,
  },
  expenseSummaryHint: {
    marginTop: 4,
    color: COLORS.secondary,
    fontSize: 10,
  },
  expenseSummarySpinner: { alignSelf: 'flex-start', marginTop: 10 },
  expenseSummaryIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.lightGreen,
  },
  expenseSummaryIconText: {
    color: COLORS.green,
    fontSize: 20,
    fontWeight: '800',
  },
  expenseSummaryPressed: { opacity: 0.8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    marginTop: 3,
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  messageText: {
    color: '#A43C36',
    fontSize: 11,
    lineHeight: 16,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 5,
  },
  retryText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '800',
  },
  emptyText: {
    paddingVertical: 8,
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 17,
  },
  completedHint: {
    marginTop: 8,
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '700',
  },
  selectionHint: {
    marginTop: -2,
    marginBottom: 11,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 15,
  },
  bottomSpace: {
    height: 12,
  },
});
