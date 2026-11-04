import React, { memo, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
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
import LinearGradient from '../../components/LinearGradient';
import { formatNumberWithOptionalDecimal } from '../../utils/numberUtils';
import type { HealthProfileHistoryCardProps } from '../../utils/types';

type Metric = 'weightKg' | 'bmi';

const CHART_HEIGHT = 170;
const PLOT_TOP = 18;
const PLOT_BOTTOM = 132;
const LEFT_INSET = 48;
const RIGHT_INSET = 14;

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(date));

const HealthMetricHistory = memo(
  ({ history, loading, error, onRetry }: HealthProfileHistoryCardProps) => {
    const { width: screenWidth } = useWindowDimensions();
    const [metric, setMetric] = useState<Metric>('weightKg');
    const chartWidth = Math.max(240, screenWidth - 68);
    const chart = useMemo(() => {
      const values = history.map(point => point[metric]);
      if (values.length === 0) {
        return { points: [], lower: 0, upper: 0 };
      }

      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      const spread = maxValue - minValue;
      const padding =
        spread === 0 ? Math.max(maxValue * 0.04, 1) : spread * 0.2;
      const lower = minValue - padding;
      const upper = maxValue + padding;
      const plotHeight = PLOT_BOTTOM - PLOT_TOP;
      const plotWidth = chartWidth - LEFT_INSET - RIGHT_INSET;

      const points = history.map((point, index) => {
        const x =
          history.length === 1
            ? chartWidth / 2
            : LEFT_INSET + (index / (history.length - 1)) * plotWidth;
        const y =
          PLOT_BOTTOM -
          ((point[metric] - lower) / (upper - lower)) * plotHeight;
        return { x, y, value: point[metric], measuredAt: point.measuredAt };
      });
      return { points, lower, upper };
    }, [chartWidth, history, metric]);
    const points = chart.points;
    const yAxisTicks = [
      chart.upper,
      (chart.upper + chart.lower) / 2,
      chart.lower,
    ];
    const path = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
    const areaPath =
      points.length > 0
        ? `${path} L ${points[points.length - 1].x} ${PLOT_BOTTOM} L ${
            points[0].x
          } ${PLOT_BOTTOM} Z`
        : '';
    const currentPoint = history[history.length - 1];
    const firstPoint = history[0];
    const latestValue = currentPoint?.[metric];
    const difference =
      history.length > 1
        ? currentPoint[metric] - firstPoint[metric]
        : undefined;
    const unit = metric === 'weightKg' ? 'kg' : '';

    return (
      <LinearGradient
        colors={['#FFFFFF', '#F3FAF5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Theo dõi cân nặng & BMI</Text>
            <Text style={styles.subtitle}>
              Ghi nhận qua mỗi lần cập nhật hồ sơ sức khỏe
            </Text>
          </View>
        </View>

        <View style={styles.metricSwitch}>
          {(
            [
              ['weightKg', 'Cân nặng'],
              ['bmi', 'BMI'],
            ] as const
          ).map(([value, label]) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: metric === value }}
              onPress={() => setMetric(value)}
              style={[
                styles.metricButton,
                metric === value && styles.metricButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.metricButtonText,
                  metric === value && styles.metricButtonTextSelected,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={styles.message}>
            <ActivityIndicator color={COLORS.green} />
          </View>
        ) : error ? (
          <View style={styles.message}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={onRetry}>
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : history.length === 0 ? (
          <View style={styles.message}>
            <Text style={styles.emptyText}>
              Chưa có dữ liệu. Cập nhật hồ sơ sức khỏe để bắt đầu theo dõi.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.summary}>
              <View>
                <Text style={styles.summaryLabel}>
                  {metric === 'weightKg' ? 'CÂN NẶNG HIỆN TẠI' : 'BMI HIỆN TẠI'}
                </Text>
                <Text style={styles.summaryValue}>
                  {formatNumberWithOptionalDecimal(latestValue)}
                  {unit ? <Text style={styles.unit}> {unit}</Text> : null}
                </Text>
              </View>
              {difference != null ? (
                <View style={styles.changeBadge}>
                  <Text style={styles.changeText}>
                    {difference > 0 ? '+' : ''}
                    {formatNumberWithOptionalDecimal(difference)}
                    {unit ? ` ${unit}` : ''}
                  </Text>
                  <Text style={styles.changeCaption}>từ lần đầu</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.axisCaption}>
              Trục dọc · {metric === 'weightKg' ? 'kg' : 'BMI'}
            </Text>
            <Svg width={chartWidth} height={CHART_HEIGHT}>
              <Defs>
                <SvgLinearGradient id="metricArea" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#168653" stopOpacity="0.32" />
                  <Stop offset="1" stopColor="#168653" stopOpacity="0.03" />
                </SvgLinearGradient>
              </Defs>
              {[0, 1, 2].map(index => {
                const y = PLOT_TOP + (index * (PLOT_BOTTOM - PLOT_TOP)) / 2;
                return (
                  <React.Fragment key={index}>
                    <Line
                      x1={LEFT_INSET}
                      y1={y}
                      x2={chartWidth - RIGHT_INSET}
                      y2={y}
                      stroke="#E5EBE7"
                      strokeWidth={1}
                      strokeDasharray="4 5"
                    />
                    <SvgText
                      x={LEFT_INSET - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      fill={COLORS.secondary}
                      fontSize={10}
                    >
                      {formatNumberWithOptionalDecimal(yAxisTicks[index])}
                    </SvgText>
                  </React.Fragment>
                );
              })}
              <Path d={areaPath} fill="url(#metricArea)" />
              {points.length > 1 ? (
                <Path
                  d={path}
                  fill="none"
                  stroke={COLORS.green}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
              {points.map((point, index) => (
                <Circle
                  key={`${point.measuredAt}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={4}
                  fill={COLORS.white}
                  stroke={COLORS.green}
                  strokeWidth={2.5}
                />
              ))}
            </Svg>

            <View style={styles.dateLabels}>
              <Text style={styles.dateText}>
                {formatDate(firstPoint.measuredAt)}
              </Text>
              <Text style={styles.recordCount}>
                {history.length} lần cập nhật
              </Text>
              <Text style={styles.dateText}>
                {formatDate(currentPoint.measuredAt)}
              </Text>
            </View>
            <Text style={styles.disclaimer}>
              BMI được tính từ cân nặng và chiều cao tại từng lần cập nhật. Biểu
              đồ chỉ phản ánh dữ liệu đã ghi nhận.
            </Text>
          </>
        )}
      </LinearGradient>
    );
  },
);

export default HealthMetricHistory;

const COLORS = {
  white: '#FFFFFF',
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  lightGreen: '#E7F4EC',
  border: '#E5EBE7',
  danger: '#B42318',
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerCopy: { flex: 1 },
  title: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  subtitle: {
    marginTop: 4,
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 16,
  },
  metricSwitch: {
    flexDirection: 'row',
    padding: 3,
    marginTop: 14,
    borderRadius: 11,
    backgroundColor: '#EFF3F0',
  },
  metricButton: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  metricButtonSelected: { backgroundColor: COLORS.white },
  metricButtonText: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '700',
  },
  metricButtonTextSelected: { color: COLORS.green },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 4,
  },
  axisCaption: {
    marginBottom: 2,
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '600',
  },
  summaryLabel: {
    color: COLORS.secondary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  summaryValue: {
    marginTop: 4,
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
  },
  unit: { fontSize: 14, fontWeight: '700' },
  changeBadge: {
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.lightGreen,
  },
  changeText: { color: COLORS.green, fontSize: 12, fontWeight: '800' },
  changeCaption: { marginTop: 2, color: COLORS.secondary, fontSize: 9 },
  message: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    textAlign: 'center',
  },
  retryText: { color: COLORS.green, fontSize: 12, fontWeight: '800' },
  dateLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  dateText: { color: COLORS.secondary, fontSize: 10 },
  recordCount: { color: COLORS.secondary, fontSize: 10 },
  disclaimer: {
    marginTop: 12,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 15,
  },
});
