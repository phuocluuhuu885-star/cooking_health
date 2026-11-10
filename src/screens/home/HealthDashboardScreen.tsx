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
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import apiConst from '../../abase/constant/apiConst';
import { selectUserInfo } from '../../reduxs/reduces/user';
import ScreenHeader from '../component/ScreenHeader';
import HealthMetricHistory from '../profile/HealthMetricHistory';
import { getUtcDateKey, getVietnamDateKey } from '../../utils/dateUtils';
import { navigate } from '../../utils/navigation';
import ScreenKeys from '../../utils/screenKey';
import { setSyncUser, syncApi } from '../../utils/syncUtils';
import type {
  AddWaterIntakeResponse,
  ConsumptionReportData,
  ConsumptionReportResponse,
  HealthProfileHistoryResponse,
  WalkingSummary,
  WalkingSummaryResponse,
  WaterIntakeResponse,
} from '../../utils/types';
import type { ActivityLevel, BmiCategory, Goal } from '../../type/user';

const WATER_REFERENCE_GOAL_ML = 2000;
const WATER_AMOUNTS_ML = [250, 500];
const DAILY_STEP_TARGETS = {
  SEDENTARY: 5000,
  LIGHT: 6000,
  MODERATE: 7500,
  ACTIVE: 9000,
  VERY_ACTIVE: 10000,
} as const;
const GOAL_LABELS: Record<Goal, string> = {
  LOSE_WEIGHT: 'Giảm cân',
  MAINTAIN: 'Duy trì cân nặng',
  GAIN_MUSCLE: 'Tăng cơ',
};
const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  SEDENTARY: 'Ít vận động',
  LIGHT: 'Vận động nhẹ',
  MODERATE: 'Vận động vừa',
  ACTIVE: 'Năng động',
  VERY_ACTIVE: 'Rất năng động',
};
const BMI_LABELS: Record<BmiCategory, string> = {
  UNDERWEIGHT: 'Thiếu cân',
  NORMAL_WEIGHT: 'Bình thường',
  OVERWEIGHT: 'Thừa cân',
  OBESITY_CLASS_I: 'Béo phì độ I',
  OBESITY_CLASS_II: 'Béo phì độ II',
  OBESITY_CLASS_III: 'Béo phì độ III',
};
// Matches the walking estimator's moderate-pace assumption (100 steps/min, MET 2.8).
const CALORIES_PER_STEP_PER_KG = 0.000315;
const STEP_DISTANCE_PER_HEIGHT_M = 0.415;
const CHART_WIDTH = 360;
const CHART_HEIGHT = 190;
const CHART_PLOT = { left: 38, right: 350, top: 14, bottom: 142 };

type DashboardState = {
  loading: boolean;
  calorieReport: ConsumptionReportData | null;
  walking: WalkingSummary | null;
  water: NonNullable<WaterIntakeResponse['data']> | null;
  healthHistory: NonNullable<HealthProfileHistoryResponse['data']>['history'];
  errors: Partial<Record<'nutrition' | 'walking' | 'water' | 'weight', string>>;
};

const initialState: DashboardState = {
  loading: true,
  calorieReport: null,
  walking: null,
  water: null,
  healthHistory: [],
  errors: {},
};

const formatNumber = (value: number, maximumFractionDigits = 0) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits }).format(value);

const getDateRange = (today: string) => {
  const endDate = new Date(`${today}T00:00:00.000Z`);
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - 6);
  const nextDate = new Date(endDate);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const toDateKey = (date: Date) => date.toISOString().slice(0, 10);
  return {
    from: `${toDateKey(startDate)}T00:00:00.000+07:00`,
    to: `${toDateKey(nextDate)}T00:00:00.000+07:00`,
  };
};

const WaterAmountButton = ({
  amountMl,
  onAdd,
}: {
  amountMl: number;
  onAdd: (amountMl: number) => void;
}) => {
  const handleAdd = useCallback(() => {
    onAdd(amountMl);
  }, [amountMl, onAdd]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ghi nhận ${amountMl} ml nước`}
      onPress={handleAdd}
      style={styles.waterButton}
    >
      <Text style={styles.waterButtonText}>+ {amountMl} ml</Text>
    </Pressable>
  );
};

const getResponseError = (response: {
  message?: string;
  ErrorMessage?: string;
}) => response.message || response.ErrorMessage || 'Không thể tải dữ liệu.';

const MetricCard = ({
  label,
  value,
  unit,
  caption,
}: {
  label: string;
  value: string;
  unit?: string;
  caption: string;
}) => (
  <View style={styles.metricCard}>
    <View style={styles.metricCopy}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricCaption}>{caption}</Text>
    </View>
    <Text style={styles.metricValue}>
      {value}
      {unit ? <Text style={styles.metricUnit}> {unit}</Text> : null}
    </Text>
  </View>
);

const ProgressBar = ({
  progress,
  color = COLORS.green,
}: {
  progress: number;
  color?: string;
}) => (
  <View style={styles.progressTrack}>
    <View
      style={[
        styles.progressFill,
        {
          width: `${Math.min(100, Math.max(progress, 2))}%`,
          backgroundColor: color,
        },
      ]}
    />
  </View>
);

const NutrientProgressRow = ({
  label,
  consumed,
  target,
}: {
  label: string;
  consumed: number;
  target: number;
}) => (
  <View style={styles.nutrientRow}>
    <View style={styles.nutrientRowHeader}>
      <Text style={styles.nutrientLabel}>{label}</Text>
      <Text style={styles.nutrientValue}>
        {formatNumber(consumed, 1)} / {formatNumber(target, 1)} g
      </Text>
    </View>
    <ProgressBar progress={target > 0 ? (consumed / target) * 100 : 0} />
  </View>
);

const SectionCard = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <View style={styles.card}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    {children}
  </View>
);

const WeeklyCaloriesChart = ({
  days,
  dailyTarget,
}: {
  days: ConsumptionReportData['days'];
  dailyTarget?: number;
}) => {
  const maxCalories = Math.max(
    dailyTarget ?? 0,
    ...days.map(day => day.nutrition.calories),
    500,
  );
  const chartMax = Math.ceil((maxCalories * 1.15) / 500) * 500;
  const xForIndex = (index: number) =>
    CHART_PLOT.left +
    (index * (CHART_PLOT.right - CHART_PLOT.left)) /
      Math.max(days.length - 1, 1);
  const yForCalories = (calories: number) =>
    CHART_PLOT.bottom -
    (Math.min(calories, chartMax) / chartMax) *
      (CHART_PLOT.bottom - CHART_PLOT.top);
  const points = days.map((day, index) => ({
    x: xForIndex(index),
    y: yForCalories(day.nutrition.calories),
    date: day.date,
  }));
  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${CHART_PLOT.bottom} L ${
        points[0].x
      } ${CHART_PLOT.bottom} Z`
    : '';
  const targetY =
    dailyTarget && dailyTarget > 0 ? yForCalories(dailyTarget) : null;

  function renderGridLine(ratio: number) {
    const y =
      CHART_PLOT.bottom - ratio * (CHART_PLOT.bottom - CHART_PLOT.top);

    return (
      <React.Fragment key={ratio}>
        <Line
          x1={CHART_PLOT.left}
          y1={y}
          x2={CHART_PLOT.right}
          y2={y}
          stroke={COLORS.border}
          strokeDasharray="3 4"
        />
        <SvgText
          x={CHART_PLOT.left - 6}
          y={y + 3}
          textAnchor="end"
          fontSize="8"
          fill={COLORS.secondary}
        >
          {formatNumber(chartMax * ratio)}
        </SvgText>
      </React.Fragment>
    );
  }

  function renderChartPoint(point: (typeof points)[number]) {
    return (
      <React.Fragment key={point.date}>
        <Circle
          cx={point.x}
          cy={point.y}
          r={3.5}
          fill={COLORS.white}
          stroke={COLORS.green}
          strokeWidth={2}
        />
        <SvgText
          x={point.x}
          y={CHART_PLOT.bottom + 18}
          textAnchor="middle"
          fontSize="8"
          fill={COLORS.secondary}
        >
          {new Date(`${point.date}T00:00:00.000Z`).toLocaleDateString(
            'vi-VN',
            { weekday: 'short', timeZone: 'UTC' },
          )}
        </SvgText>
      </React.Fragment>
    );
  }

  return (
    <View>
      <Svg
        width="100%"
        height={CHART_HEIGHT}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        accessibilityLabel="Biểu đồ calo đã ghi nhận trong tuần"
      >
        <Defs>
          <SvgLinearGradient id="calorieArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={COLORS.green} stopOpacity="0.28" />
            <Stop offset="1" stopColor={COLORS.green} stopOpacity="0.02" />
          </SvgLinearGradient>
        </Defs>
        {[0, 0.5, 1].map(renderGridLine)}
        {targetY !== null ? (
          <Line
            x1={CHART_PLOT.left}
            y1={targetY}
            x2={CHART_PLOT.right}
            y2={targetY}
            stroke="#E59B2F"
            strokeDasharray="5 4"
            strokeWidth={1.5}
          />
        ) : null}
        {areaPath ? <Path d={areaPath} fill="url(#calorieArea)" /> : null}
        {linePath ? (
          <Path
            d={linePath}
            fill="none"
            stroke={COLORS.green}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        {points.map(renderChartPoint)}
      </Svg>
      {dailyTarget ? (
        <View style={styles.chartLegend}>
          <View style={styles.legendItem}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>Calo đã ghi nhận</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, styles.targetLegendLine]} />
            <Text style={styles.legendText}>Mục tiêu cá nhân</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.caption}>
          Cập nhật hồ sơ sức khỏe để hiển thị mốc mục tiêu calo cá nhân.
        </Text>
      )}
    </View>
  );
};

const HealthDashboardScreen = () => {
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUserInfo);
  const requestId = useRef(0);
  const [state, setState] = useState<DashboardState>(initialState);
  const today = getVietnamDateKey();
  const nutritionDate = getUtcDateKey(new Date());
  const todayNutrition = state.calorieReport?.days.find(
    day => day.date === nutritionDate,
  );
  const healthProfile = user?.healthProfile ?? null;

  const loadDashboard = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    if (!user?.accessToken) {
      setState({
        ...initialState,
        loading: false,
        errors: { nutrition: 'Đăng nhập để xem báo cáo sức khỏe cá nhân.' },
      });
      return;
    }

    setSyncUser(user);
    setState(previous => ({ ...previous, loading: true, errors: {} }));
    const range = getDateRange(today);
    const requests = await Promise.allSettled([
      syncApi(apiConst.getConsumptionReport, {
        period: 'WEEK',
        date: nutritionDate,
      }),
      syncApi(apiConst.getWalkingSummary, range),
      syncApi(apiConst.getWaterIntake, { date: today }),
      syncApi(apiConst.getHealthProfileHistory),
    ]);
    if (currentRequestId !== requestId.current) return;

    const next: DashboardState = {
      loading: false,
      calorieReport: null,
      walking: null,
      water: null,
      healthHistory: [],
      errors: {},
    };
    const [nutritionRequest, walkingRequest, waterRequest, weightRequest] =
      requests;

    if (nutritionRequest.status === 'fulfilled') {
      const response = nutritionRequest.value as ConsumptionReportResponse;
      if (response.success && response.data) {
        next.calorieReport = response.data;
      } else {
        next.errors.nutrition = getResponseError(response);
      }
    } else {
      next.errors.nutrition = 'Không thể tải báo cáo dinh dưỡng.';
    }

    if (walkingRequest.status === 'fulfilled') {
      const response = walkingRequest.value as WalkingSummaryResponse;
      if (response.success && response.data) {
        next.walking = response.data;
      } else {
        next.errors.walking = getResponseError(response);
      }
    } else {
      next.errors.walking = 'Không thể tải tổng kết đi bộ.';
    }

    if (waterRequest.status === 'fulfilled') {
      const response = waterRequest.value as WaterIntakeResponse;
      if (response.success && response.data) {
        next.water = response.data;
      } else {
        next.errors.water = getResponseError(response);
      }
    } else {
      next.errors.water = 'Không thể tải dữ liệu nước uống.';
    }

    if (weightRequest.status === 'fulfilled') {
      const response = weightRequest.value as HealthProfileHistoryResponse;
      if (response.success && response.data) {
        next.healthHistory = response.data.history;
      } else {
        next.errors.weight = getResponseError(response);
      }
    } else {
      next.errors.weight = 'Không thể tải lịch sử cân nặng.';
    }
    setState(next);
  }, [nutritionDate, today, user]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
      return () => {
        requestId.current += 1;
      };
    }, [loadDashboard]),
  );

  const addWater = useCallback(
    async (amountMl: number) => {
      if (!user?.accessToken) {
        Alert.alert(
          'Đăng nhập để tiếp tục',
          'Đăng nhập để ghi nhận lượng nước.',
        );
        return;
      }
      setSyncUser(user);
      try {
        const response = (await syncApi(apiConst.addWaterIntake, {
          amountMl,
        })) as AddWaterIntakeResponse;
        if (!response.success || !response.data) {
          throw new Error(response.message || 'Không thể ghi nhận lượng nước.');
        }
        await loadDashboard();
      } catch (error) {
        Alert.alert(
          'Không thể ghi nhận',
          error instanceof Error ? error.message : 'Vui lòng thử lại.',
        );
      }
    },
    [loadDashboard, user],
  );

  const waterProgress = useMemo(
    () => ((state.water?.totalMl ?? 0) / WATER_REFERENCE_GOAL_ML) * 100,
    [state.water?.totalMl],
  );
  const elapsedDays =
    state.calorieReport?.days.filter(day => day.date <= nutritionDate).length ??
    0;
  const averageWeeklyCalories =
    state.calorieReport && elapsedDays > 0
      ? state.calorieReport.totals.calories / elapsedDays
      : 0;
  const dailyStepTarget = healthProfile
    ? DAILY_STEP_TARGETS[healthProfile.activityLevel] +
      (healthProfile.goal === 'LOSE_WEIGHT' ? 1000 : 0)
    : null;
  const stepTargetDistanceKm =
    dailyStepTarget !== null && healthProfile
      ? (dailyStepTarget *
          (healthProfile.heightCm / 100) *
          STEP_DISTANCE_PER_HEIGHT_M) /
        1000
      : null;
  const stepTargetCalories =
    dailyStepTarget !== null && healthProfile
      ? Math.round(
          dailyStepTarget * healthProfile.weightKg * CALORIES_PER_STEP_PER_KG,
        )
      : null;
  const averageDailySteps = state.walking
    ? Math.round(state.walking.steps / 7)
    : null;
  const consumedCalories = todayNutrition?.nutrition.calories ?? 0;
  const calorieTarget = healthProfile?.dailyCaloriesTarget ?? 0;
  const calorieDifference = calorieTarget - consumedCalories;
  const openWalking = useCallback(() => navigate(ScreenKeys.WALKING), []);
  const macroItems = [
    ['Chất đạm', todayNutrition?.nutrition.proteinG ?? 0],
    ['Tinh bột', todayNutrition?.nutrition.carbsG ?? 0],
    ['Chất béo', todayNutrition?.nutrition.fatG ?? 0],
  ];

  function renderMacro(item: (typeof macroItems)[number]) {
    const [label, amount] = item;

    return (
      <View key={String(label)} style={styles.macroBox}>
        <Text style={styles.macroAmount}>{formatNumber(Number(amount), 1)} g</Text>
        <Text style={styles.macroLabel}>{String(label)}</Text>
      </View>
    );
  }

  function renderWaterAmount(amountMl: number) {
    return (
      <WaterAmountButton
        key={amountMl}
        amountMl={amountMl}
        onAdd={addWater}
      />
    );
  }

  function renderWaterDay(day: NonNullable<DashboardState['water']>['dailyTotals'][number]) {
    return (
      <View key={day.date} style={styles.historyRow}>
        <Text style={styles.historyDate}>
          {new Date(`${day.date}T00:00:00.000Z`).toLocaleDateString('vi-VN', {
            weekday: 'short',
            day: 'numeric',
            month: 'numeric',
            timeZone: 'UTC',
          })}
        </Text>
        <Text style={styles.historyAmount}>
          {formatNumber(day.totalMl)} ml
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        eyebrow="SỨC KHỎE CỦA BẠN"
        title="Theo dõi sức khỏe"
        showBackButton={false}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {state.loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.green} />
            <Text style={styles.mutedText}>
              Đang tổng hợp dữ liệu sức khỏe...
            </Text>
          </View>
        ) : null}

        <SectionCard
          title="Dinh dưỡng đã tiêu thụ"
          subtitle={
            state.calorieReport
              ? `Món đã xác nhận · ${state.calorieReport.startDate} – ${state.calorieReport.endDate}`
              : 'Chỉ tính các món đã ghi nhận là đã ăn'
          }
        >
          {state.errors.nutrition ? (
            <Text style={styles.inlineError}>{state.errors.nutrition}</Text>
          ) : state.calorieReport ? (
            <>
              <Text style={styles.subsectionTitle}>Hôm nay</Text>
              <View style={styles.todayCalories}>
                <View style={styles.todayCaloriesHeader}>
                  <View>
                    <Text style={styles.summaryLabel}>ĐÃ TIÊU THỤ</Text>
                    <Text style={styles.calorieValue}>
                      {formatNumber(consumedCalories)} kcal
                    </Text>
                  </View>
                  {healthProfile ? (
                    <View style={styles.calorieGoalSummary}>
                      <Text style={styles.summaryLabel}>MỤC TIÊU</Text>
                      <Text style={styles.calorieGoalValue}>
                        {formatNumber(calorieTarget)} kcal
                      </Text>
                    </View>
                  ) : null}
                </View>
                {healthProfile ? (
                  <>
                    <ProgressBar
                      progress={
                        calorieTarget > 0
                          ? (consumedCalories / calorieTarget) * 100
                          : 0
                      }
                    />
                    <Text style={styles.caption}>
                      {calorieDifference >= 0
                        ? `Còn ${formatNumber(
                            calorieDifference,
                          )} kcal so với mục tiêu`
                        : `Đã vượt ${formatNumber(
                            Math.abs(calorieDifference),
                          )} kcal so với mục tiêu`}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.caption}>
                    Hoàn thiện hồ sơ sức khỏe để xem mục tiêu calo cá nhân.
                  </Text>
                )}
              </View>
              {healthProfile ? (
                <>
                  <Text style={styles.subsectionTitle}>
                    Dưỡng chất hôm nay
                  </Text>
                  <View style={styles.nutrients}>
                    <NutrientProgressRow
                      label="Chất đạm"
                      consumed={todayNutrition?.nutrition.proteinG ?? 0}
                      target={healthProfile.targetProteinG}
                    />
                    <NutrientProgressRow
                      label="Tinh bột"
                      consumed={todayNutrition?.nutrition.carbsG ?? 0}
                      target={healthProfile.targetCarbsG}
                    />
                    <NutrientProgressRow
                      label="Chất béo"
                      consumed={todayNutrition?.nutrition.fatG ?? 0}
                      target={healthProfile.targetFatG}
                    />
                  </View>
                  <Text style={styles.caption}>
                    {todayNutrition?.consumedItems
                      ? `${todayNutrition.consumedItems} món đã ghi nhận`
                      : 'Chưa ghi nhận món đã ăn hôm nay'}
                    {todayNutrition?.unavailableNutritionItems
                      ? ` · ${todayNutrition.unavailableNutritionItems} món chưa có đủ dữ liệu dinh dưỡng`
                      : ''}
                    {' · '}Báo cáo hiện chưa có dữ liệu chất xơ.
                  </Text>
                </>
              ) : todayNutrition?.consumedItems ? (
                <>
                  <Text style={styles.subsectionTitle}>
                    Dưỡng chất đã tiêu thụ hôm nay
                  </Text>
                  <View style={styles.macroGrid}>
                    {macroItems.map(renderMacro)}
                  </View>
                  <Text style={styles.caption}>
                    {todayNutrition.consumedItems} món đã ghi nhận
                    {todayNutrition.unavailableNutritionItems
                      ? ` · ${todayNutrition.unavailableNutritionItems} món chưa có đủ dữ liệu dinh dưỡng`
                      : ''}
                    {' · '}Báo cáo hiện chưa có dữ liệu chất xơ.
                  </Text>
                </>
              ) : (
                <Text style={styles.mutedText}>
                  Chưa ghi nhận món đã ăn hôm nay. Mục tiêu dưỡng chất sẽ hiện
                  khi bạn cập nhật hồ sơ sức khỏe.
                </Text>
              )}
              <Text style={styles.subsectionTitle}>Xu hướng calo 7 ngày</Text>
              <View style={styles.sectionDivider} />
              <View style={styles.weekSummary}>
                <View>
                  <Text style={styles.summaryLabel}>TỔNG TUẦN</Text>
                  <Text style={styles.calorieValue}>
                    {formatNumber(state.calorieReport.totals.calories)} kcal
                  </Text>
                </View>
                <View style={styles.weekAverage}>
                  <Text style={styles.summaryLabel}>TRUNG BÌNH / NGÀY</Text>
                  <Text style={styles.averageValue}>
                    {formatNumber(averageWeeklyCalories)} kcal
                  </Text>
                </View>
              </View>
              <WeeklyCaloriesChart
                days={state.calorieReport.days}
                dailyTarget={calorieTarget || undefined}
              />
              <Text style={styles.caption}>
                Mục tiêu dinh dưỡng là ước tính theo hồ sơ, không phải chỉ định
                y tế.
              </Text>
            </>
          ) : (
            <Text style={styles.mutedText}>
              Chưa có dữ liệu dinh dưỡng trong tuần này.
            </Text>
          )}
        </SectionCard>

        <SectionCard
          title="Hoạt động đi bộ"
          subtitle="7 ngày gần nhất"
        >
          {dailyStepTarget !== null &&
          stepTargetDistanceKm !== null &&
          stepTargetCalories !== null ? (
            <View style={styles.stepGoal}>
              <Text style={styles.stepGoalLabel}>
                MỤC TIÊU THEO HỒ SƠ
              </Text>
              <Text style={styles.stepGoalValue}>
                {formatNumber(dailyStepTarget)} bước/ngày
              </Text>
              <Text style={styles.stepGoalCaption}>
                Ước tính {formatNumber(stepTargetDistanceKm, 1)} km ·{' '}
                {formatNumber(stepTargetCalories)} kcal ở nhịp độ vừa
              </Text>
            </View>
          ) : (
            <Text style={styles.mutedText}>
              Hoàn thiện hồ sơ sức khỏe để tính mục tiêu bước cá nhân.
            </Text>
          )}
          {state.errors.walking ? (
            <Text style={styles.inlineError}>{state.errors.walking}</Text>
          ) : state.walking ? (
            <>
              <View style={styles.walkingGrid}>
                <MetricCard
                  label="SỐ BƯỚC"
                  value={formatNumber(state.walking.steps)}
                  caption={
                    averageDailySteps === null
                      ? 'Chưa có dữ liệu'
                      : `Trung bình ${formatNumber(
                          averageDailySteps,
                        )} bước/ngày`
                  }
                />
                <MetricCard
                  label="THỜI GIAN"
                  value={formatNumber(state.walking.durationSeconds / 3600, 1)}
                  unit="giờ"
                  caption={`${formatNumber(
                    state.walking.workoutCount,
                  )} buổi đi bộ`}
                />
                <MetricCard
                  label="CALO TIÊU HAO"
                  value={
                    state.walking.activeCalories === null
                      ? '—'
                      : formatNumber(state.walking.activeCalories)
                  }
                  unit={
                    state.walking.activeCalories === null ? undefined : 'kcal'
                  }
                  caption="Ước tính từ buổi đi bộ đã kết thúc"
                />
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={openWalking}
                style={styles.textButton}
              >
                <Text style={styles.textButtonLabel}>
                  Xem lịch sử và chi tiết đi bộ ›
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.mutedText}>
              Chưa có buổi đi bộ hoàn tất trong 7 ngày gần nhất.
            </Text>
          )}
        </SectionCard>

        <SectionCard
          title="Nước uống hôm nay"
          subtitle="Lượng nước đã ghi nhận"
        >
          {state.errors.water ? (
            <Text style={styles.inlineError}>{state.errors.water}</Text>
          ) : (
            <>
              <View style={styles.waterHeader}>
                <Text style={styles.waterValue}>
                  {formatNumber(state.water?.totalMl ?? 0)} ml
                </Text>
                <Text style={styles.calorieTarget}>
                  Mốc tham khảo {formatNumber(WATER_REFERENCE_GOAL_ML)} ml
                </Text>
              </View>
              <ProgressBar progress={waterProgress} color="#3197D6" />
              <View style={styles.waterActions}>
                {WATER_AMOUNTS_ML.map(renderWaterAmount)}
              </View>
              <Text style={styles.caption}>
                Mốc 2.000 ml chỉ để tham khảo; nhu cầu thực tế tùy từng người.
              </Text>
              {state.water?.dailyTotals.length ? (
                <View style={styles.waterHistory}>
                  <Text style={styles.historyTitle}>
                    Lượng đã ghi nhận · 7 ngày
                  </Text>
                  {state.water.dailyTotals.map(renderWaterDay)}
                </View>
              ) : null}
            </>
          )}
        </SectionCard>

        {state.errors.weight ? (
          <SectionCard title="Lịch sử cân nặng">
            <Text style={styles.inlineError}>{state.errors.weight}</Text>
          </SectionCard>
        ) : (
          <HealthMetricHistory
            history={state.healthHistory}
            loading={state.loading}
            error=""
            onRetry={loadDashboard}
          />
        )}

        {healthProfile ? (
          <SectionCard
            title="Hồ sơ sức khỏe"
            subtitle="Thông tin cá nhân và mục tiêu"
          >
            {state.healthHistory.length === 0 ? (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cân nặng hiện tại</Text>
                  <Text style={styles.detailValue}>
                    {formatNumber(healthProfile.weightKg, 1)} kg
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>BMI hiện tại</Text>
                  <Text style={styles.detailValue}>
                    {formatNumber(healthProfile.bmi, 1)}
                  </Text>
                </View>
              </>
            ) : null}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Chiều cao</Text>
              <Text style={styles.detailValue}>
                {formatNumber(healthProfile.heightCm, 1)} cm
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                Cân nặng mục tiêu khỏe mạnh
              </Text>
              <Text style={styles.detailValue}>
                {healthProfile.healthyWeightMinKg != null &&
                healthProfile.healthyWeightMaxKg != null
                  ? `${formatNumber(
                      healthProfile.healthyWeightMinKg,
                      1,
                    )}–${formatNumber(healthProfile.healthyWeightMaxKg, 1)} kg`
                  : 'Chưa có dữ liệu'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phân loại BMI</Text>
              <Text style={styles.detailValue}>
                {healthProfile.bmiCategory
                  ? BMI_LABELS[healthProfile.bmiCategory]
                  : 'Chưa có dữ liệu'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tuổi</Text>
              <Text style={styles.detailValue}>{healthProfile.age}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Giới tính</Text>
              <Text style={styles.detailValue}>
                {healthProfile.gender === 'MALE' ? 'Nam' : 'Nữ'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mức độ vận động</Text>
              <Text style={styles.detailValue}>
                {ACTIVITY_LABELS[healthProfile.activityLevel]}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mục tiêu cá nhân</Text>
              <Text style={styles.detailValue}>
                {GOAL_LABELS[healthProfile.goal]}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>BMR · năng lượng cơ bản</Text>
              <Text style={styles.detailValue}>
                {formatNumber(healthProfile.bmr)} kcal/ngày
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>TDEE · nhu cầu ước tính</Text>
              <Text style={styles.detailValue}>
                {formatNumber(healthProfile.tdee)} kcal/ngày
              </Text>
            </View>
            <Text style={styles.caption}>
              BMR, TDEE và khoảng cân nặng là số liệu ước tính, không phải chẩn
              đoán y tế.
            </Text>
          </SectionCard>
        ) : (
          <SectionCard title="Hoàn thiện hồ sơ sức khỏe">
            <Text style={styles.mutedText}>
              Cập nhật chiều cao, cân nặng và mục tiêu để xem BMR, TDEE và mục
              tiêu dinh dưỡng cá nhân.
            </Text>
          </SectionCard>
        )}

        <Text style={styles.footer}>
          Báo cáo dựa trên dữ liệu bạn ghi nhận trong HealthAndCook. Dữ liệu còn
          thiếu không được tự suy đoán
        </Text>
      </ScrollView>
    </View>
  );
};

export default HealthDashboardScreen;

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
  content: { gap: 10, paddingTop: 4, paddingHorizontal: 16 },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  metricCopy: { flex: 1 },
  metricLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  metricValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
  },
  metricUnit: { color: COLORS.secondary, fontSize: 11, fontWeight: '700' },
  metricCaption: {
    marginTop: 2,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 14,
  },
  card: {
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.white,
  },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  sectionSubtitle: {
    marginTop: 3,
    marginBottom: 8,
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 16,
  },
  subsectionTitle: {
    marginTop: 12,
    marginBottom: 8,
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '700',
  },
  todayCalories: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F2F8F4',
  },
  todayCaloriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calorieValue: { color: COLORS.text, fontSize: 22, fontWeight: '800' },
  calorieGoalSummary: { alignItems: 'flex-end' },
  calorieGoalValue: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  weekSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  summaryLabel: { color: COLORS.secondary, fontSize: 10 },
  calorieTarget: { color: COLORS.secondary, fontSize: 10 },
  weekAverage: { alignItems: 'flex-end' },
  averageValue: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: -4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.green,
  },
  legendLine: { width: 16, borderTopWidth: 2 },
  targetLegendLine: { borderColor: '#E59B2F', borderStyle: 'dashed' },
  legendText: { color: COLORS.secondary, fontSize: 9 },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: '#E8EEEA',
  },
  progressFill: { height: '100%', borderRadius: 10 },
  macroGrid: { flexDirection: 'row', gap: 8, marginTop: 10 },
  nutrients: { gap: 11 },
  nutrientRow: { gap: 6 },
  nutrientRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  nutrientLabel: { color: COLORS.text, fontSize: 11, fontWeight: '700' },
  nutrientValue: { color: COLORS.secondary, fontSize: 10, fontWeight: '700' },
  macroBox: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F4F7F5',
  },
  macroAmount: { color: COLORS.text, fontSize: 12, fontWeight: '800' },
  macroLabel: { marginTop: 3, color: COLORS.secondary, fontSize: 10 },
  caption: {
    marginTop: 9,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 15,
  },
  stepGoal: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F2F8F4',
  },
  stepGoalLabel: {
    color: COLORS.green,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  stepGoalValue: {
    marginTop: 5,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  stepGoalCaption: {
    marginTop: 3,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 14,
  },
  walkingGrid: { gap: 0 },
  sectionDivider: {
    height: 1,
    marginTop: 10,
    marginBottom: 2,
    backgroundColor: COLORS.border,
  },
  textButton: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 5 },
  textButtonLabel: { color: COLORS.green, fontSize: 11, fontWeight: '800' },
  waterHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  waterValue: { color: COLORS.text, fontSize: 22, fontWeight: '800' },
  waterActions: { flexDirection: 'row', gap: 8, marginTop: 11 },
  waterButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    borderWidth: 1,
    borderColor: '#CFE5F3',
    borderRadius: 8,
    backgroundColor: '#F2F8FB',
  },
  waterButtonText: { color: '#176A9E', fontSize: 12, fontWeight: '800' },
  waterHistory: {
    marginTop: 13,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  historyTitle: {
    marginBottom: 6,
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '800',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  historyDate: { color: COLORS.secondary, fontSize: 11 },
  historyAmount: { color: COLORS.text, fontSize: 11, fontWeight: '700' },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: { flex: 1, color: COLORS.secondary, fontSize: 11 },
  detailValue: { color: COLORS.text, fontSize: 11, fontWeight: '800' },
  mutedText: { color: COLORS.secondary, fontSize: 11, lineHeight: 16 },
  inlineError: { color: COLORS.danger, fontSize: 11, lineHeight: 16 },
  footer: {
    paddingHorizontal: 4,
    paddingBottom: 8,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },
  refreshButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.white,
  },
  refreshText: { color: COLORS.green, fontSize: 23, lineHeight: 26 },
});
