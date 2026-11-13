import React, { useCallback, useContext } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { DateData } from 'react-native-calendars';
import { AppImage } from '../../abase/component';
import type {
  BackendMeal,
  Expense,
  ExpenseCategory,
  Income,
  IncomeCategory,
} from '../../utils/types';
import { COLORS } from './ExpenseManagement.styles';
import styles from './ExpenseManagement.styles';

export const CATEGORIES: Array<{
  id: ExpenseCategory;
  label: string;
  icon: string;
}> = [
  { id: 'FOOD', label: 'Ăn uống', icon: '🍽️' },
  { id: 'SHOPPING', label: 'Mua sắm', icon: '🛍️' },
  { id: 'TRANSPORT', label: 'Đi lại', icon: '🚗' },
  { id: 'HOUSEHOLD', label: 'Gia đình', icon: '🏠' },
  { id: 'HEALTH', label: 'Sức khỏe', icon: '❤️' },
  { id: 'ENTERTAINMENT', label: 'Giải trí', icon: '🎬' },
  { id: 'OTHER', label: 'Khác', icon: '•••' },
];

export const INCOME_CATEGORIES: Array<{
  id: IncomeCategory;
  label: string;
  icon: string;
}> = [
  { id: 'SALARY', label: 'Lương', icon: '💰' },
  { id: 'BUSINESS', label: 'Kinh doanh', icon: '📈' },
  { id: 'INVESTMENT', label: 'Đầu tư', icon: '📊' },
  { id: 'GIFT', label: 'Quà tặng', icon: '🎁' },
  { id: 'OTHER', label: 'Khác', icon: '•••' },
];

export const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;

export const formatMoney = (amount: number) => {
  const compact = (value: number) => value.toFixed(1).replace(/\.0$/, '');
  if (amount >= 1_000_000) return `${compact(amount / 1_000_000)}M`;
  if (amount >= 1_000) return `${compact(amount / 1_000)}K`;
  return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
};

const categoryLabel = (category: ExpenseCategory) =>
  CATEGORIES.find(item => item.id === category)?.label ?? 'Khác';

export const ExpenseCalendarContext = React.createContext<{
  dailyTotals: Record<string, number>;
  onSelectDate: ((date: string) => void) | null;
}>({
  dailyTotals: {},
  onSelectDate: null,
});

export const ExpenseCalendarDay = ({
  date,
  state,
}: {
  date?: DateData;
  state?: string;
}) => {
  const { dailyTotals, onSelectDate } = useContext(ExpenseCalendarContext);
  const handlePress = useCallback(() => {
    if (date) onSelectDate?.(date.dateString);
  }, [date, onSelectDate]);
  if (!date) return <View style={styles.calendarCell} />;
  const dayTotal = dailyTotals[date.dateString] ?? 0;
  const isToday = date.dateString === localDateKey(new Date());
  return (
    <Pressable
      accessibilityLabel={`${date.day}, ${formatMoney(dayTotal)} đã chi`}
      accessibilityRole="button"
      onPress={handlePress}
      style={[
        styles.calendarCell,
        isToday && styles.calendarToday,
        dayTotal > 0 && styles.calendarCellSpent,
      ]}
    >
      <Text
        style={[
          styles.calendarDate,
          state === 'disabled' && styles.calendarDateDisabled,
          dayTotal > 0 && styles.calendarDateSpent,
        ]}
      >
        {date.day}
      </Text>
      {dayTotal > 0 ? (
        <Text style={styles.calendarAmount} numberOfLines={1}>
          {formatMoney(dayTotal)}
        </Text>
      ) : null}
    </Pressable>
  );
};

export const CategoryChip = <T extends ExpenseCategory | IncomeCategory>({
  id,
  label,
  icon,
  selected,
  onSelect,
}: {
  id: T;
  label: string;
  icon: string;
  selected: boolean;
  onSelect: (id: T) => void;
}) => {
  const handlePress = useCallback(() => {
    onSelect(id);
  }, [id, onSelect]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={handlePress}
      style={[styles.categoryChip, selected && styles.categoryChipSelected]}
    >
      <Text style={styles.categoryIcon}>{icon}</Text>
      <Text
        style={[styles.categoryText, selected && styles.categoryTextSelected]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export const IncomeTransactionRow = ({
  item,
  onEdit,
  onRemove,
}: {
  item: Income;
  onEdit: (item: Income) => void;
  onRemove: (item: Income) => void;
}) => {
  const handleEdit = useCallback(() => onEdit(item), [item, onEdit]);
  const handleRemove = useCallback(() => onRemove(item), [item, onRemove]);
  const category = INCOME_CATEGORIES.find(
    incomeCategory => incomeCategory.id === item.category,
  );

  return (
    <View style={styles.expenseRow}>
      <View style={styles.expenseIcon}>
        <Text style={styles.expenseIconText}>{category?.icon ?? '💵'}</Text>
      </View>
      <View style={styles.expenseCopy}>
        <Text style={styles.expenseTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.expenseMeta}>
          {category?.label ?? 'Khác'} · {item.incomeDate}
        </Text>
        {item.note ? (
          <Text style={styles.expenseNote} numberOfLines={1}>
            {item.note}
          </Text>
        ) : null}
      </View>
      <View style={styles.expenseAmountWrap}>
        <Text style={styles.incomeAmount}>{formatMoney(item.amountVnd)}</Text>
        <View style={styles.rowActions}>
          <Pressable
            accessibilityRole="button"
            onPress={handleEdit}
            style={styles.rowIconButton}
            hitSlop={8}
          >
            <Svg width={17} height={17} viewBox="0 0 24 24">
              <Path
                d="m14 5 5 5M4 20l4.5-1 10.2-10.2a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z"
                fill="none"
                stroke={COLORS.green}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
              />
            </Svg>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={handleRemove}
            style={styles.rowIconButton}
            hitSlop={8}
          >
            <Svg width={17} height={17} viewBox="0 0 24 24">
              <Path
                d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3"
                fill="none"
                stroke={COLORS.danger}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
              />
            </Svg>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export const MealPickerOption = ({
  meal,
  onSelect,
}: {
  meal: BackendMeal;
  onSelect: (meal: BackendMeal) => void;
}) => {
  const handlePress = useCallback(() => onSelect(meal), [meal, onSelect]);
  const category =
    meal.category === 'LUNCH'
      ? 'Bữa trưa'
      : meal.category === 'DINNER'
        ? 'Bữa tối'
        : meal.category === 'BREAKFAST'
          ? 'Bữa sáng'
          : 'Ăn nhẹ';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      style={styles.mealOption}
    >
      <Text style={styles.mealOptionName}>{meal.name}</Text>
      <Text style={styles.mealOptionCategory}>{category}</Text>
    </Pressable>
  );
};

export const ExpenseTransactionRow = ({
  item,
  onEdit,
  onRemove,
}: {
  item: Expense;
  onEdit: (item: Expense) => void;
  onRemove: (item: Expense) => void;
}) => {
  const handleEdit = useCallback(() => onEdit(item), [item, onEdit]);
  const handleRemove = useCallback(() => onRemove(item), [item, onRemove]);
  const category = CATEGORIES.find(
    expenseCategory => expenseCategory.id === item.category,
  );

  return (
    <View style={styles.expenseRow}>
      <View style={styles.expenseIcon}>
        {item.source === 'MEAL' && item.imageUrl ? (
          <AppImage
            source={{ uri: item.imageUrl }}
            style={styles.expenseImage}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.expenseIconText}>{category?.icon ?? '₫'}</Text>
        )}
      </View>
      <View style={styles.expenseCopy}>
        <Text style={styles.expenseTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.expenseMeta}>
          {categoryLabel(item.category)} · {item.expenseDate}
          {item.source === 'MEAL' ? ' · Món trong app' : ''}
        </Text>
        {item.note ? (
          <Text style={styles.expenseNote} numberOfLines={1}>
            {item.note}
          </Text>
        ) : null}
      </View>
      <View style={styles.expenseAmountWrap}>
        <Text style={styles.expenseAmount}>{formatMoney(item.amountVnd)}</Text>
        <View style={styles.rowActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Sửa ${item.title}`}
            onPress={handleEdit}
            style={styles.rowIconButton}
            hitSlop={8}
          >
            <Svg width={17} height={17} viewBox="0 0 24 24">
              <Path
                d="m14 5 5 5M4 20l4.5-1 10.2-10.2a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z"
                fill="none"
                stroke={COLORS.green}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
              />
            </Svg>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Xóa ${item.title}`}
            onPress={handleRemove}
            style={styles.rowIconButton}
            hitSlop={8}
          >
            <Svg width={17} height={17} viewBox="0 0 24 24">
              <Path
                d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3"
                fill="none"
                stroke={COLORS.danger}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
              />
            </Svg>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export const MealBudgetCard = ({
  period,
  title,
  currentBudget,
  enabled,
  editing,
  draft,
  saving,
  disabled,
  onChange,
  onSave,
  onEdit,
  onToggleEnabled,
  onRemove,
}: {
  period: 'LUNCH' | 'DINNER';
  title: string;
  currentBudget?: number;
  enabled: boolean;
  editing: boolean;
  draft: string;
  saving: boolean;
  disabled: boolean;
  onChange: (period: 'LUNCH' | 'DINNER', value: string) => void;
  onSave: (period: 'LUNCH' | 'DINNER') => void;
  onEdit: (period: 'LUNCH' | 'DINNER') => void;
  onToggleEnabled: (period: 'LUNCH' | 'DINNER', enabled: boolean) => void;
  onRemove: (period: 'LUNCH' | 'DINNER') => void;
}) => {
  const isEditing = currentBudget === undefined || editing;
  const handleChange = useCallback(
    (value: string) => onChange(period, value),
    [onChange, period],
  );
  const handleSave = useCallback(() => onSave(period), [onSave, period]);
  const handleEdit = useCallback(() => onEdit(period), [onEdit, period]);
  const handleToggleEnabled = useCallback(
    (value: boolean) => onToggleEnabled(period, value),
    [onToggleEnabled, period],
  );
  const handleRemove = useCallback(() => onRemove(period), [onRemove, period]);

  return (
    <View style={styles.budgetCard}>
      <View style={styles.budgetHeader}>
        <View style={styles.budgetHeading}>
          <Text style={styles.budgetTitle}>{title}</Text>
          <Text style={styles.budgetCurrent}>
            {currentBudget !== undefined
              ? formatMoney(currentBudget)
              : 'Chưa thiết lập'}
          </Text>
        </View>
        <View style={styles.budgetHeaderActions}>
          {currentBudget !== undefined && !editing ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Sửa ${title}`}
              disabled={disabled}
              onPress={handleEdit}
              style={[styles.budgetEditButton, disabled && styles.disabled]}
            >
              <Svg width={17} height={17} viewBox="0 0 24 24">
                <Path
                  d="m14 5 5 5M4 20l4.5-1 10.7-10.7a2.1 2.1 0 0 0-3-3L5.5 16 4 20Z"
                  fill="none"
                  stroke={COLORS.green}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                />
              </Svg>
            </Pressable>
          ) : null}
          {currentBudget !== undefined ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Xóa ${title}`}
              disabled={disabled}
              onPress={handleRemove}
              style={[styles.budgetRemoveIconButton, disabled && styles.disabled]}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24">
                <Path
                  d="m6 6 12 12M18 6 6 18"
                  fill="none"
                  stroke={COLORS.danger}
                  strokeLinecap="round"
                  strokeWidth={2}
                />
              </Svg>
            </Pressable>
          ) : null}
        </View>
      </View>
      {currentBudget !== undefined ? (
        <View style={styles.budgetSwitchRow}>
          <View style={styles.budgetSwitchCopy}>
            <Text style={styles.budgetSwitchTitle}>Dùng mức này cho AI</Text>
            <Text style={styles.budgetSwitchHint}>
              {enabled
                ? 'AI sẽ giới hạn tổng giá ước tính của bữa.'
                : 'AI sẽ gợi ý theo quy tắc dinh dưỡng, không xét mức này.'}
            </Text>
          </View>
          <Switch
            accessibilityLabel={`Dùng ngân sách ${title} cho AI`}
            disabled={disabled}
            onValueChange={handleToggleEnabled}
            value={enabled}
            trackColor={{ false: '#D9E1DC', true: '#A8D9B6' }}
            thumbColor={enabled ? COLORS.green : '#F4F6F4'}
          />
        </View>
      ) : null}
      {isEditing ? (
        <View style={styles.budgetInputRow}>
          <TextInput
            accessibilityLabel={`${title}, số tiền giới hạn`}
            keyboardType="number-pad"
            onChangeText={handleChange}
            placeholder="Nhập số tiền (VND)"
            placeholderTextColor="#97A59D"
            value={draft}
            style={styles.budgetInput}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Lưu ${title}`}
            disabled={disabled}
            onPress={handleSave}
            style={[styles.budgetSaveButton, disabled && styles.disabled]}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.budgetSaveButtonText}>Lưu</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};
