import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import LinearGradient from '../../components/LinearGradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { AppImage } from '../../abase/component';
import ScreenHeader from '../component/ScreenHeader';
import HouseholdScopeSwitch from '../component/HouseholdScopeSwitch';
import apiConst from '../../abase/constant/apiConst';
import {
  invalidateCachedHouseholdMealPlan,
  invalidateCachedMealPlan,
  selectCurrentHousehold,
} from '../../reduxs/reduces/appData';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { useAppDispatch } from '../../reduxs/store';
import {
  hasAiRecommendationConsent,
  saveAiRecommendationConsent,
} from '../../utils/aiRecommendationConsent';
import { getUtcDateKey } from '../../utils/dateUtils';
import { formatSkippedMealPeriods } from '../../utils/mealPlanScreenUtils';
import {
  formatEstimatedPrice,
  scaleEstimatedPrice,
  sumEstimatedPrices,
} from '../../utils/priceUtils';
import { setSyncUser, syncApi } from '../../utils/syncUtils';
import type {
  AiMealRecommendation,
  AiMealRecommendationsResponse,
  EstimatedPriceRange,
  MealPeriod,
  WeeklyMealPlanSaveResponse,
} from '../../utils/types';

type PlanDay = {
  date: string;
  recommendations: Record<MealPeriod, AiMealRecommendation[]>;
  consumedPeriods: MealPeriod[];
};

type ScreenState = {
  days: PlanDay[];
  selectedDate: string;
  selectedMeals: Record<string, boolean>;
  mealBudgets: Partial<Record<MealPeriod, number>>;
  loading: boolean;
  saving: boolean;
  error: string;
  message: string;
};

const PERIODS: MealPeriod[] = ['LUNCH', 'DINNER'];
const PRICE_BUDGETS = [
  { label: '20–40 nghìn', minVnd: 20_000, maxVnd: 40_000 },
  { label: '30–60 nghìn', minVnd: 30_000, maxVnd: 60_000 },
  { label: '60–100 nghìn', minVnd: 60_000, maxVnd: 100_000 },
] as const;
const selectionKey = (date: string, period: MealPeriod, mealId: string) =>
  `${date}:${period}:${mealId}`;
const getSelectedMealCount = (
  day: PlanDay,
  selectedMeals: Record<string, boolean>,
) =>
  PERIODS.reduce(
    (count, period) =>
      count +
      day.recommendations[period].filter(
        recommendation =>
          selectedMeals[selectionKey(day.date, period, recommendation.meal.id)],
      ).length,
    0,
  );
const roundServings = (servings: number) =>
  Math.max(0.1, Math.round(servings * 100) / 100);
const formatServings = (servings: number) =>
  Number(servings.toFixed(2)).toLocaleString('vi-VN', {
    maximumFractionDigits: 2,
  });
const addDays = (dateKey: string, amount: number) => {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return getUtcDateKey(date);
};
const formatDate = (dateKey: string) =>
  new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
const formatWeekday = (dateKey: string) =>
  new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString('vi-VN', {
    weekday: 'short',
    timeZone: 'UTC',
  });
const formatDayNumber = (dateKey: string) =>
  new Date(`${dateKey}T00:00:00.000Z`).getUTCDate();
const getSelectedPrice = (
  recommendations: AiMealRecommendation[],
  date: string,
  period: MealPeriod,
  selectedMeals: Record<string, boolean>,
) => {
  const selected = recommendations.filter(
    recommendation =>
      selectedMeals[selectionKey(date, period, recommendation.meal.id)],
  );
  if (!selected.length) return { minVnd: 0, maxVnd: 0 };
  const servingBudget = Math.max(
    ...recommendations.map(
      recommendation => recommendation.recommendedServings,
    ),
  );
  const servingsPerDish = roundServings(servingBudget / selected.length);
  return sumEstimatedPrices(
    selected.map(
      recommendation =>
        scaleEstimatedPrice(
          recommendation.estimatedPricePerServing,
          servingsPerDish,
        ) ?? undefined,
    ),
  );
};
const getSelectedDayPrice = (
  day: PlanDay,
  selectedMeals: Record<string, boolean>,
) =>
  sumEstimatedPrices(
    PERIODS.map(period =>
      getSelectedPrice(
        day.recommendations[period],
        day.date,
        period,
        selectedMeals,
      ),
    ),
  );
const getSelectedPlanPrice = (
  days: PlanDay[],
  selectedMeals: Record<string, boolean>,
) =>
  sumEstimatedPrices(
    days.flatMap(day =>
      PERIODS.map(period =>
        getSelectedPrice(
          day.recommendations[period],
          day.date,
          period,
          selectedMeals,
        ),
      ),
    ),
  );

const WeeklyMealPlanScreen = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useSelector(selectUserInfo);
  const household = useSelector(selectCurrentHousehold);
  const requestId = useRef(0);
  const [planMode, setPlanMode] = useState<'PERSONAL' | 'FAMILY'>('PERSONAL');
  const [budgetOptionsVisible, setBudgetOptionsVisible] = useState(false);
  const [priceBudget, setPriceBudget] = useState<EstimatedPriceRange>({
    minVnd: 30_000,
    maxVnd: 60_000,
  });
  const [state, setState] = useState<ScreenState>({
    days: [],
    selectedDate: '',
    selectedMeals: {},
    mealBudgets: {},
    loading: false,
    saving: false,
    error: '',
    message: '',
  });

  const resetPlan = useCallback(() => {
    setState(previous => ({
      ...previous,
      days: [],
      selectedDate: '',
      selectedMeals: {},
      mealBudgets: {},
      error: '',
      message: '',
    }));
  }, []);
  const changePlanMode = useCallback(
    (mode: 'PERSONAL' | 'FAMILY') => {
      setPlanMode(mode);
      resetPlan();
    },
    [resetPlan],
  );
  const changeSelectedDate = useCallback((date: string) => {
    setState(previous => ({ ...previous, selectedDate: date }));
  }, []);
  const changePriceBudget = useCallback(
    (budget: EstimatedPriceRange) => {
      if (
        priceBudget.minVnd === budget.minVnd &&
        priceBudget.maxVnd === budget.maxVnd
      ) {
        setBudgetOptionsVisible(false);
        return;
      }
      const applyBudget = () => {
        setPriceBudget(budget);
        setBudgetOptionsVisible(false);
        resetPlan();
      };
      if (state.days.length === 0) {
        applyBudget();
        return;
      }
      Alert.alert(
        'Tạo lại kế hoạch?',
        'Đổi khoảng giá sẽ xóa các lựa chọn hiện tại. Bạn có thể tạo lại kế hoạch theo khoảng mới.',
        [
          { text: 'Giữ nguyên', style: 'cancel' },
          { text: 'Đổi khoảng giá', onPress: applyBudget },
        ],
      );
    },
    [priceBudget.maxVnd, priceBudget.minVnd, resetPlan, state.days.length],
  );
  const toggleBudgetOptions = useCallback(() => {
    setBudgetOptionsVisible(visible => !visible);
  }, []);

  const generatePlan = useCallback(async () => {
    if (!user?.accessToken || !user.id) {
      setState(previous => ({
        ...previous,
        error: 'Đăng nhập để tạo kế hoạch cá nhân hóa.',
      }));
      return;
    }
    if (planMode === 'FAMILY' && !household) {
      setState(previous => ({
        ...previous,
        error: 'Tạo hoặc tham gia gia đình để lên thực đơn chung.',
      }));
      return;
    }
    if (planMode === 'PERSONAL' && !user.healthProfile) {
      setState(previous => ({
        ...previous,
        error: 'Hoàn thành hồ sơ sức khỏe để tạo kế hoạch phù hợp.',
      }));
      return;
    }
    const adultConsentRequired =
      planMode === 'PERSONAL' && (user.healthProfile?.age ?? 0) >= 18;
    if (adultConsentRequired && !hasAiRecommendationConsent(user.id)) {
      const userId = user.id;
      function handleConsent() {
        saveAiRecommendationConsent(userId, true);
        generatePlan();
      }

      Alert.alert(
        'Đồng ý dùng gợi ý AI?',
        'Để tạo kế hoạch, HealthAndCook gửi mục tiêu kcal/macro, dinh dưỡng đã ghi nhận theo ngày và thông tin món trong thư viện đến Google Gemini. Không gửi tên, email, mã tài khoản, tuổi, giới tính, chiều cao, cân nặng hoặc BMI. Bạn có thể từ chối và vẫn dùng gợi ý dinh dưỡng xử lý nội bộ.',
        [
          { text: 'Để sau', style: 'cancel' },
          {
            text: 'Đồng ý và tạo',
            onPress: handleConsent,
          },
        ],
      );
      return;
    }

    const currentRequestId = ++requestId.current;
    const startDate = getUtcDateKey(new Date());
    const dates = Array.from({ length: 7 }, (_, index) =>
      addDays(startDate, index),
    );
    setSyncUser(user);
    setState(previous => ({
      ...previous,
      loading: true,
      saving: false,
      error: '',
      message: '',
    }));

    try {
      const requestRecommendations = async (date: string) => {
        const response = (await syncApi(
          planMode === 'FAMILY'
            ? apiConst.getFamilyMealRecommendations
            : apiConst.getAiMealRecommendations,
          planMode === 'FAMILY'
            ? { date, budget: priceBudget }
            : { date, consent: true, budget: priceBudget },
        )) as AiMealRecommendationsResponse;
        if (!response?.success || !response.data) {
          throw new Error(
            response?.message ||
              response?.ErrorMessage ||
              `Không thể tạo gợi ý cho ngày ${date}.`,
          );
        }
        return response.data;
      };
      const [todayRecommendations, fullDayRecommendations] = await Promise.all([
        requestRecommendations(dates[0]),
        requestRecommendations(dates[1]),
      ]);
      if (currentRequestId !== requestId.current) return;

      const days: PlanDay[] = dates.map((date, index) => {
        const source =
          index === 0 ? todayRecommendations : fullDayRecommendations;
        const rotation = index === 0 ? 0 : (index - 1) % 4;
        const rotate = (period: MealPeriod) => {
          const options = source.recommendations[period];
          if (!options.length || rotation === 0) return options;
          const offset = rotation % options.length;
          return [...options.slice(offset), ...options.slice(0, offset)];
        };
        return {
          date,
          recommendations: {
            LUNCH: rotate('LUNCH'),
            DINNER: rotate('DINNER'),
          },
          consumedPeriods: index === 0 ? source.consumedPeriods : [],
        };
      });

      const selectedMeals: Record<string, boolean> = {};
      days.forEach(day => {
        PERIODS.forEach(period => {
          day.recommendations[period].slice(0, 2).forEach(recommendation => {
            selectedMeals[
              selectionKey(day.date, period, recommendation.meal.id)
            ] = true;
          });
        });
      });
      setState(previous => ({
        ...previous,
        days,
        selectedDate: dates[0],
        selectedMeals,
        mealBudgets: todayRecommendations.mealBudgets ?? {},
        loading: false,
        error: '',
        message: '',
      }));
    } catch (error) {
      if (currentRequestId === requestId.current) {
        setState(previous => ({
          ...previous,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : 'Không thể tạo kế hoạch 7 ngày.',
        }));
      }
    }
  }, [household, planMode, priceBudget, user]);

  useFocusEffect(
    useCallback(
      () => () => {
        requestId.current += 1;
      },
      [],
    ),
  );

  const selectedCount = Object.values(state.selectedMeals).filter(
    Boolean,
  ).length;
  const toggleMeal = useCallback(
    (date: string, period: MealPeriod, mealId: string) => {
      const key = selectionKey(date, period, mealId);
      setState(previous => {
        const selectedMeals = { ...previous.selectedMeals };
        if (selectedMeals[key]) {
          delete selectedMeals[key];
        } else {
          selectedMeals[key] = true;
        }
        return { ...previous, selectedMeals };
      });
    },
    [],
  );
  const handleTogglePlanMode = useCallback(() => {
    changePlanMode(planMode === 'PERSONAL' ? 'FAMILY' : 'PERSONAL');
  }, [changePlanMode, planMode]);
  const budgetPressHandlers = useMemo(
    () =>
      new Map(
        PRICE_BUDGETS.map(budget => [
          `${budget.minVnd}:${budget.maxVnd}`,
          () => changePriceBudget(budget),
        ]),
      ),
    [changePriceBudget],
  );
  const datePressHandlers = useMemo(
    () =>
      new Map(
        state.days.map(day => [day.date, () => changeSelectedDate(day.date)]),
      ),
    [changeSelectedDate, state.days],
  );
  const mealPressHandlers = useMemo(
    () =>
      new Map(
        state.days.flatMap(day =>
          PERIODS.flatMap(period =>
            day.recommendations[period].map(recommendation => [
              selectionKey(day.date, period, recommendation.meal.id),
              () => toggleMeal(day.date, period, recommendation.meal.id),
            ]),
          ),
        ),
      ),
    [state.days, toggleMeal],
  );

  const savePlan = useCallback(async () => {
    if (!user?.accessToken || !user.id || state.saving) return;
    if (planMode === 'FAMILY' && !household) return;
    const items = state.days.flatMap(day =>
      PERIODS.flatMap(period => {
        const selectedRecommendations = day.recommendations[period].filter(
          recommendation =>
            state.selectedMeals[
              selectionKey(day.date, period, recommendation.meal.id)
            ],
        );
        if (!selectedRecommendations.length) return [];
        const servingBudget = Math.max(
          ...day.recommendations[period].map(
            recommendation => recommendation.recommendedServings,
          ),
        );
        const servingsPerDish = roundServings(
          servingBudget / selectedRecommendations.length,
        );
        return selectedRecommendations.map(recommendation => ({
          date: day.date,
          mealId: recommendation.meal.id,
          mealPeriod: period,
          servings: servingsPerDish,
        }));
      }),
    );
    if (items.length === 0) {
      Alert.alert('Chưa chọn món', 'Hãy chọn ít nhất một món để lưu.');
      return;
    }
    setSyncUser(user);
    setState(previous => ({
      ...previous,
      saving: true,
      error: '',
      message: '',
    }));
    try {
      const response = (await syncApi(
        planMode === 'FAMILY'
          ? apiConst.saveFamilyWeeklyMealPlan
          : apiConst.saveWeeklyMealPlan,
        {
          items,
        },
      )) as WeeklyMealPlanSaveResponse;
      if (!response?.success || !response.data) {
        setState(previous => ({
          ...previous,
          saving: false,
          error:
            response?.message ||
            response?.ErrorMessage ||
            'Không thể lưu kế hoạch.',
        }));
        return;
      }
      state.days.forEach(day => {
        if (planMode === 'FAMILY' && household) {
          dispatch(
            invalidateCachedHouseholdMealPlan({
              userId: user.id,
              householdId: household.id,
              date: day.date,
            }),
          );
        } else {
          dispatch(
            invalidateCachedMealPlan({ userId: user.id, date: day.date }),
          );
        }
      });
      setState(previous => ({
        ...previous,
        saving: false,
        message: [
          response.message ||
            (planMode === 'FAMILY'
              ? 'Đã gửi các món đã chọn vào thực đơn/bình chọn gia đình.'
              : `Đã lưu ${
                  response.data?.savedCount ?? 0
                } món vào thực đơn 7 ngày.`),
          response.data?.skippedPeriods?.length
            ? `Các bữa được giữ nguyên: ${formatSkippedMealPeriods(
                response.data.skippedPeriods,
              )}.`
            : '',
        ]
          .filter(Boolean)
          .join(' '),
      }));
    } catch (error) {
      setState(previous => ({
        ...previous,
        saving: false,
        error:
          error instanceof Error ? error.message : 'Không thể lưu kế hoạch.',
      }));
    }
  }, [
    dispatch,
    household,
    planMode,
    state.days,
    state.saving,
    state.selectedMeals,
    user,
  ]);

  const selectedDay = state.days.find(day => day.date === state.selectedDate);
  const selectedDayPrice = selectedDay
    ? getSelectedDayPrice(selectedDay, state.selectedMeals)
    : null;
  const selectedPlanPrice = getSelectedPlanPrice(
    state.days,
    state.selectedMeals,
  );
  const selectedBudget = PRICE_BUDGETS.find(
    budget =>
      budget.minVnd === priceBudget.minVnd &&
      budget.maxVnd === priceBudget.maxVnd,
  );
  const renderBudgetOption = useCallback(
    (budget: (typeof PRICE_BUDGETS)[number]) => {
      const selected =
        priceBudget.minVnd === budget.minVnd &&
        priceBudget.maxVnd === budget.maxVnd;
      return (
        <Pressable
          key={budget.minVnd}
          accessibilityRole="button"
          accessibilityLabel={`Ngân sách ${budget.label}`}
          accessibilityState={{ selected }}
          disabled={state.loading || state.saving}
          onPress={budgetPressHandlers.get(`${budget.minVnd}:${budget.maxVnd}`)}
          style={[
            styles.budgetButton,
            selected && styles.budgetButtonSelected,
            (state.loading || state.saving) && styles.disabled,
          ]}
        >
          <Text
            style={[
              styles.budgetButtonText,
              selected && styles.budgetButtonTextSelected,
            ]}
          >
            {budget.label}
          </Text>
          {selected ? <Text style={styles.budgetCheck}>✓</Text> : null}
        </Pressable>
      );
    },
    [
      budgetPressHandlers,
      priceBudget.maxVnd,
      priceBudget.minVnd,
      state.loading,
      state.saving,
    ],
  );
  const renderDateOption = useCallback(
    (day: PlanDay) => {
      const selected = day.date === state.selectedDate;
      const mealCount = getSelectedMealCount(day, state.selectedMeals);
      return (
        <Pressable
          key={day.date}
          disabled={state.loading}
          accessibilityRole="button"
          accessibilityLabel={`${formatDate(
            day.date,
          )}, ${mealCount} món đã chọn`}
          accessibilityState={{ selected }}
          onPress={datePressHandlers.get(day.date)}
          style={[styles.dateButton, selected && styles.dateButtonSelected]}
        >
          <Text
            style={[styles.dateWeekday, selected && styles.dateTextSelected]}
          >
            {formatWeekday(day.date)}
          </Text>
          <Text
            style={[styles.dateNumber, selected && styles.dateTextSelected]}
          >
            {formatDayNumber(day.date)}
          </Text>
          <Text
            style={[styles.dateMealCount, selected && styles.dateTextSelected]}
          >
            {mealCount} món
          </Text>
        </Pressable>
      );
    },
    [datePressHandlers, state.loading, state.selectedDate, state.selectedMeals],
  );
  const renderMealOption = useCallback(
    ({
      period,
      recommendation,
      selected,
      estimatedCalories,
      servings,
      estimatedPrice,
    }: {
      period: MealPeriod;
      recommendation: AiMealRecommendation;
      selected: boolean;
      estimatedCalories: number;
      servings: number;
      estimatedPrice: EstimatedPriceRange | null;
    }) => (
      <Pressable
        key={recommendation.meal.id}
        disabled={state.loading}
        accessibilityRole="checkbox"
        accessibilityLabel={`${
          recommendation.meal.name
        }, khoảng ${estimatedCalories} kcal, ${formatEstimatedPrice(
          estimatedPrice,
        )}`}
        accessibilityState={{ checked: selected }}
        onPress={mealPressHandlers.get(
          selectionKey(state.selectedDate, period, recommendation.meal.id),
        )}
        style={[styles.mealOption, selected && styles.mealOptionSelected]}
      >
        {recommendation.meal.imageUrl ? (
          <AppImage
            source={{ uri: recommendation.meal.imageUrl }}
            style={styles.mealImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.mealImage, styles.imagePlaceholder]}>
            <Text style={styles.placeholderText}>🍽</Text>
          </View>
        )}
        <View style={styles.mealCopy}>
          <Text numberOfLines={2} style={styles.mealName}>
            {recommendation.meal.name}
          </Text>
          <Text style={styles.mealMeta}>
            {formatServings(servings)} khẩu phần · khoảng {estimatedCalories}{' '}
            kcal
          </Text>
          <Text style={styles.mealPrice}>
            {formatEstimatedPrice(estimatedPrice)}
          </Text>
          <Text style={styles.mealReason}>
            {recommendation.recommendationReason}
          </Text>
        </View>
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
      </Pressable>
    ),
    [mealPressHandlers, state.loading, state.selectedDate],
  );
  const renderMealPeriod = useCallback(
    (period: MealPeriod) => {
      if (!selectedDay) return null;
      const recommendations = selectedDay.recommendations[period];
      const selectedRecommendations = recommendations.filter(
        recommendation =>
          state.selectedMeals[
            selectionKey(selectedDay.date, period, recommendation.meal.id)
          ],
      );
      const servingBudget = recommendations.length
        ? Math.max(
            ...recommendations.map(
              recommendation => recommendation.recommendedServings,
            ),
          )
        : 0;
      const servingsPerDish = selectedRecommendations.length
        ? roundServings(servingBudget / selectedRecommendations.length)
        : 0;
      const mealCalories = selectedRecommendations.reduce(
        (total, recommendation) =>
          total +
          (recommendation.meal.nutritionSummary?.perServing.calories ?? 0) *
            servingsPerDish,
        0,
      );
      const mealPrice = getSelectedPrice(
        recommendations,
        selectedDay.date,
        period,
        state.selectedMeals,
      );
      const mealOptions = recommendations.map(recommendation => {
        const selected = Boolean(
          state.selectedMeals[
            selectionKey(selectedDay.date, period, recommendation.meal.id)
          ],
        );
        const estimatedCalories = Math.round(
          (recommendation.meal.nutritionSummary?.perServing.calories ?? 0) *
            (selected ? servingsPerDish : servingBudget),
        );
        const estimatedPrice = scaleEstimatedPrice(
          recommendation.estimatedPricePerServing,
          selected ? servingsPerDish : servingBudget,
        );
        return renderMealOption({
          period,
          recommendation,
          selected,
          estimatedCalories,
          servings: selected ? servingsPerDish : servingBudget,
          estimatedPrice,
        });
      });
      return (
        <View key={period} style={styles.periodSection}>
          <Text style={styles.periodTitle}>
            {period === 'LUNCH' ? 'Bữa trưa' : 'Bữa tối'}
            {selectedDay.consumedPeriods.includes(period)
              ? ' · đã ghi nhận'
              : ''}
          </Text>
          {selectedRecommendations.length ? (
            <Text style={styles.mealSummary}>
              {selectedRecommendations.length} món · khoảng{' '}
              {Math.round(mealCalories)} kcal ·{' '}
              {formatEstimatedPrice(mealPrice)}
            </Text>
          ) : null}
          {mealOptions.length ? (
            mealOptions
          ) : (
            <Text style={styles.emptyText}>
              {selectedDay.consumedPeriods.includes(period)
                ? 'Bữa này đã hoàn thành'
                : 'Chưa có món phù hợp trong thư viện.'}
            </Text>
          )}
        </View>
      );
    },
    [renderMealOption, selectedDay, state.selectedMeals],
  );

  function hasSavedMealBudget(period: MealPeriod) {
    return state.mealBudgets[period] !== undefined;
  }

  function formatSavedMealBudget(period: MealPeriod) {
    return `${period === 'LUNCH' ? 'trưa' : 'tối'} ${Math.round(
      state.mealBudgets[period]!,
    ).toLocaleString('vi-VN')}đ`;
  }

  const savedMealBudgetHint = Object.keys(state.mealBudgets).length
    ? `Ngân sách tổng đã lưu: ${PERIODS.filter(hasSavedMealBudget)
        .map(formatSavedMealBudget)
        .join(' · ')}. Gợi ý được ưu tiên theo giới hạn này.`
    : 'Có thể đặt ngân sách tổng cho từng bữa trong mục Quản lý chi tiêu.';

  return (
    <View style={styles.screen}>
      <ScreenHeader
        eyebrow="HEALTH AI COACH"
        title="Thực đơn 7 ngày"
        rightAction={
          state.days.length ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tạo lại kế hoạch"
              disabled={state.loading || state.saving}
              onPress={generatePlan}
              style={[
                styles.regenerateButton,
                (state.loading || state.saving) && styles.disabled,
              ]}
            >
              {state.loading ? (
                <ActivityIndicator color={COLORS.green} />
              ) : (
                <Svg width={22} height={22} viewBox="0 0 24 24">
                  <Path
                    d="M4 7h16l-3-3m3 3-3 3M20 17H4l3 3m-3-3 3-3"
                    fill="none"
                    stroke={COLORS.green}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                  />
                </Svg>
              )}
            </Pressable>
          ) : null
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <HouseholdScopeSwitch
          enabled={planMode === 'FAMILY'}
          householdAvailable={Boolean(household)}
          personalLabel="Kế hoạch cá nhân"
          householdLabel="Kế hoạch cho gia đình"
          variant="swap"
          swapPersonalLabel="Cá nhân"
          swapHouseholdLabel="Gia đình"
          disabled={state.loading || state.saving}
          onToggle={handleTogglePlanMode}
        />
        <Text style={styles.budgetLabel}>Ngân sách mỗi khẩu phần</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Khoảng giá đã chọn: ${
            selectedBudget?.label ?? '30–60 nghìn'
          } đồng`}
          accessibilityHint={
            budgetOptionsVisible
              ? 'Đóng danh sách khoảng giá'
              : 'Mở danh sách để chọn khoảng giá'
          }
          accessibilityState={{ expanded: budgetOptionsVisible }}
          disabled={state.loading || state.saving}
          onPress={toggleBudgetOptions}
          style={styles.budgetDropdown}
        >
          <Text style={styles.budgetDropdownValue}>
            {selectedBudget?.label ?? '30–60 nghìn'} đồng
          </Text>
          <Text style={styles.budgetDropdownChevron}>
            {budgetOptionsVisible ? '⌃' : '⌄'}
          </Text>
        </Pressable>
        {budgetOptionsVisible ? (
          <View style={styles.budgetOptions}>
            {PRICE_BUDGETS.map(renderBudgetOption)}
          </View>
        ) : null}
        <Text style={styles.savedMealBudgetHint}>
          {savedMealBudgetHint}
        </Text>
        {planMode === 'FAMILY' && !household ? (
          <LinearGradient
            colors={['#FFFFFF', '#F3FAF5']}
            style={styles.noHouseholdCard}
          >
            <Text style={styles.emptyText}>
              Bạn cần tạo hoặc tham gia gia đình trước khi lập thực đơn chung.
            </Text>
          </LinearGradient>
        ) : null}
        {!state.days.length ? (
          <Pressable
            accessibilityRole="button"
            disabled={state.loading}
            onPress={generatePlan}
            style={[styles.primaryButton, state.loading && styles.disabled]}
          >
            {state.loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Tạo kế hoạch 7 ngày</Text>
            )}
          </Pressable>
        ) : null}
        {state.days.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateList}
          >
            {state.days.map(renderDateOption)}
          </ScrollView>
        ) : null}
        {selectedDayPrice ? (
          <Text style={styles.totalPrice}>
            Ngày này: {formatEstimatedPrice(selectedDayPrice)} · Cả tuần đã
            chọn: {formatEstimatedPrice(selectedPlanPrice)}
          </Text>
        ) : null}
        {selectedDay ? (
          <LinearGradient
            colors={['#FFFFFF', '#F3FAF5']}
            style={styles.dayCard}
          >
            <Text style={styles.dayTitle}>{formatDate(selectedDay.date)}</Text>
            {PERIODS.map(renderMealPeriod)}
          </LinearGradient>
        ) : null}
        {state.days.length ? (
          <Pressable
            accessibilityRole="button"
            disabled={state.loading || state.saving || selectedCount === 0}
            onPress={savePlan}
            style={[
              styles.primaryButton,
              (state.loading || state.saving || selectedCount === 0) &&
                styles.disabled,
            ]}
          >
            {state.saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {planMode === 'FAMILY'
                  ? `Gửi ${selectedCount} món cho gia đình`
                  : `Xác nhận và lưu ${selectedCount} món`}
              </Text>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
};

export default WeeklyMealPlanScreen;

const COLORS = {
  background: '#F5F7F5',
  white: '#FFFFFF',
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  lightGreen: '#E7F4EC',
  border: '#E5EBE7',
  danger: '#B42318',
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
  },
  backButton: {
    width: 40,
    height: 42,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },
  backText: {
    color: COLORS.green,
    fontSize: 34,
    lineHeight: 38,
    textAlign: 'center',
  },
  regenerateButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  headerCopy: { flex: 1 },
  eyebrow: {
    color: COLORS.green,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: { marginTop: 2, color: COLORS.text, fontSize: 19, fontWeight: '800' },
  subtitle: {
    marginTop: 3,
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 15,
  },
  content: { paddingTop: 8, paddingHorizontal: 16 },
  budgetLabel: {
    marginBottom: 6,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  budgetOptions: {
    gap: 0,
    paddingHorizontal: 10,
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  budgetButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  budgetButtonSelected: { backgroundColor: COLORS.white },
  budgetButtonText: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: '700',
  },
  budgetButtonTextSelected: { color: COLORS.green },
  budgetCheck: { color: COLORS.green, fontSize: 14, fontWeight: '800' },
  budgetDropdown: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    marginBottom: 8
  },
  budgetDropdownValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  budgetDropdownChevron: {
    color: COLORS.green,
    fontSize: 20,
    fontWeight: '800',
  },
  budgetHint: {
    marginTop: 5,
    marginBottom: 8,
    color: COLORS.secondary,
    fontSize: 9,
    lineHeight: 13,
  },
  savedMealBudgetHint: {
    marginBottom: 10,
    color: COLORS.green,
    fontSize: 10,
    lineHeight: 15,
  },
  modeHint: {
    marginBottom: 10,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 15,
  },
  noHouseholdCard: {
    padding: 13,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  primaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: COLORS.green,
  },
  primaryButtonText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  error: {
    marginBottom: 10,
    color: COLORS.danger,
    fontSize: 12,
    lineHeight: 18,
  },
  message: {
    marginBottom: 10,
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 17,
  },
  dateList: {
    gap: 8,
    paddingBottom: 12,
  },
  totalPrice: {
    marginBottom: 8,
    color: COLORS.green,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '700',
  },
  dateButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  dateButtonSelected: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.green,
  },
  dateWeekday: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateNumber: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  dateMealCount: {
    marginTop: 2,
    color: COLORS.secondary,
    fontSize: 9,
    fontWeight: '700',
  },
  dateTextSelected: { color: COLORS.white },
  dayCard: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  periodSection: { marginTop: 12 },
  periodTitle: {
    marginBottom: 3,
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
  },
  mealSummary: {
    marginBottom: 7,
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '600',
  },
  mealOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 10,
    marginBottom: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  mealOptionSelected: { borderColor: COLORS.green, backgroundColor: '#F1FAF4' },
  mealImage: {
    width: 68,
    height: 68,
    borderRadius: 9,
    backgroundColor: COLORS.lightGreen,
  },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 23 },
  mealCopy: { flex: 1 },
  mealName: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  mealMeta: {
    marginTop: 3,
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '700',
  },
  mealPrice: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '700',
  },
  mealReason: {
    marginTop: 3,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 14,
  },
  checkbox: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
  },
  checkboxSelected: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.green,
  },
  checkmark: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  emptyText: { color: COLORS.secondary, fontSize: 11, lineHeight: 16 },
  disclaimer: {
    paddingVertical: 8,
    color: COLORS.secondary,
    fontSize: 10,
    textAlign: 'center',
  },
});
