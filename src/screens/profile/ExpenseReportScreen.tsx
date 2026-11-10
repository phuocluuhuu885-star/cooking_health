import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Svg, { Circle, Path } from 'react-native-svg';
import ScreenHeader from '../component/ScreenHeader';
import HouseholdScopeSwitch from '../component/HouseholdScopeSwitch';
import { selectCurrentHousehold } from '../../reduxs/reduces/appData';
import { selectUserInfo } from '../../reduxs/reduces/user';
import type {
  ExpenseCategory,
  ExpenseMonthData,
  ExpenseScope,
  IncomeMonthData,
} from '../../utils/types';
import { fetchExpenses, fetchIncomes } from '../../utils/expenseApi';

const COLORS = {
  background: '#F5F8F5',
  white: '#FFFFFF',
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  lightGreen: '#E7F4EC',
  border: '#E5EBE7',
  danger: '#B42318',
};

const CATEGORIES: Array<{
  id: ExpenseCategory;
  label: string;
  color: string;
}> = [
  { id: 'FOOD', label: 'Ăn uống', color: '#168653' },
  { id: 'SHOPPING', label: 'Mua sắm', color: '#5B8DEF' },
  { id: 'TRANSPORT', label: 'Đi lại', color: '#F2A541' },
  { id: 'HOUSEHOLD', label: 'Gia đình', color: '#A56CC1' },
  { id: 'HEALTH', label: 'Sức khỏe', color: '#E36D75' },
  { id: 'ENTERTAINMENT', label: 'Giải trí', color: '#43A6A1' },
  { id: 'OTHER', label: 'Khác', color: '#8C9A93' },
];

const getMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const formatMoney = (amount: number) =>
  `${Math.round(amount).toLocaleString('vi-VN')}đ`;

const formatCompactMoney = (amount: number) => {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return formatMoney(amount);
};

const getSlicePath = (
  startAngle: number,
  endAngle: number,
  radius: number,
  center: number,
) => {
  const toPoint = (angle: number) => {
    const radians = (angle * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(radians),
      y: center + radius * Math.sin(radians),
    };
  };
  const start = toPoint(startAngle);
  const end = toPoint(endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
};

const ExpenseReportScreen = () => {
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUserInfo);
  const household = useSelector(selectCurrentHousehold);
  const requestId = useRef(0);
  const [scope, setScope] = useState<ExpenseScope>('PERSONAL');
  const [month, setMonth] = useState(getMonthKey(new Date()));
  const [data, setData] = useState<ExpenseMonthData | null>(null);
  const [incomeData, setIncomeData] = useState<IncomeMonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    if (!user?.accessToken || !user.id) {
      setData(null);
      setError('Đăng nhập để xem báo cáo chi tiêu.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [expenseResponse, incomeResponse] =
        scope === 'PERSONAL'
          ? await Promise.all([fetchExpenses(user, scope, month), fetchIncomes(user, month)])
          : [await fetchExpenses(user, scope, month), null];
      if (currentRequestId !== requestId.current) return;
      if (!expenseResponse.success || !expenseResponse.data) {
        throw new Error(expenseResponse.message || 'Không thể tải báo cáo chi tiêu.');
      }
      if (scope === 'PERSONAL' && incomeResponse && (!incomeResponse.success || !incomeResponse.data)) {
        throw new Error(incomeResponse.message || 'Không thể tải báo cáo thu nhập.');
      }
      setData(expenseResponse.data);
      setIncomeData(scope === 'PERSONAL' ? incomeResponse?.data ?? null : null);
    } catch (loadError) {
      if (currentRequestId === requestId.current) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Không thể tải báo cáo chi tiêu.',
        );
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, [month, scope, user]);

  useFocusEffect(
    useCallback(() => {
      loadReport();
      return () => {
        requestId.current += 1;
      };
    }, [loadReport]),
  );

  const categoryTotals = useMemo(() => {
    const totals = new Map<ExpenseCategory, number>();
    for (const item of data?.items ?? []) {
      totals.set(
        item.category,
        (totals.get(item.category) ?? 0) + item.amountVnd,
      );
    }
    return CATEGORIES.map(category => ({
      ...category,
      amount: totals.get(category.id) ?? 0,
    }))
      .filter(category => category.amount > 0)
      .sort((first, second) => second.amount - first.amount);
  }, [data]);

  const totalExpenses = data?.totalAmountVnd ?? 0;
  const totalIncome = incomeData?.totalAmountVnd ?? 0;
  const segments = useMemo(() => {
    let startAngle = -90;
    return categoryTotals.map(category => {
      const sweep = (category.amount / totalExpenses) * 360;
      const segment = {
        ...category,
        startAngle,
        endAngle: startAngle + sweep,
      };
      startAngle += sweep;
      return segment;
    });
  }, [categoryTotals, totalExpenses]);

  const moveMonth = useCallback(
    (offset: number) => {
      const [year, selectedMonth] = month.split('-').map(Number);
      const nextMonth = new Date(year, selectedMonth - 1 + offset, 1);
      setMonth(getMonthKey(nextMonth));
    },
    [month],
  );
  const handleToggleScope = useCallback(() => {
    setScope(scope === 'PERSONAL' ? 'HOUSEHOLD' : 'PERSONAL');
  }, [scope]);
  const handlePreviousMonth = useCallback(() => {
    moveMonth(-1);
  }, [moveMonth]);
  const handleNextMonth = useCallback(() => {
    moveMonth(1);
  }, [moveMonth]);
  const renderSegment = (segment: (typeof segments)[number]) => (
    <Path
      key={segment.id}
      d={getSlicePath(segment.startAngle, segment.endAngle, 88, 95)}
      fill={segment.color}
      stroke={COLORS.white}
      strokeWidth={2}
    />
  );
  const renderCategoryLegend = (category: (typeof categoryTotals)[number]) => {
    const percentage =
      totalExpenses > 0 ? (category.amount / totalExpenses) * 100 : 0;
    return (
      <View key={category.id} style={styles.legendRow}>
        <View style={styles.legendLabel}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: category.color },
            ]}
          />
          <Text style={styles.legendText}>{category.label}</Text>
        </View>
        <Text style={styles.legendAmount}>{formatMoney(category.amount)}</Text>
        <Text style={styles.legendPercent}>
          {percentage.toFixed(1).replace(/\.0$/, '')}%
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader eyebrow="CHI TIÊU" title="Báo cáo thu chi" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <HouseholdScopeSwitch
          enabled={scope === 'HOUSEHOLD'}
          householdAvailable={Boolean(household)}
          personalLabel="Báo cáo cá nhân"
          householdLabel={`Báo cáo hộ ${household?.name ?? ''}`}
          description="Chuyển đổi phạm vi báo cáo thu chi."
          onToggle={handleToggleScope}
        />

        <View style={styles.monthCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tháng trước"
            onPress={handlePreviousMonth}
            style={styles.monthArrow}
          >
            <Text style={styles.monthArrowText}>‹</Text>
          </Pressable>
          <Text style={styles.monthTitle}>{month}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tháng sau"
            onPress={handleNextMonth}
            style={styles.monthArrow}
          >
            <Text style={styles.monthArrowText}>›</Text>
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={loadReport}>
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={COLORS.green} />
          </View>
        ) : (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Tổng chi</Text>
                <Text style={styles.expenseTotal}>
                  {formatMoney(totalExpenses)}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Tổng thu</Text>
                <Text style={styles.incomeTotal}>
                  {scope === 'PERSONAL'
                    ? totalIncome > 0
                      ? formatMoney(totalIncome)
                      : 'Chưa có dữ liệu'
                    : 'Chỉ riêng cá nhân'}
                </Text>
              </View>
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Chi tiêu theo danh mục</Text>
              {categoryTotals.length ? (
                <>
                  <View
                    accessibilityLabel={`Biểu đồ tròn phân bổ khoản chi, tổng cộng ${formatMoney(
                      totalExpenses,
                    )}`}
                    style={styles.chart}
                  >
                    <Svg width={190} height={190} viewBox="0 0 190 190">
                      {segments.length === 1 ? (
                        <Circle
                          cx={95}
                          cy={95}
                          r={88}
                          fill={segments[0].color}
                        />
                      ) : (
                        segments.map(renderSegment)
                      )}
                      <Circle cx={95} cy={95} r={53} fill={COLORS.white} />
                    </Svg>
                    <View pointerEvents="none" style={styles.chartCenter}>
                      <Text style={styles.chartCenterLabel}>Tổng chi</Text>
                      <Text style={styles.chartCenterAmount}>
                        {formatCompactMoney(totalExpenses)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.legend}>
                    {categoryTotals.map(renderCategoryLegend)}
                  </View>
                </>
              ) : (
                <Text style={styles.emptyText}>
                  Chưa có khoản chi trong tháng này để lập biểu đồ.
                </Text>
              )}
            </View>
            <Text style={styles.disclaimer}>
              Báo cáo thu nhập chưa khả dụng vì ứng dụng chưa có dữ liệu khoản
              thu. Biểu đồ hiện phân bổ các khoản chi theo danh mục.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default ExpenseReportScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },
  monthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  monthArrow: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: COLORS.lightGreen,
  },
  monthArrowText: { color: COLORS.green, fontSize: 24, lineHeight: 28 },
  monthTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1,
    minHeight: 92,
    justifyContent: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryLabel: { color: COLORS.secondary, fontSize: 11, fontWeight: '700' },
  expenseTotal: {
    marginTop: 8,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  incomeTotal: {
    marginTop: 8,
    color: COLORS.green,
    fontSize: 18,
    fontWeight: '800',
  },
  incomeUnavailable: {
    marginTop: 8,
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chartCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  chart: {
    height: 208,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  chartCenter: {
    position: 'absolute',
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCenterLabel: { color: COLORS.secondary, fontSize: 10 },
  chartCenterAmount: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  legend: { marginTop: 8 },
  legendRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  legendLabel: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  legendAmount: {
    minWidth: 92,
    color: COLORS.secondary,
    fontSize: 11,
    textAlign: 'right',
  },
  legendPercent: {
    width: 48,
    marginLeft: 8,
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },
  emptyText: {
    marginTop: 12,
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  disclaimer: {
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 2,
  },
  errorCard: {
    padding: 16,
    borderRadius: 15,
    backgroundColor: '#FFF5F4',
    borderColor: '#F0D8D5',
    borderWidth: 1,
  },
  errorText: { color: COLORS.danger, fontSize: 12, lineHeight: 18 },
  retryText: {
    marginTop: 10,
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
  },
  loadingCard: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: COLORS.white,
  },
});
