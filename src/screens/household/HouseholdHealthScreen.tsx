import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import ScreenHeader from '../component/ScreenHeader';
import HealthProfile from '../profile/healthProfile';
import { navigate } from '../../utils/navigation';
import { selectUserInfo } from '../../reduxs/reduces/user';
import apiConst from '../../abase/constant/apiConst';
import { syncApi, setSyncUser } from '../../utils/syncUtils';
import { getVietnamDateKey } from '../../utils/dateUtils';
import ScreenKeys from '../../utils/screenKey';
import type {
  HouseholdHealthOverviewMember,
  HouseholdHealthOverviewResponse,
  HouseholdHealthDaily,
  HouseholdMemberHealthResponse,
} from '../../utils/types';
import type { RootStackParamList } from '../../utils/types/navigation';

const COLORS = {
  background: '#F5F7F5',
  white: '#FFFFFF',
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  border: '#E5EBE7',
  warning: '#9A6700',
};

const CHART_WIDTH = 360;
const CHART_HEIGHT = 190;
const CHART_PLOT = { left: 44, right: 348, top: 16, bottom: 142 };

const GOAL_LABELS = {
  LOSE_WEIGHT: 'Giảm cân',
  MAINTAIN: 'Duy trì',
  GAIN_MUSCLE: 'Tăng cơ',
} as const;

const ACTIVITY_LABELS = {
  SEDENTARY: 'Ít vận động',
  LIGHT: 'Nhẹ',
  MODERATE: 'Vừa',
  ACTIVE: 'Năng động',
  VERY_ACTIVE: 'Rất năng động',
} as const;

type ScreenState = {
  loading: boolean;
  error: string;
  overview: HouseholdHealthOverviewResponse['data'] | null;
  detail: HouseholdMemberHealthResponse['data'] | null;
  editVisible: boolean;
  date: string;
  monthlyReportMonth: string;
  monthlyCalories: MonthlyReportPoint[] | null;
  monthlyReportLoading: boolean;
  monthlyReportError: string;
};

type MonthlyReportPoint = { date: string; value: number };

const shiftDate = (date: string, days: number) => {
  const shifted = new Date(`${date}T00:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
};

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });

const formatNumber = (value: number, digits = 0) =>
  new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);

const getMonthDates = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const today = getVietnamDateKey();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = String(index + 1).padStart(2, '0');
    return `${month}-${day}`;
  }).filter(date => date <= today);
};

const formatMonth = (month: string) =>
  new Date(`${month}-01T00:00:00.000Z`).toLocaleDateString('vi-VN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

const HouseholdHealthMemberCard = ({
  member,
  onSelect,
}: {
  member: HouseholdHealthOverviewMember;
  onSelect: (memberId: string) => void;
}) => {
  const handlePress = useCallback(() => {
    if (member.shared) onSelect(member.userId);
  }, [member.shared, member.userId, onSelect]);
  const profile = member.profile;
  const daily = member.daily;

  return (
    <Pressable
      accessibilityRole={member.shared ? 'button' : undefined}
      accessibilityState={{ disabled: !member.shared }}
      disabled={!member.shared}
      onPress={handlePress}
      style={[styles.memberCard, !member.shared && styles.memberCardLocked]}
    >
      <View style={styles.memberTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {member.name.trim().charAt(0).toLocaleUpperCase()}
          </Text>
        </View>
        <View style={styles.memberCopy}>
          <Text style={styles.memberName}>{member.name}</Text>
          <Text style={styles.memberRole}>
            {member.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}
          </Text>
        </View>
        {member.shared ? (
          <Text style={styles.openArrow}>›</Text>
        ) : null}
      </View>
      {member.shared ? (
        profile ? (
          <View style={styles.memberMetrics}>
            <Metric label="Cân nặng" value={`${formatNumber(profile.weightKg, 1)} kg`} />
            <Metric
              label="Calo hôm nay"
              value={`${formatNumber(daily?.nutrition.calories ?? 0)} / ${formatNumber(profile.dailyCaloriesTarget)} kcal`}
            />
            <Metric label="Nước" value={`${formatNumber(daily?.waterMl ?? 0)} ml`} />
            <Metric label="Bước chân" value={formatNumber(daily?.walking.steps ?? 0)} />
          </View>
        ) : (
          <Text style={styles.helper}>Chưa có hồ sơ sức khỏe.</Text>
        )
      ) : (
        <Text style={styles.lockedText}>
          Thành viên chưa cho phép chia sẻ dữ liệu sức khỏe.
        </Text>
      )}
    </Pressable>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.metric}>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const MonthlyAreaChart = ({
  data,
  month,
  unit,
  color,
  gradientId,
  accessibilityLabel,
  emptyMessage,
  targetValue,
}: {
  data: MonthlyReportPoint[];
  month: string;
  unit: string;
  color: string;
  gradientId: string;
  accessibilityLabel: string;
  emptyMessage: string;
  targetValue?: number;
}) => {
  const daysInMonth = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
  ).getUTCDate();
  const values = data.map(point => point.value);
  const maxValue = Math.max(
    ...values,
    targetValue ?? 0,
    unit === 'kcal' ? 500 : 0,
  );
  const minValue = values.length ? Math.min(...values) : 0;
  const padding = Math.max((maxValue - minValue) * 0.15, maxValue * 0.05, 1);
  const lower = unit === 'kcal' ? 0 : Math.max(0, minValue - padding);
  const upper = maxValue + padding;
  const plotWidth = CHART_PLOT.right - CHART_PLOT.left;
  const plotHeight = CHART_PLOT.bottom - CHART_PLOT.top;
  const xForDay = (day: number) =>
    CHART_PLOT.left + ((day - 1) / Math.max(daysInMonth - 1, 1)) * plotWidth;
  const yForValue = (value: number) =>
    CHART_PLOT.bottom - ((value - lower) / (upper - lower)) * plotHeight;
  const points = data.map(point => ({
    x: xForDay(Number(point.date.slice(8, 10))),
    y: yForValue(point.value),
    value: point.value,
    date: point.date,
  }));
  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${CHART_PLOT.bottom} L ${
        points[0].x
      } ${CHART_PLOT.bottom} Z`
    : '';
  const yAxisTicks = [upper, (upper + lower) / 2, lower];
  const xAxisDays = [...new Set([1, 15, daysInMonth])];
  const targetY =
    targetValue != null && targetValue > 0 ? yForValue(targetValue) : null;

  function renderYAxisTick(index: number) {
    const y = CHART_PLOT.top + (index * plotHeight) / 2;
    return (
      <React.Fragment key={index}>
        <Line
          x1={CHART_PLOT.left}
          y1={y}
          x2={CHART_PLOT.right}
          y2={y}
          stroke={COLORS.border}
          strokeDasharray="3 4"
        />
        <SvgText
          x={CHART_PLOT.left - 7}
          y={y + 3}
          textAnchor="end"
          fontSize={9}
          fill={COLORS.secondary}
        >
          {formatNumber(yAxisTicks[index])}
        </SvgText>
      </React.Fragment>
    );
  }

  function renderXAxisDay(day: number) {
    return (
      <SvgText
        key={day}
        x={xForDay(day)}
        y={CHART_PLOT.bottom + 18}
        textAnchor="middle"
        fontSize={9}
        fill={COLORS.secondary}
      >
        {String(day).padStart(2, '0')}
      </SvgText>
    );
  }

  function renderPoint(point: (typeof points)[number], index: number) {
    return (
      <Circle
        key={`${point.date}-${index}`}
        cx={point.x}
        cy={point.y}
        r={3}
        fill={COLORS.white}
        stroke={color}
        strokeWidth={2}
      />
    );
  }

  return (
    <View>
      {data.length ? (
        <>
          <Text style={styles.chartAxisLabel}>Trục dọc · {unit}</Text>
          <Svg
            width="100%"
            height={CHART_HEIGHT}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            accessibilityLabel={accessibilityLabel}
          >
            <Defs>
              <SvgLinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity="0.3" />
                <Stop offset="1" stopColor={color} stopOpacity="0.03" />
              </SvgLinearGradient>
            </Defs>
            {[0, 1, 2].map(renderYAxisTick)}
            {targetY != null ? (
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
            {areaPath ? (
              <Path d={areaPath} fill={`url(#${gradientId})`} />
            ) : null}
            {points.length > 1 ? (
              <Path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null}
            {points.map(renderPoint)}
            {xAxisDays.map(renderXAxisDay)}
          </Svg>
          {targetY != null ? (
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendText}>Đã ghi nhận</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={styles.targetLegendLine} />
                <Text style={styles.legendText}>Mục tiêu calo</Text>
              </View>
            </View>
          ) : null}
        </>
      ) : (
        <Text style={styles.helper}>{emptyMessage}</Text>
      )}
    </View>
  );
};

const HouseholdHealthScreen = () => {
  const route =
    useRoute<RouteProp<RootStackParamList, typeof ScreenKeys.HOUSEHOLD_HEALTH>>();
  const memberId = route.params?.memberId;
  const user = useSelector(selectUserInfo);
  const insets = useSafeAreaInsets();
  const requestId = useRef(0);
  const monthlyReportRequestId = useRef(0);
  const [state, setState] = useState<ScreenState>({
    loading: true,
    error: '',
    overview: null,
    detail: null,
    editVisible: false,
    date: getVietnamDateKey(),
    monthlyReportMonth: '',
    monthlyCalories: null,
    monthlyReportLoading: false,
    monthlyReportError: '',
  });
  const month = state.date.slice(0, 7);

  const loadData = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    if (!user?.accessToken) {
      setState(previous => ({
        ...previous,
        loading: false,
        error: 'Đăng nhập để xem dữ liệu sức khỏe gia đình.',
      }));
      return;
    }
    setSyncUser(user);
    setState(previous => ({ ...previous, loading: true, error: '' }));
    try {
      if (memberId) {
        const response = (await syncApi(apiConst.getHouseholdMemberHealth, {
          memberId,
          date: state.date,
        })) as HouseholdMemberHealthResponse;
        if (currentRequestId !== requestId.current) return;
        if (!response.success || !response.data) {
          setState(previous => ({
            ...previous,
            loading: false,
            error: response.message || 'Không thể tải dữ liệu thành viên.',
          }));
          return;
        }
        setState(previous => ({
          ...previous,
          loading: false,
          error: '',
          detail: response.data ?? null,
        }));
        return;
      }

      const response = (await syncApi(apiConst.getHouseholdHealthOverview, {
        date: state.date,
      })) as HouseholdHealthOverviewResponse;
      if (currentRequestId !== requestId.current) return;
      if (!response.success || !response.data) {
        setState(previous => ({
          ...previous,
          loading: false,
          error: response.message || 'Không thể tải sức khỏe gia đình.',
        }));
        return;
      }
      setState(previous => ({
        ...previous,
        loading: false,
        error: '',
        overview: response.data ?? null,
      }));
    } catch {
      if (currentRequestId !== requestId.current) return;
      setState(previous => ({
        ...previous,
        loading: false,
        error: 'Không thể kết nối để tải dữ liệu sức khỏe.',
      }));
    }
  }, [memberId, state.date, user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => {
        requestId.current += 1;
      };
    }, [loadData]),
  );

  const loadMonthlyReport = useCallback(async () => {
    const currentRequestId = ++monthlyReportRequestId.current;
    if (!memberId) {
      setState(previous => ({
        ...previous,
        monthlyReportMonth: '',
        monthlyCalories: null,
        monthlyReportLoading: false,
        monthlyReportError: '',
      }));
      return;
    }
    if (!user?.accessToken) {
      setState(previous => ({
        ...previous,
        monthlyReportMonth: month,
        monthlyCalories: null,
        monthlyReportLoading: false,
        monthlyReportError: 'Đăng nhập để xem báo cáo sức khỏe tháng.',
      }));
      return;
    }

    setSyncUser(user);
    setState(previous => ({
      ...previous,
      monthlyReportMonth: month,
      monthlyCalories: null,
      monthlyReportLoading: true,
      monthlyReportError: '',
    }));

    try {
      const dates = getMonthDates(month);
      const points: MonthlyReportPoint[] = [];
      const batchSize = 8;
      for (let index = 0; index < dates.length; index += batchSize) {
        const batch = await Promise.all(
          dates.slice(index, index + batchSize).map(async date => {
            const response = (await syncApi(
              apiConst.getHouseholdMemberHealth,
              { memberId, date },
            )) as HouseholdMemberHealthResponse;
            if (!response.success || !response.data) {
              throw new Error(
                response.message || `Không thể tải dữ liệu calo ngày ${date}.`,
              );
            }
            const calories = response.data.daily?.nutrition?.calories;
            if (typeof calories !== 'number' || !Number.isFinite(calories)) {
              throw new Error(`Dữ liệu calo ngày ${date} không hợp lệ.`);
            }
            return { date, value: calories };
          }),
        );
        if (currentRequestId !== monthlyReportRequestId.current) return;
        points.push(...batch);
      }

      setState(previous => ({
        ...previous,
        monthlyReportMonth: month,
        monthlyCalories: points,
        monthlyReportLoading: false,
        monthlyReportError: '',
      }));
    } catch (loadError) {
      if (currentRequestId !== monthlyReportRequestId.current) return;
      console.error('Failed to load household monthly health report', loadError);
      setState(previous => ({
        ...previous,
        monthlyReportMonth: month,
        monthlyCalories: null,
        monthlyReportLoading: false,
        monthlyReportError:
          loadError instanceof Error
            ? loadError.message
            : 'Không thể kết nối để tải báo cáo tháng.',
      }));
    }
  }, [memberId, month, user]);

  useFocusEffect(
    useCallback(() => {
      if (!memberId) {
        setState(previous => ({
          ...previous,
          monthlyReportMonth: '',
          monthlyCalories: null,
          monthlyReportLoading: false,
          monthlyReportError: '',
        }));
        return undefined;
      }
      loadMonthlyReport();
      return () => {
        monthlyReportRequestId.current += 1;
      };
    }, [loadMonthlyReport, memberId]),
  );

  const handleSelectMember = useCallback((selectedMemberId: string) => {
    navigate(ScreenKeys.HOUSEHOLD_HEALTH, { memberId: selectedMemberId });
  }, []);
  const renderOverviewMember = useCallback(
    (member: HouseholdHealthOverviewMember) => (
      <HouseholdHealthMemberCard
        key={member.userId}
        member={member}
        onSelect={handleSelectMember}
      />
    ),
    [handleSelectMember],
  );

  const handlePreviousDate = useCallback(() => {
    setState(previous => ({ ...previous, date: shiftDate(previous.date, -1) }));
  }, []);

  const handleNextDate = useCallback(() => {
    const today = getVietnamDateKey();
    setState(previous => {
      if (previous.date >= today) return previous;
      const nextDate = shiftDate(previous.date, 1);
      return { ...previous, date: nextDate > today ? today : nextDate };
    });
  }, []);

  const handleOpenEditor = useCallback(() => {
    setState(previous => ({ ...previous, editVisible: true }));
  }, []);
  const handleCloseEditor = useCallback(() => {
    setState(previous => ({ ...previous, editVisible: false }));
  }, []);
  const handleUpdatedMember = useCallback(() => {
    loadData();
  }, [loadData]);
  const canGoForward = state.date < getVietnamDateKey();
  const selectedMember = state.detail?.member;
  const profile = selectedMember?.profile ?? null;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={memberId ? 'Hồ sơ sức khỏe' : 'Theo dõi gia đình'}
        eyebrow={memberId ? undefined : 'SỨC KHỎE GIA ĐÌNH'}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {memberId && selectedMember ? (
          <View style={styles.memberHeading}>
            <View style={styles.memberHeadingCopy}>
              <Text style={styles.memberHeadingLabel}>Thành viên</Text>
              <Text style={styles.memberHeadingName}>{selectedMember.name}</Text>
            </View>
            {state.detail?.member.canUpdate ? (
              <Pressable
                accessibilityRole="button"
                onPress={handleOpenEditor}
                style={styles.updateAction}
              >
                <Text style={styles.updateActionText}>Cập nhật</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        <View style={styles.dateNavigator}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ngày trước"
            onPress={handlePreviousDate}
            style={styles.dateArrow}
          >
            <Text style={styles.dateArrowText}>‹</Text>
          </Pressable>
          <Text style={styles.dateText}>{formatDate(state.date)}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ngày tiếp theo"
            accessibilityState={{ disabled: !canGoForward }}
            disabled={!canGoForward}
            onPress={handleNextDate}
            style={[styles.dateArrow, !canGoForward && styles.disabled]}
          >
            <Text style={[styles.dateArrowText, !canGoForward && styles.disabledText]}>›</Text>
          </Pressable>
        </View>
        {state.loading ? (
          <View style={styles.status}>
            <ActivityIndicator color={COLORS.green} />
            <Text style={styles.helper}>Đang tải dữ liệu sức khỏe...</Text>
          </View>
        ) : state.error ? (
          <View style={styles.statusCard}>
            <Text style={styles.errorText}>{state.error}</Text>
            <Pressable onPress={loadData} style={styles.retryButton}>
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : memberId && selectedMember ? (
          <MemberDetail
            profile={profile}
            daily={state.detail?.daily ?? null}
            weightHistory={state.detail?.weightHistory ?? []}
            month={month}
            monthlyCalories={
              state.monthlyReportMonth === month ? state.monthlyCalories : null
            }
            monthlyReportLoading={
              state.monthlyReportMonth !== month || state.monthlyReportLoading
            }
            monthlyReportError={
              state.monthlyReportMonth === month ? state.monthlyReportError : ''
            }
            onRetryMonthlyReport={loadMonthlyReport}
          />
        ) : state.overview ? (
          <View style={styles.memberList}>
            <Text style={styles.sectionTitle}>Thành viên ({state.overview.members.length})</Text>
            <Text style={styles.helper}>
              Chỉ thành viên đã bật chia sẻ mới hiển thị thông tin sức khỏe.
            </Text>
            {state.overview.members.map(renderOverviewMember)}
          </View>
        ) : null}
      </ScrollView>
      {selectedMember && state.detail?.member.canUpdate ? (
        <HealthProfile
          visible={state.editVisible}
          onClose={handleCloseEditor}
          onUpdated={handleUpdatedMember}
          memberUserId={selectedMember.userId}
          memberName={selectedMember.name}
          initialProfile={profile}
        />
      ) : null}
    </View>
  );
};

const MemberDetail = ({
  profile,
  daily,
  weightHistory,
  month,
  monthlyCalories,
  monthlyReportLoading,
  monthlyReportError,
  onRetryMonthlyReport,
}: {
  profile: NonNullable<HouseholdMemberHealthResponse['data']>['member']['profile'] | null;
  daily: HouseholdHealthDaily | null;
  weightHistory: NonNullable<
    HouseholdMemberHealthResponse['data']
  >['weightHistory'];
  month: string;
  monthlyCalories: MonthlyReportPoint[] | null;
  monthlyReportLoading: boolean;
  monthlyReportError: string;
  onRetryMonthlyReport: () => void;
}) => {
  if (!profile || !daily) {
    return (
      <View style={styles.statusCard}>
        <Text style={styles.helper}>Thành viên chưa có hồ sơ sức khỏe.</Text>
      </View>
    );
  }
  const monthlyWeights = weightHistory
    .filter(entry => entry.measuredAt.slice(0, 7) === month)
    .sort((left, right) => left.measuredAt.localeCompare(right.measuredAt))
    .map(entry => ({
      date: entry.measuredAt.slice(0, 10),
      value: entry.weightKg,
    }));

  return (
    <View style={styles.detailContent}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Chỉ số sức khỏe</Text>
        <View style={styles.metricsGrid}>
          <Metric label="Cân nặng" value={`${formatNumber(profile.weightKg, 1)} kg`} />
          <Metric label="Chiều cao" value={`${formatNumber(profile.heightCm, 1)} cm`} />
          <Metric label="BMI" value={formatNumber(profile.bmi, 1)} />
          <Metric label="Tuổi" value={`${profile.age}`} />
          <Metric label="Mục tiêu" value={GOAL_LABELS[profile.goal]} />
          <Metric label="Vận động" value={ACTIVITY_LABELS[profile.activityLevel]} />
          <Metric label="Nhu cầu calo" value={`${formatNumber(profile.dailyCaloriesTarget)} kcal/ngày`} />
          <Metric label="BMR" value={`${formatNumber(profile.bmr)} kcal/ngày`} />
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Dinh dưỡng trong ngày</Text>
        <View style={styles.metricsGrid}>
          <Metric
            label="Calo"
            value={`${formatNumber(daily.nutrition.calories)} / ${formatNumber(profile.dailyCaloriesTarget)} kcal`}
          />
          <Metric label="Đạm" value={`${formatNumber(daily.nutrition.proteinG, 1)} g`} />
          <Metric label="Tinh bột" value={`${formatNumber(daily.nutrition.carbsG, 1)} g`} />
          <Metric label="Chất béo" value={`${formatNumber(daily.nutrition.fatG, 1)} g`} />
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Nước và đi bộ</Text>
        <View style={styles.metricsGrid}>
          <Metric label="Nước uống" value={`${formatNumber(daily.waterMl)} ml`} />
          <Metric label="Bước chân" value={formatNumber(daily.walking.steps)} />
          <Metric label="Quãng đường" value={`${formatNumber(daily.walking.distanceMeters / 1000, 2)} km`} />
          <Metric label="Calo vận động" value={`${formatNumber(daily.walking.caloriesBurned)} kcal`} />
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Báo cáo cân nặng tháng</Text>
        <Text style={styles.chartSubtitle}>{formatMonth(month)}</Text>
        <MonthlyAreaChart
          data={monthlyWeights}
          month={month}
          unit="kg"
          color={COLORS.green}
          gradientId="monthlyWeightArea"
          accessibilityLabel="Biểu đồ miền cân nặng trong tháng"
          emptyMessage="Chưa có dữ liệu cân nặng trong tháng này."
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Báo cáo calo tháng</Text>
        <Text style={styles.chartSubtitle}>{formatMonth(month)}</Text>
        {monthlyReportLoading ? (
          <View style={styles.chartLoading}>
            <ActivityIndicator color={COLORS.green} />
            <Text style={styles.helper}>Đang tải báo cáo calo tháng...</Text>
          </View>
        ) : monthlyReportError ? (
          <View style={styles.chartLoading}>
            <Text style={styles.errorText}>{monthlyReportError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={onRetryMonthlyReport}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : (
          <MonthlyAreaChart
            data={monthlyCalories ?? []}
            month={month}
            unit="kcal"
            color="#E59B2F"
            gradientId="monthlyCaloriesArea"
            accessibilityLabel="Biểu đồ miền lượng calo trong tháng"
            emptyMessage="Chưa có dữ liệu calo trong tháng này."
            targetValue={profile.dailyCaloriesTarget}
          />
        )}
      </View>
    </View>
  );
};

export default HouseholdHealthScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  memberHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  memberHeadingCopy: { flex: 1, gap: 3 },
  memberHeadingLabel: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  memberHeadingName: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  dateNavigator: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  dateArrow: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  dateArrowText: { color: COLORS.green, fontSize: 30, lineHeight: 36 },
  dateText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  disabledText: { color: COLORS.secondary },
  memberList: { gap: 10 },
  memberCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    gap: 12,
  },
  memberCardLocked: { opacity: 0.8 },
  memberTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: '#E7F4EC',
  },
  avatarText: { color: COLORS.green, fontSize: 16, fontWeight: '800' },
  memberCopy: { flex: 1, gap: 2 },
  memberName: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  memberRole: { color: COLORS.secondary, fontSize: 11 },
  openArrow: { color: COLORS.green, fontSize: 28 },
  memberMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  metric: { flexBasis: '47%', flexGrow: 1, gap: 3 },
  metricValue: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  metricLabel: { color: COLORS.secondary, fontSize: 10 },
  helper: { color: COLORS.secondary, fontSize: 12, lineHeight: 18 },
  lockedText: { color: COLORS.warning, fontSize: 12, lineHeight: 18 },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  detailContent: { gap: 12 },
  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    gap: 14,
  },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  chartSubtitle: { color: COLORS.secondary, fontSize: 11, marginTop: -8 },
  chartAxisLabel: { color: COLORS.secondary, fontSize: 10 },
  chartLoading: { minHeight: 88, justifyContent: 'center', gap: 10 },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingHorizontal: 42,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  targetLegendLine: {
    width: 18,
    borderBottomWidth: 1.5,
    borderBottomColor: '#E59B2F',
    borderStyle: 'dashed',
  },
  legendText: { color: COLORS.secondary, fontSize: 10 },
  status: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 10 },
  statusCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    gap: 12,
  },
  errorText: { color: '#B42318', fontSize: 13, lineHeight: 19 },
  retryButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#E7F4EC',
  },
  retryText: { color: COLORS.green, fontSize: 12, fontWeight: '800' },
  updateAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E7F4EC',
  },
  updateActionText: { color: COLORS.green, fontSize: 11, fontWeight: '800' },
});
