import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import ScreenHeader from '../component/ScreenHeader';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { getUtcDateKey } from '../../utils/dateUtils';
import { navigate } from '../../utils/navigation';
import ScreenKeys from '../../utils/screenKey';
import { setSyncUser, syncApi } from '../../utils/syncUtils';
import { formatLocalizedNumber } from '../../utils/numberUtils';
import type {
  ConsumptionReportData,
  ConsumptionReportPeriod,
} from '../../utils/types';

const PERIOD_OPTIONS: Array<{
  id: ConsumptionReportPeriod;
  label: string;
}> = [
  { id: 'WEEK', label: 'Tuần này' },
  { id: 'MONTH', label: 'Tháng này' },
];

const PeriodOptionButton = ({
  option,
  selected,
  onSelect,
}: {
  option: (typeof PERIOD_OPTIONS)[number];
  selected: boolean;
  onSelect: (period: ConsumptionReportPeriod) => void;
}) => {
  const handleSelect = useCallback(() => {
    onSelect(option.id);
  }, [onSelect, option.id]);

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={handleSelect}
      style={[styles.periodButton, selected && styles.periodButtonSelected]}
    >
      <Text
        style={[
          styles.periodButtonText,
          selected && styles.periodButtonTextSelected,
        ]}
      >
        {option.label}
      </Text>
    </Pressable>
  );
};

const formatDate = (date: string, includeYear = false) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'numeric',
    ...(includeYear ? { year: 'numeric' as const } : {}),
    timeZone: 'UTC',
  });

const formatWeekday = (date: string) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

const EatingProgressScreen = () => {
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUserInfo);
  const requestId = useRef(0);
  const [period, setPeriod] = useState<ConsumptionReportPeriod>('WEEK');
  const [report, setReport] = useState<ConsumptionReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const calorieTarget = user?.healthProfile?.dailyCaloriesTarget ?? 0;

  const loadReport = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    if (!user?.accessToken) {
      setLoading(false);
      setError('Đăng nhập để xem tiến độ dinh dưỡng của bạn.');
      return;
    }

    setSyncUser(user);
    setLoading(true);
    setError('');
    try {
      const response = await syncApi(apiConst.getConsumptionReport, {
        period,
        date: getUtcDateKey(new Date()),
      });
      if (currentRequestId !== requestId.current) return;
      if (!response?.success || !response.data) {
        setError(response?.message || 'Không thể tải báo cáo dinh dưỡng.');
        return;
      }
      setReport(response.data);
    } catch (loadError) {
      if (currentRequestId !== requestId.current) return;
      console.error('Failed to load eating progress report', loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Không thể kết nối để tải báo cáo.',
      );
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, [period, user]);

  useFocusEffect(
    useCallback(() => {
      loadReport();
      return () => {
        requestId.current += 1;
      };
    }, [loadReport]),
  );

  const summary = useMemo(() => {
    const daysWithIntake =
      report?.days.filter(day => day.consumedItems > 0) ?? [];
    const daysWithCalories = daysWithIntake.filter(
      day => day.nutrition.calories > 0,
    );
    const average = daysWithCalories.length
      ? daysWithCalories.reduce(
          (total, day) => total + day.nutrition.calories,
          0,
        ) / daysWithCalories.length
      : 0;
    const maxCalories = Math.max(
      1,
      ...(report?.days.map(day => day.nutrition.calories) ?? []),
      calorieTarget,
    );

    return {
      daysWithIntake,
      daysWithCalories,
      average,
      maxCalories,
    };
  }, [calorieTarget, report]);

  const handlePeriodChange = useCallback(
    (nextPeriod: ConsumptionReportPeriod) => {
      if (nextPeriod !== period) {
        setPeriod(nextPeriod);
        setReport(null);
      }
    },
    [period],
  );
  const openConsumedMeals = useCallback(() => {
    navigate(ScreenKeys.DAILY_CONSUMED_MEALS);
  }, []);

  const dateRange =
    report && `${formatDate(report.startDate)} – ${formatDate(report.endDate)}`;
  const macroItems = [
    ['Đạm', 'proteinG', COLORS.protein],
    ['Tinh bột', 'carbsG', COLORS.carbs],
    ['Chất béo', 'fatG', COLORS.fat],
  ] as const;

  function renderPeriodOption(option: (typeof PERIOD_OPTIONS)[number]) {
    return (
      <PeriodOptionButton
        key={option.id}
        option={option}
        selected={period === option.id}
        onSelect={handlePeriodChange}
      />
    );
  }

  function renderDay(day: ConsumptionReportData['days'][number]) {
    const hasIntake = day.consumedItems > 0;
    const hasCalories = day.nutrition.calories > 0;
    const barWidth = hasCalories
      ? Math.max(
          3,
          Math.min((day.nutrition.calories / summary.maxCalories) * 100, 100),
        )
      : 0;

    return (
      <View key={day.date} style={styles.dayRow}>
        <Text style={styles.dayLabel}>
          {period === 'WEEK'
            ? formatWeekday(day.date)
            : formatDate(day.date)}
        </Text>
        <View style={styles.barTrack}>
          {hasCalories ? (
            <View style={[styles.barFill, { width: `${barWidth}%` }]} />
          ) : null}
        </View>
        <Text
          style={[
            styles.dayCalories,
            !hasCalories && styles.dayCaloriesEmpty,
          ]}
        >
          {hasCalories
            ? formatLocalizedNumber(day.nutrition.calories)
            : hasIntake
            ? 'Thiếu số liệu'
            : 'Chưa ghi nhận'}
        </Text>
      </View>
    );
  }

  function renderMacro(
    item: (typeof macroItems)[number],
  ) {
    const [label, key, color] = item;

    return (
      <View key={key} style={styles.macro}>
        <View style={[styles.macroDot, { backgroundColor: color }]} />
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>
          {formatLocalizedNumber(report!.totals[key])} g
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        eyebrow="DINH DƯỠNG CỦA BẠN"
        title="Tiến độ ăn uống"
        subtitle="Hiểu thói quen qua những bữa bạn đã ghi nhận"
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Báo cáo này tổng hợp năng lượng và dưỡng chất từ các món bạn đã xác
          nhận đã ăn. Ghi nhận bữa ăn đều đặn để theo dõi xu hướng sát thực tế
          hơn.
        </Text>

        <View style={styles.periodPicker} accessibilityRole="tablist">
          {PERIOD_OPTIONS.map(renderPeriodOption)}
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.green} />
            <Text style={styles.loadingText}>Đang tổng hợp bữa ăn...</Text>
          </View>
        ) : error ? (
          <LinearGradient colors={['#FFFFFF', '#F3FAF5']} style={styles.card}>
            <Text style={styles.error}>{error}</Text>
            {user?.accessToken ? (
              <Pressable
                accessibilityRole="button"
                onPress={loadReport}
                style={styles.actionButton}
              >
                <Text style={styles.actionButtonText}>Thử tải lại</Text>
              </Pressable>
            ) : null}
          </LinearGradient>
        ) : report ? (
          <>
            <LinearGradient
              colors={['#FFFFFF', '#EAF6EE']}
              style={styles.summaryCard}
            >
              <Text style={styles.periodLabel}>
                {period === 'WEEK' ? 'TỔNG QUAN TUẦN' : 'TỔNG QUAN THÁNG'}
              </Text>
              <Text style={styles.dateRange}>{dateRange}</Text>

              <View style={styles.summaryMain}>
                <View style={styles.summaryMetric}>
                  <Text style={styles.metricLabel}>Tổng năng lượng</Text>
                  <Text style={styles.totalValue}>
                    {formatLocalizedNumber(report.totals.calories)}
                    <Text style={styles.unit}> kcal</Text>
                  </Text>
                </View>
                <View style={styles.summaryMetricRight}>
                  <Text style={styles.metricLabel}>Trung bình mỗi ngày</Text>
                  <Text style={styles.averageValue}>
                    {formatLocalizedNumber(summary.average)}
                    <Text style={styles.averageUnit}> kcal</Text>
                  </Text>
                </View>
              </View>
              <View style={styles.summaryDivider} />
              <Text style={styles.coverage}>
                Đã ghi nhận bữa ăn trong{' '}
                <Text style={styles.coverageStrong}>
                  {summary.daysWithIntake.length}/{report.days.length} ngày
                </Text>
                {summary.daysWithCalories.length
                  ? ` · Trung bình tính trên ${summary.daysWithCalories.length} ngày có dữ liệu calo`
                  : ''}
              </Text>
            </LinearGradient>

            {calorieTarget > 0 ? (
              <LinearGradient
                colors={['#FFFFFF', '#F4F8FF']}
                style={styles.targetCard}
              >
                <View style={styles.targetHeader}>
                  <View style={styles.targetIcon}>
                    <Text style={styles.targetIconText}>◎</Text>
                  </View>
                  <View style={styles.targetCopy}>
                    <Text style={styles.cardTitle}>
                      So với mục tiêu cá nhân
                    </Text>
                    <Text style={styles.targetDescription}>
                      Mục tiêu tham khảo: {formatLocalizedNumber(calorieTarget)}{' '}
                      kcal/ngày
                    </Text>
                  </View>
                </View>
                {summary.average > 0 ? (
                  <>
                    <View style={styles.targetTrack}>
                      <View
                        style={[
                          styles.targetFill,
                          {
                            width: `${Math.min(
                              (summary.average / calorieTarget) * 100,
                              100,
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.targetInsight}>
                      Trung bình đang ở mức{' '}
                      {Math.round((summary.average / calorieTarget) * 100)}% mục
                      tiêu
                      {summary.average < calorieTarget
                        ? ` · thấp hơn ${formatLocalizedNumber(
                            calorieTarget - summary.average,
                          )} kcal/ngày`
                        : summary.average > calorieTarget
                        ? ` · cao hơn ${formatLocalizedNumber(
                            summary.average - calorieTarget,
                          )} kcal/ngày`
                        : ' · bằng mục tiêu'}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.targetInsight}>
                    Chưa đủ dữ liệu calo trong kỳ để so sánh với mục tiêu.
                  </Text>
                )}
                <Text style={styles.targetDisclaimer}>
                  Mục tiêu chỉ để tham khảo thói quen, không phải đánh giá tốt
                  hay xấu về chế độ ăn.
                </Text>
              </LinearGradient>
            ) : (
              <LinearGradient
                colors={['#FFFFFF', '#F4F8FF']}
                style={styles.targetCard}
              >
                <Text style={styles.cardTitle}>Chưa có mục tiêu calo</Text>
                <Text style={styles.targetDisclaimer}>
                  Thiết lập hồ sơ sức khỏe để xem số liệu trung bình bên cạnh
                  mục tiêu riêng của bạn.
                </Text>
              </LinearGradient>
            )}

            <LinearGradient colors={['#FFFFFF', '#F3FAF5']} style={styles.card}>
              <View style={styles.sectionHeading}>
                <View style={styles.sectionHeadingCopy}>
                  <Text style={styles.cardTitle}>Từng ngày trong kỳ</Text>
                  <Text style={styles.sectionHint}>
                    Số liệu bên cạnh thanh là lượng kcal đã ghi nhận.
                  </Text>
                </View>
                <View style={styles.legend}>
                  <View style={styles.legendDot} />
                  <Text style={styles.legendText}>kcal</Text>
                </View>
              </View>
              {report.days.map(renderDay)}
              {calorieTarget > 0 ? (
                <Text style={styles.chartNote}>
                  Thanh so sánh các ngày trong kỳ; mục tiêu cá nhân được xem ở
                  thẻ phía trên.
                </Text>
              ) : null}
            </LinearGradient>

            <LinearGradient colors={['#FFFFFF', '#F3FAF5']} style={styles.card}>
              <Text style={styles.cardTitle}>Dưỡng chất đã ghi nhận</Text>
              <Text style={styles.sectionHint}>
                Tổng lượng trong {period === 'WEEK' ? 'tuần' : 'tháng'}, không
                phải lượng mỗi ngày.
              </Text>
              <View style={styles.macros}>
                {macroItems.map(renderMacro)}
              </View>
            </LinearGradient>

            {report.unavailableNutritionItems > 0 ? (
              <View style={styles.dataNotice}>
                <Text style={styles.noticeIcon}>i</Text>
                <Text style={styles.noticeText}>
                  {report.unavailableNutritionItems} món đã ghi nhận chưa có đủ
                  thông tin dinh dưỡng nên chưa được cộng vào tổng. Số liệu hiện
                  tại có thể thấp hơn thực tế.
                </Text>
              </View>
            ) : null}

            {summary.daysWithIntake.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>
                  Chưa có bữa ăn được ghi nhận
                </Text>
                <Text style={styles.emptyDescription}>
                  Thêm món bạn đã ăn để bắt đầu theo dõi năng lượng và dưỡng
                  chất trong kỳ này.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={openConsumedMeals}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonText}>Ghi nhận bữa ăn</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={openConsumedMeals}
                style={styles.secondaryAction}
              >
                <Text style={styles.secondaryActionText}>
                  Xem hoặc ghi nhận món đã ăn
                </Text>
                <Text style={styles.actionArrow}>›</Text>
              </Pressable>
            )}
          </>
        ) : null}

        <Text style={styles.disclaimer}>
          Báo cáo phản ánh những gì bạn đã ghi nhận, không thay thế tư vấn y tế.
        </Text>
      </ScrollView>
    </View>
  );
};

export default EatingProgressScreen;

const COLORS = {
  background: '#F5F7F5',
  white: '#FFFFFF',
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  lightGreen: '#E7F4EC',
  border: '#E5EBE7',
  danger: '#B42318',
  protein: '#168653',
  carbs: '#E89B36',
  fat: '#5D8FE8',
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: { paddingTop: 4,paddingHorizontal: 16 },
  intro: {
    marginBottom: 14,
    color: COLORS.secondary,
    fontSize: 13,
    lineHeight: 19,
  },
  periodPicker: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#EAF0EC',
  },
  periodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  periodButtonSelected: {
    backgroundColor: COLORS.white,
    shadowColor: COLORS.text,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  periodButtonText: {
    color: COLORS.secondary,
    fontSize: 13,
    fontWeight: '700',
  },
  periodButtonTextSelected: { color: COLORS.green },
  loading: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.secondary,
    fontSize: 13,
  },
  summaryCard: {
    marginBottom: 12,
    padding: 17,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodLabel: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  dateRange: {
    marginTop: 4,
    color: COLORS.secondary,
    fontSize: 12,
  },
  summaryMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 17,
  },
  summaryMetric: { flex: 1 },
  summaryMetricRight: { flex: 1, alignItems: 'flex-end' },
  metricLabel: { color: COLORS.secondary, fontSize: 11 },
  totalValue: {
    marginTop: 4,
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
  },
  unit: { fontSize: 13, fontWeight: '700' },
  averageValue: {
    marginTop: 7,
    color: COLORS.green,
    fontSize: 17,
    fontWeight: '800',
  },
  averageUnit: { fontSize: 11, fontWeight: '700' },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 14,
    backgroundColor: COLORS.border,
  },
  coverage: {
    marginTop: 10,
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 17,
  },
  coverageStrong: { color: COLORS.text, fontWeight: '800' },
  targetCard: {
    marginBottom: 12,
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  targetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  targetIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#EAF1FF',
  },
  targetIconText: { color: '#4779C8', fontSize: 20, fontWeight: '800' },
  targetCopy: { flex: 1 },
  cardTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  targetDescription: {
    marginTop: 3,
    color: COLORS.secondary,
    fontSize: 11,
  },
  targetTrack: {
    height: 8,
    overflow: 'hidden',
    marginTop: 15,
    borderRadius: 8,
    backgroundColor: '#E8EDF5',
  },
  targetFill: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#5D8FE8',
  },
  targetInsight: {
    marginTop: 9,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  targetDisclaimer: {
    marginTop: 8,
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 16,
  },
  card: {
    marginBottom: 12,
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 13,
  },
  sectionHeadingCopy: { flex: 1 },
  sectionHint: {
    marginTop: 4,
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 16,
  },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.green,
  },
  legendText: { color: COLORS.secondary, fontSize: 10 },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 30,
    marginBottom: 5,
  },
  dayLabel: { width: 62, color: COLORS.secondary, fontSize: 11 },
  barTrack: {
    flex: 1,
    height: 8,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#EDF2EE',
  },
  barFill: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: COLORS.green,
  },
  dayCalories: {
    width: 94,
    color: COLORS.text,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'right',
  },
  dayCaloriesEmpty: { color: '#8A9790', fontWeight: '500' },
  chartNote: {
    marginTop: 8,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 15,
  },
  macros: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
  },
  macro: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: COLORS.lightGreen,
  },
  macroDot: { width: 8, height: 8, marginBottom: 6, borderRadius: 4 },
  macroLabel: { color: COLORS.secondary, fontSize: 10 },
  macroValue: {
    marginTop: 4,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
  },
  dataNotice: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFF8E8',
  },
  noticeIcon: {
    width: 18,
    height: 18,
    overflow: 'hidden',
    borderRadius: 9,
    backgroundColor: '#F3D69A',
    color: '#694E16',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 18,
  },
  noticeText: {
    flex: 1,
    color: '#694E16',
    fontSize: 11,
    lineHeight: 16,
  },
  emptyCard: {
    alignItems: 'flex-start',
    marginBottom: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  emptyTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  emptyDescription: {
    marginTop: 6,
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  actionButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.green,
  },
  actionButtonText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#EAF6EE',
  },
  secondaryActionText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
  },
  actionArrow: { color: COLORS.green, fontSize: 22, lineHeight: 24 },
  error: { color: COLORS.danger, fontSize: 13, lineHeight: 19 },
  disclaimer: {
    paddingVertical: 8,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },
});
