import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { Calendar } from 'react-native-calendars';
import ScreenHeader from '../component/ScreenHeader';
import { useFullscreenAdOnFocus } from '../component/FullscreenAdProvider';
import { selectCurrentHousehold } from '../../reduxs/reduces/appData';
import { selectUserInfo } from '../../reduxs/reduces/user';
import type {
  Expense,
  ExpenseCategory,
  ExpenseMonthData,
  ExpenseScope,
  IncomeMonthData,
  MealBudget,
} from '../../utils/types';
import {
  fetchExpenses,
  fetchIncomes,
  fetchMealBudgets,
} from '../../utils/expenseApi';

const COLORS = {
  background: '#F5F8F5',
  white: '#FFFFFF',
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  lightGreen: '#E7F4EC',
  border: '#E5EBE7',
  danger: '#B42318',
  warning: '#B7791F',
  warningBg: '#FFF3DD',
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

const CHART_WIDTH = 340;
const CHART_HEIGHT = 200;
const CHART_PADDING = { left: 18, right: 18, top: 14, bottom: 30 };

const getMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getMonthDateKeys = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = String(index + 1).padStart(2, '0');
    return `${month}-${day}`;
  });
};

const formatMoney = (amount: number) =>
  `${Math.round(amount).toLocaleString('vi-VN')}đ`;

const formatVndValue = (amount: number) =>
  `${Math.round(amount).toLocaleString('vi-VN')} VND`;

const formatCompactMoney = (amount: number) => {
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return formatMoney(amount);
};

const formatShortDate = (dateKey: string) =>
  new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  });

const formatLongDate = (dateKey: string) =>
  new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });

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

const sortDateKeys = (first: string, second: string) =>
  first.localeCompare(second);

const ScopeSwapButton = ({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`Chuyển sang báo cáo ${label.toLocaleLowerCase('vi')}`}
    onPress={onPress}
    style={styles.scopeSwapButton}
  >
    <Text style={styles.scopeSwapIcon}>⇄</Text>
    <Text style={styles.scopeSwapLabel}>{label}</Text>
  </Pressable>
);

const ExpenseReportScreen = () => {
  useFullscreenAdOnFocus();
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUserInfo);
  const household = useSelector(selectCurrentHousehold);
  const requestId = useRef(0);
  const [scope, setScope] = useState<ExpenseScope>('PERSONAL');
  const [month, setMonth] = useState(getMonthKey(new Date()));
  const [data, setData] = useState<ExpenseMonthData | null>(null);
  const [budgetData, setBudgetData] = useState<MealBudget[]>([]);
  const [incomeData, setIncomeData] = useState<IncomeMonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rangeStart, setRangeStart] = useState<string>(() => {
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2,'0')}-${String(firstDay.getDate()).padStart(2,'0')}`;
  });
  const [rangeEnd, setRangeEnd] = useState<string>(() => {
    const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2,'0')}-${String(lastDay.getDate()).padStart(2,'0')}`;
  });
  const [dateRangeVisible, setDateRangeVisible] = useState(false);
  const [calendarMode, setCalendarMode] = useState<'start' | 'end'>('start');

  const loadReport = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    if (!user?.accessToken || !user.id) {
      setData(null);
      setBudgetData([]);
      setError('Đăng nhập để xem báo cáo chi tiêu.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [expenseResponse, incomeResponse, budgetResponse] =
        scope === 'PERSONAL'
          ? await Promise.all([
              fetchExpenses(user, scope, month),
              fetchIncomes(user, month),
              fetchMealBudgets(user, scope),
            ])
          : await Promise.all([
              fetchExpenses(user, scope, month),
              Promise.resolve(null),
              fetchMealBudgets(user, scope),
            ]);
      if (currentRequestId !== requestId.current) return;
      if (!expenseResponse.success || !expenseResponse.data) {
        throw new Error(expenseResponse.message || 'Không thể tải báo cáo chi tiêu.');
      }
      if (scope === 'PERSONAL' && incomeResponse && (!incomeResponse.success || !incomeResponse.data)) {
        throw new Error(incomeResponse.message || 'Không thể tải báo cáo thu nhập.');
      }
      if (!budgetResponse.success || !budgetResponse.data) {
        throw new Error(budgetResponse.message || 'Không thể tải ngân sách chi tiêu.');
      }
      setData(expenseResponse.data);
      setBudgetData(budgetResponse.data);
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

  const dailyBudgetLimit = useMemo(
    () =>
      budgetData
        .filter(budget => budget.enabled)
        .reduce((total, budget) => total + budget.limitVnd, 0),
    [budgetData],
  );

  const monthDateKeys = useMemo(() => getMonthDateKeys(month), [month]);

  const dailyTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const item of data?.items ?? []) {
      totals.set(item.expenseDate, (totals.get(item.expenseDate) ?? 0) + item.amountVnd);
    }
    return totals;
  }, [data]);

  const selectedDateKeys = useMemo(() => {
    if (!rangeStart || !rangeEnd) {
      return [] as string[];
    }
    const start = new Date(`${rangeStart}T00:00:00.000Z`).getTime();
    const end = new Date(`${rangeEnd}T00:00:00.000Z`).getTime();
    const [from, to] = start <= end ? [rangeStart, rangeEnd] : [rangeEnd, rangeStart];
    const range: string[] = [];
    const cursor = new Date(`${from}T00:00:00.000Z`);
    const endCursor = new Date(`${to}T00:00:00.000Z`);
    while (cursor <= endCursor) {
      const key = cursor.toISOString().slice(0, 10);
      range.push(key);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return range;
  }, [rangeEnd, rangeStart]);

  const selectedRangeTotal = useMemo(
    () =>
      selectedDateKeys.reduce(
        (total, dateKey) => total + (dailyTotals.get(dateKey) ?? 0),
        0,
      ),
    [dailyTotals, selectedDateKeys],
  );

  const categoryTotals = useMemo(() => {
    const selectedDates = new Set(selectedDateKeys);
    const totals = new Map<ExpenseCategory, number>();
    for (const item of data?.items ?? []) {
      if (!selectedDates.has(item.expenseDate)) continue;
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
  }, [data, selectedDateKeys]);

  const totalExpenses = selectedRangeTotal;
  const totalIncome = useMemo(() => {
    const selectedDates = new Set(selectedDateKeys);
    return (incomeData?.items ?? [])
      .filter(item => selectedDates.has(item.incomeDate))
      .reduce((total, item) => total + item.amountVnd, 0);
  }, [incomeData, selectedDateKeys]);

  const segments = useMemo(() => {
    let startAngle = -90;
    return categoryTotals.map(category => {
      const sweep = totalExpenses > 0 ? (category.amount / totalExpenses) * 360 : 0;
      const segment = {
        ...category,
        startAngle,
        endAngle: startAngle + sweep,
      };
      startAngle += sweep;
      return segment;
    });
  }, [categoryTotals, totalExpenses]);

  const selectedRangeLabel = useMemo(() => {
    if (!rangeStart || !rangeEnd) {
      return 'Chọn khoảng ngày để xem chi tiết.';
    }
    const [start, end] =
      new Date(`${rangeStart}T00:00:00.000Z`) <=
      new Date(`${rangeEnd}T00:00:00.000Z`)
        ? [rangeStart, rangeEnd]
        : [rangeEnd, rangeStart];
    return `Từ ${formatShortDate(start)} đến ${formatShortDate(end)}`;
  }, [rangeEnd, rangeStart]);

  const expenseSections = useMemo(() => {
    const selectedKeys = selectedDateKeys.length ? selectedDateKeys : monthDateKeys;
    const grouped = new Map<string, Expense[]>();
    for (const item of data?.items ?? []) {
      const list = grouped.get(item.expenseDate) ?? [];
      list.push(item);
      grouped.set(item.expenseDate, list);
    }

    return selectedKeys
      .filter(dateKey => grouped.has(dateKey))
      .sort(sortDateKeys)
      .map(dateKey => {
        const items = grouped.get(dateKey) ?? [];
        const total = items.reduce((sum, item) => sum + item.amountVnd, 0);
        const exceedsBudget = dailyBudgetLimit > 0 && total > dailyBudgetLimit;
        return {
          title: dateKey,
          data: items,
          total,
          exceedsBudget,
          count: items.length,
        };
      });
  }, [dailyBudgetLimit, data?.items, monthDateKeys, selectedDateKeys]);

  const moveMonth = useCallback(
    (offset: number) => {
      const [year, selectedMonth] = month.split('-').map(Number);
      const nextMonth = new Date(year, selectedMonth - 1 + offset, 1);
      const nextMonthKey = getMonthKey(nextMonth);
      const nextStart = `${nextMonthKey}-${String(1).padStart(2, '0')}`;
      const nextEndDate = new Date(year, selectedMonth - 1 + offset + 1, 0);
      const nextEnd = `${nextEndDate.getFullYear()}-${String(nextEndDate.getMonth() + 1).padStart(2, '0')}-${String(nextEndDate.getDate()).padStart(2, '0')}`;
      setMonth(nextMonthKey);
      setRangeStart(nextStart);
      setRangeEnd(nextEnd);
    },
    [month],
  );

  const handleToggleScope = useCallback(() => {
    setScope(scope === 'PERSONAL' ? 'HOUSEHOLD' : 'PERSONAL');
    const currentDate = new Date();
    const monthFirst = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthLast = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    setRangeStart(`${monthFirst.getFullYear()}-${String(monthFirst.getMonth() + 1).padStart(2, '0')}-01`);
    setRangeEnd(`${monthLast.getFullYear()}-${String(monthLast.getMonth() + 1).padStart(2, '0')}-${String(monthLast.getDate()).padStart(2, '0')}`);
  }, [scope]);

  const handlePreviousMonth = useCallback(() => {
    moveMonth(-1);
  }, [moveMonth]);

  const handleNextMonth = useCallback(() => {
    moveMonth(1);
  }, [moveMonth]);

  const openCalendar = useCallback((mode: 'start' | 'end') => {
    setCalendarMode(mode);
    setDateRangeVisible(true);
  }, []);

  const handleCalendarDatePress = useCallback(
    (dateKey: string) => {
      if (calendarMode === 'start') {
        if (rangeEnd && new Date(`${dateKey}T00:00:00.000Z`) > new Date(`${rangeEnd}T00:00:00.000Z`)) {
          setRangeStart(rangeEnd);
          setRangeEnd(dateKey);
        } else {
          setRangeStart(dateKey);
        }
      } else {
        if (rangeStart && new Date(`${dateKey}T00:00:00.000Z`) < new Date(`${rangeStart}T00:00:00.000Z`)) {
          setRangeEnd(rangeStart);
          setRangeStart(dateKey);
        } else {
          setRangeEnd(dateKey);
        }
      }
      setDateRangeVisible(false);
      setCalendarMode('start');
    },
    [calendarMode, rangeEnd, rangeStart],
  );

  const chartRangeKeys = useMemo(() => {
    if (selectedDateKeys.length) return selectedDateKeys;
    return monthDateKeys;
  }, [monthDateKeys, selectedDateKeys]);

  const chartPoints = useMemo(() => {
    const values = chartRangeKeys.map(dateKey => dailyTotals.get(dateKey) ?? 0);
    const maxValue = Math.max(...values, dailyBudgetLimit || 1, 1);
    const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
    const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
    const xStep = values.length > 1 ? plotWidth / (values.length - 1) : 0;

    return chartRangeKeys.map((dateKey, index) => {
      const value = values[index] ?? 0;
      const x = CHART_PADDING.left + index * xStep;
      const y = CHART_PADDING.top + plotHeight - (value / maxValue) * plotHeight;
      return { dateKey, x, y, value };
    });
  }, [chartRangeKeys, dailyBudgetLimit, dailyTotals]);

  const barChartMaxValue = useMemo(
    () => Math.max(...chartPoints.map(point => point.value), 1),
    [chartPoints],
  );

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

  const calendarMarkedDates = useMemo(() => {
    const dates: Record<
      string,
      {
        color: string;
        textColor: string;
        startingDay?: boolean;
        endingDay?: boolean;
      }
    > = {};
    selectedDateKeys.forEach((dateKey, index) => {
      dates[dateKey] = {
        color: COLORS.lightGreen,
        textColor: COLORS.text,
        ...(index === 0 ? { startingDay: true } : {}),
        ...(index === selectedDateKeys.length - 1 ? { endingDay: true } : {}),
      };
    });
    return dates;
  }, [selectedDateKeys]);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        eyebrow="CHI TIÊU"
        title="Báo cáo thu chi"
        rightAction={
          household ? (
            <ScopeSwapButton
              label={scope === 'PERSONAL' ? 'Gia đình' : 'Cá nhân'}
              onPress={handleToggleScope}
            />
          ) : null
        }
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dateRangeCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tháng trước"
            onPress={handlePreviousMonth}
            style={styles.monthArrow}
          >
            <Text style={styles.monthArrowText}>‹</Text>
          </Pressable>

          <View style={styles.rangeTextWrap}>
            <Pressable
              accessibilityRole="button"
              onPress={() => openCalendar('start')}
              style={styles.rangeSelector}
            >
              <Text style={styles.rangeLabel}>Từ</Text>
              <Text style={styles.rangeValue}>{rangeStart ? formatShortDate(rangeStart) : '--/--'}</Text>
            </Pressable>

            <Text style={styles.rangeSeparator}>–</Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => openCalendar('end')}
              style={styles.rangeSelector}
            >
              <Text style={styles.rangeLabel}>Đến</Text>
              <Text style={styles.rangeValue}>{rangeEnd ? formatShortDate(rangeEnd) : '--/--'}</Text>
            </Pressable>
          </View>

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
                <Text style={styles.summarySubText}>{selectedRangeLabel}</Text>
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
                  Chưa có khoản chi trong khoảng thời gian này để lập biểu đồ.
                </Text>
              )}
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Biểu đồ chi tiêu theo ngày</Text>
              <Text style={styles.rangeSummary}>{selectedRangeLabel}</Text>
              {chartPoints.length > 0 ? (
                <View style={styles.barChartContainer}>
                  <Svg width={CHART_WIDTH} height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
                    <Defs>
                      <SvgLinearGradient id="dailyBarFill" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor={COLORS.green} stopOpacity={0.82} />
                        <Stop offset="100%" stopColor={COLORS.green} stopOpacity={0.32} />
                      </SvgLinearGradient>
                    </Defs>

                    {[0, 1, 2, 3].map(line => {
                      const y = CHART_PADDING.top + ((CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom) / 3) * line;
                      return (
                        <Line
                          key={`grid-${line}`}
                          x1={CHART_PADDING.left}
                          x2={CHART_WIDTH - CHART_PADDING.right}
                          y1={y}
                          y2={y}
                          stroke={COLORS.border}
                          strokeWidth={1}
                          strokeDasharray="4 4"
                        />
                      );
                    })}

                    {chartPoints.map(point => {
                      const barHeight = point.value === 0 ? 4 : (point.value / barChartMaxValue) * (CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom - 12);
                      const x = point.x - 7;
                      const y = CHART_HEIGHT - CHART_PADDING.bottom - barHeight;
                      const isSelected = rangeStart === point.dateKey || rangeEnd === point.dateKey;

                      return (
                        <React.Fragment key={point.dateKey}>
                          <Rect
                            x={x}
                            y={y}
                            width={14}
                            height={Math.max(barHeight, point.value === 0 ? 4 : 8)}
                            rx={4}
                            fill={isSelected ? COLORS.green : 'url(#dailyBarFill)'}
                            opacity={point.value > 0 ? 1 : 0.2}
                          />
                          <SvgText
                            x={point.x}
                            y={CHART_HEIGHT - 10}
                            fill={COLORS.secondary}
                            fontSize="8"
                            textAnchor="middle"
                          >
                            {String(new Date(`${point.dateKey}T00:00:00.000Z`).getUTCDate())}
                          </SvgText>
                        </React.Fragment>
                      );
                    })}
                  </Svg>

                  <View style={styles.chartBarTouchLayer}>
                    {chartPoints.map(point => (
                      <Pressable
                        key={`touch-${point.dateKey}`}
                        accessibilityRole="button"
                        accessibilityLabel={`Ngày ${formatLongDate(point.dateKey)}, chi ${formatVndValue(point.value)}`}
                        onPress={() => {
                          if (!rangeStart || (rangeStart && rangeEnd)) {
                            setRangeStart(point.dateKey);
                            setRangeEnd(null);
                            return;
                          }
                          const start = new Date(`${rangeStart}T00:00:00.000Z`).getTime();
                          const end = new Date(`${point.dateKey}T00:00:00.000Z`).getTime();
                          if (start === end) {
                            setRangeEnd(point.dateKey);
                            return;
                          }
                          if (end < start) {
                            setRangeStart(point.dateKey);
                            setRangeEnd(rangeStart);
                            return;
                          }
                          setRangeEnd(point.dateKey);
                        }}
                        style={[
                          styles.chartBarTouch,
                          {
                            left: point.x - 16,
                            top: CHART_PADDING.top,
                            height: CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom,
                          },
                          (rangeStart === point.dateKey || rangeEnd === point.dateKey) && styles.chartBarTouchSelected,
                        ]}
                      />
                    ))}
                  </View>
                </View>
              ) : (
                <Text style={styles.emptyText}>Chưa có dữ liệu chi tiêu trong khoảng thời gian này.</Text>
              )}
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Danh sách chi tiêu theo ngày</Text>
              {expenseSections.length ? (
                <SectionList
                  scrollEnabled={false}
                  sections={expenseSections.map(section => ({
                    title: section.title,
                    data: section.data,
                    total: section.total,
                    exceedsBudget: section.exceedsBudget,
                    count: section.count,
                  }))}
                  keyExtractor={item => item.id}
                  renderSectionHeader={({ section }) => (
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionHeaderTitle}>
                        {formatLongDate(section.title)}
                      </Text>
                      <View style={styles.sectionHeaderMeta}>
                        <Text style={styles.sectionHeaderAmount}>
                          {formatMoney(section.total)}
                        </Text>
                        <Text style={styles.sectionHeaderCount}>
                          {section.count} khoản
                        </Text>
                      </View>
                      {section.exceedsBudget ? (
                        <View style={styles.warningBadge}>
                          <Text style={styles.warningBadgeText}>⚠ Vượt ngân sách</Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                  renderItem={({ item }) => (
                    <View style={styles.expenseRow}>
                      <View style={styles.expenseMeta}>
                        <Text style={styles.expenseTitle}>{item.title}</Text>
                        <Text style={styles.expenseCategory}>
                          {CATEGORIES.find(category => category.id === item.category)?.label ?? 'Khác'}
                        </Text>
                      </View>
                      <View style={styles.expenseValueWrap}>
                        <Text style={styles.expenseValue}>{formatMoney(item.amountVnd)}</Text>
                        {item.note ? (
                          <Text style={styles.expenseNote} numberOfLines={1}>
                            {item.note}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  )}
                  contentContainerStyle={styles.sectionListContent}
                />
              ) : (
                <Text style={styles.emptyText}>
                  Chưa có khoản chi nào trong khoảng này.
                </Text>
              )}
            </View>

            <Text style={styles.disclaimer}>
              Chọn ngày bắt đầu và ngày kết thúc để lọc báo cáo chi tiêu. Mỗi ngày
              hiển thị tổng chi và cảnh báo nếu vượt ngân sách đã đặt.
            </Text>
          </>
        )}
      </ScrollView>

      <Modal
        transparent
        animationType="slide"
        visible={dateRangeVisible}
        onRequestClose={() => setDateRangeVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.calendarSheet}>
            <Text style={styles.calendarTitle}>
              {calendarMode === 'start' ? 'Chọn ngày bắt đầu' : 'Chọn ngày kết thúc'}
            </Text>
            <Calendar
              current={month}
              monthFormat={'yyyy-MM'}
              onDayPress={day => handleCalendarDatePress(day.dateString)}
              markedDates={calendarMarkedDates}
              markingType="period"
              theme={{
                selectedDayBackgroundColor: '#168653',
                selectedDayTextColor: '#FFFFFF',
                todayTextColor: '#168653',
                arrowColor: '#168653',
                textDayFontSize: 14,
                textMonthFontSize: 15,
                textDayHeaderFontSize: 12,
              }}
            />
            <Pressable
              accessibilityRole="button"
              style={styles.modalCloseButton}
              onPress={() => setDateRangeVisible(false)}
            >
              <Text style={styles.modalCloseText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ExpenseReportScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },
  scopeSwapButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: COLORS.lightGreen,
  },
  scopeSwapIcon: { color: COLORS.green, fontSize: 18, fontWeight: '700' },
  scopeSwapLabel: { color: COLORS.green, fontSize: 12, fontWeight: '700' },
  dateRangeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 8,
  },
  rangeTextWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rangeSelector: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  rangeLabel: { color: COLORS.secondary, fontSize: 10, fontWeight: '700' },
  rangeValue: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  rangeSeparator: { color: COLORS.secondary, fontSize: 18, fontWeight: '700' },
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
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryLabel: { color: COLORS.secondary, fontSize: 11, fontWeight: '700' },
  summarySubText: {
    marginTop: 4,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 14,
  },
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
  chartCard: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dailyChartCard: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  rangeSummary: {
    marginTop: 8,
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '700',
  },
  barChartContainer: {
    position: 'relative',
    marginTop: 12,
    minHeight: 210,
  },
  chartBarTouchLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  chartBarTouch: {
    position: 'absolute',
    width: 32,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  chartBarTouchSelected: {
    backgroundColor: 'rgba(22, 134, 83, 0.08)',
  },
  chartPointLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  chartPoint: {
    position: 'absolute',
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: 'transparent',
  },
  chartPointHasValue: {
    backgroundColor: 'rgba(22, 134, 83, 0.07)',
  },
  chartPointSelected: {
    backgroundColor: 'rgba(22, 134, 83, 0.12)',
  },
  chartPointInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.green,
  },
  chartPointInnerActive: {
    backgroundColor: COLORS.green,
  },
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
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.32)',
  },
  calendarSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 18,
    paddingBottom: 20,
  },
  calendarTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  modalCloseButton: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.lightGreen,
  },
  modalCloseText: {
    color: COLORS.green,
    fontSize: 13,
    fontWeight: '800',
  },
  sectionListContent: { paddingTop: 10, gap: 8 },
  sectionHeader: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  sectionHeaderTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeaderMeta: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionHeaderAmount: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHeaderCount: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  warningBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: COLORS.warningBg,
  },
  warningBadgeText: {
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: '700',
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  expenseMeta: { flex: 1 },
  expenseTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  expenseCategory: {
    marginTop: 4,
    color: COLORS.secondary,
    fontSize: 10,
  },
  expenseValueWrap: { alignItems: 'flex-end', maxWidth: 116 },
  expenseValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
  },
  expenseNote: {
    marginTop: 3,
    color: COLORS.secondary,
    fontSize: 9,
    maxWidth: 100,
  },
});
