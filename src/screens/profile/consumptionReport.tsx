import React, { memo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type {
  ConsumptionMacroSummaryProps,
  ConsumptionReportCardProps,
  ConsumptionReportPeriodOption,
} from '../../utils/types';
import {
  formatNumberWithOptionalDecimal,
  getConsumptionDayLabel,
} from '../../utils/numberUtils';

const PERIODS: ConsumptionReportPeriodOption[] = [
  { id: 'WEEK', label: 'Tuần' },
  { id: 'MONTH', label: 'Tháng' },
];

const ConsumptionReport = memo(
  ({
    period,
    report,
    loading,
    error,
    isLoggedIn,
    dailyCaloriesTarget,
    onChangePeriod,
    onRetry,
  }: ConsumptionReportCardProps) => {
    const maxCalories = Math.max(
      1,
      ...(report?.days.map(day => day.nutrition.calories) ?? []),
    );
    const hasDailyCaloriesTarget =
      dailyCaloriesTarget != null && dailyCaloriesTarget > 0;
    const chartCaloriesTarget = hasDailyCaloriesTarget
      ? dailyCaloriesTarget
      : maxCalories;
    const today = new Date().toISOString().slice(0, 10);
    const elapsedDays =
      report?.days.filter(day => day.date <= today).length ?? 0;
    const averageCalories =
      report && report.days.length > 0
        ? report.totals.calories / (elapsedDays || report.days.length)
        : 0;

    return (
      <LinearGradient
        colors={['#FFFFFF', '#F3FAF5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Dinh dưỡng đã tiêu thụ</Text>
            <Text style={styles.subtitle}>
              Chỉ tính các món đã xác nhận đã ăn
            </Text>
          </View>
        </View>

        <View style={styles.periodSwitch}>
          {PERIODS.map(option => (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected: period === option.id }}
              onPress={() => onChangePeriod(option.id)}
              style={[
                styles.periodButton,
                period === option.id && styles.periodButtonSelected,
              ]}
            >
              {period === option.id ? (
                <LinearGradient
                  colors={['#FFFFFF', '#EAF6EE']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
              <Text
                style={[
                  styles.periodButtonText,
                  period === option.id && styles.periodButtonTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {!isLoggedIn ? (
          <Text style={styles.message}>
            Đăng nhập để xem báo cáo dinh dưỡng của bạn.
          </Text>
        ) : loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.green} />
          </View>
        ) : error ? (
          <View>
            <Text style={styles.error}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={onRetry}>
              <Text style={styles.retry}>Thử tải lại</Text>
            </Pressable>
          </View>
        ) : report ? (
          <>
            <View style={styles.totalRow}>
              <View>
                <Text style={styles.totalLabel}>Tổng calo</Text>
                <Text style={styles.totalValue}>
                  {formatNumberWithOptionalDecimal(report.totals.calories)} kcal
                </Text>
              </View>
              <View style={styles.average}>
                <Text style={styles.averageLabel}>Trung bình/ngày</Text>
                <Text style={styles.averageValue}>
                  {formatNumberWithOptionalDecimal(averageCalories)} kcal
                </Text>
              </View>
            </View>

            <Text style={styles.range}>
              {report.startDate} – {report.endDate}
            </Text>
            {hasDailyCaloriesTarget ? (
              <Text style={styles.target}>
                Mục tiêu cá nhân:{' '}
                {formatNumberWithOptionalDecimal(dailyCaloriesTarget)} kcal/ngày
              </Text>
            ) : (
              <Text style={styles.target}>
                Chưa có mục tiêu cá nhân; cột được so sánh theo ngày cao nhất
                trong kỳ.
              </Text>
            )}
            <Text style={styles.chartHint}>
              {hasDailyCaloriesTarget
                ? 'Chiều cao cột thể hiện tỷ lệ so với mục tiêu calo mỗi ngày.'
                : 'Cập nhật hồ sơ sức khỏe để so sánh cột với mục tiêu calo cá nhân.'}
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chart}
            >
              {report.days.map((day, index) => {
                const targetRatio =
                  day.nutrition.calories / chartCaloriesTarget;
                const isOverTarget =
                  hasDailyCaloriesTarget &&
                  day.nutrition.calories > dailyCaloriesTarget;
                const barHeight =
                  day.nutrition.calories > 0
                    ? Math.max(4, Math.min(targetRatio, 1) * CHART_HEIGHT)
                    : 2;
                return (
                  <View key={day.date} style={styles.barColumn}>
                    <Text style={styles.barValue}>
                      {day.nutrition.calories > 0
                        ? formatNumberWithOptionalDecimal(
                            day.nutrition.calories,
                          )
                        : ''}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.bar,
                          isOverTarget && styles.barOverTarget,
                          { height: barHeight },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>
                      {getConsumptionDayLabel(day.date, period, index)}
                    </Text>
                    {hasDailyCaloriesTarget ? (
                      <Text
                        style={[
                          styles.barPercentage,
                          isOverTarget && styles.barPercentageOverTarget,
                        ]}
                      >
                        {Math.round(targetRatio * 100)}%
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>

            {report.days.every(day => day.consumedItems === 0) ? (
              <Text style={styles.message}>
                Chưa có món nào được đánh dấu đã ăn trong kỳ này. Ghi nhận món
                đã ăn từ tab Thực phẩm để xem biểu đồ.
              </Text>
            ) : null}

            {report.unavailableNutritionItems > 0 ? (
              <Text style={styles.message}>
                {report.unavailableNutritionItems} món đã ăn chưa có đủ dữ liệu
                dinh dưỡng và không được cộng vào biểu đồ.
              </Text>
            ) : null}

            <View style={styles.macros}>
              <MacroSummary
                label="Đạm"
                value={report.totals.proteinG}
                color={COLORS.protein}
              />
              <MacroSummary
                label="Tinh bột"
                value={report.totals.carbsG}
                color={COLORS.carbs}
              />
              <MacroSummary
                label="Chất béo"
                value={report.totals.fatG}
                color={COLORS.fat}
              />
            </View>
          </>
        ) : null}
      </LinearGradient>
    );
  },
);

const MacroSummary = ({
  label,
  value,
  color,
}: ConsumptionMacroSummaryProps) => (
  <View style={styles.macro}>
    <View style={[styles.macroDot, { backgroundColor: color }]} />
    <Text style={styles.macroLabel}>{label}</Text>
    <Text style={styles.macroValue}>
      {formatNumberWithOptionalDecimal(value)} g
    </Text>
  </View>
);

const COLORS = {
  green: '#168653',
  text: '#172B23',
  secondary: '#66756D',
  border: '#E5EBE7',
  lightGreen: '#E7F4EC',
  protein: '#168653',
  carbs: '#E89B36',
  fat: '#5D8FE8',
  overTarget: '#E89B36',
};
const CHART_HEIGHT = 104;

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 4,
    color: COLORS.secondary,
    fontSize: 12,
  },
  periodSwitch: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#F5F7F5',
  },
  periodButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  periodButtonSelected: {
    shadowColor: '#172B23',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  periodButtonText: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  periodButtonTextSelected: {
    color: COLORS.green,
    fontWeight: '800',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  totalLabel: {
    color: COLORS.secondary,
    fontSize: 12,
  },
  totalValue: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
  },
  average: {
    alignItems: 'flex-end',
  },
  averageLabel: {
    color: COLORS.secondary,
    fontSize: 12,
  },
  averageValue: {
    marginTop: 4,
    color: COLORS.green,
    fontSize: 16,
    fontWeight: '700',
  },
  range: {
    marginTop: 6,
    color: COLORS.secondary,
    fontSize: 12,
  },
  target: {
    marginTop: 4,
    color: COLORS.secondary,
    fontSize: 12,
  },
  chartHint: {
    marginTop: 10,
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  chart: {
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 14,
    paddingBottom: 6,
  },
  barColumn: {
    width: 38,
    alignItems: 'center',
  },
  barValue: {
    height: 15,
    color: COLORS.secondary,
    fontSize: 10,
  },
  barTrack: {
    width: 17,
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#F1F5F2',
  },
  bar: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: COLORS.green,
  },
  barOverTarget: {
    backgroundColor: COLORS.overTarget,
  },
  barLabel: {
    marginTop: 5,
    color: COLORS.secondary,
    fontSize: 10,
  },
  barPercentage: {
    marginTop: 2,
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '700',
  },
  barPercentageOverTarget: {
    color: COLORS.overTarget,
  },
  message: {
    marginTop: 10,
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  error: {
    marginTop: 16,
    color: '#B42318',
    fontSize: 12,
  },
  retry: {
    marginTop: 10,
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '700',
  },
  loading: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macros: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  macro: {
    flex: 1,
    alignItems: 'center',
  },
  macroDot: {
    width: 7,
    height: 7,
    borderRadius: 12,
  },
  macroLabel: {
    marginTop: 5,
    color: COLORS.secondary,
    fontSize: 10,
  },
  macroValue: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default ConsumptionReport;
