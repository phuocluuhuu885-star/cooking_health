import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { EstimatedPriceRange, MealPeriod } from '../../utils/types';
import { formatEstimatedPrice } from '../../utils/priceUtils';

export type MealExpenseItem = {
  mealId: string;
  name: string;
  estimatedPrice?: EstimatedPriceRange;
};

export type MealExpenseEntry = {
  mealId: string;
  amountVnd: number;
};

type Props = {
  visible: boolean;
  date: string;
  mealPeriod: MealPeriod;
  meals: MealExpenseItem[];
  saving: boolean;
  onCancel: () => void;
  onConfirm: (expenses: MealExpenseEntry[]) => void;
};

type MealExpenseDraft = MealExpenseItem & {
  amount: string;
  includeExpense: boolean;
};

const getSuggestedAmount = (price?: EstimatedPriceRange) => {
  if (!price || (price.minVnd <= 0 && price.maxVnd <= 0)) return '';
  return String(Math.round((price.minVnd + price.maxVnd) / 2));
};

const formatDate = (date: string) =>
  new Date(`${date}T12:00:00.000Z`).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });

const formatMoney = (amount: number) => `${amount.toLocaleString('vi-VN')}đ`;

const MealExpenseRow = memo(
  ({
    item,
    disabled,
    onToggle,
    onAmountChange,
  }: {
    item: MealExpenseDraft;
    disabled: boolean;
    onToggle: (mealId: string) => void;
    onAmountChange: (mealId: string, value: string) => void;
  }) => {
    const handleToggle = useCallback(() => {
      onToggle(item.mealId);
    }, [item.mealId, onToggle]);
    const handleAmountChange = useCallback(
      (value: string) => onAmountChange(item.mealId, value),
      [item.mealId, onAmountChange],
    );

    return (
      <View style={styles.mealRow}>
        <View style={styles.mealHeading}>
          <View style={styles.mealCopy}>
            <Text numberOfLines={2} style={styles.mealName}>
              {item.name}
            </Text>
            <Text style={styles.suggestedPrice}>
              Giá gợi ý: {formatEstimatedPrice(item.estimatedPrice)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={`Ghi chi phí cho ${item.name}`}
            accessibilityState={{
              checked: item.includeExpense,
              disabled,
            }}
            disabled={disabled}
            onPress={handleToggle}
            style={[
              styles.checkbox,
              item.includeExpense && styles.checkboxSelected,
              disabled && styles.disabled,
            ]}
          >
            {item.includeExpense ? (
              <Text style={styles.checkboxCheck}>✓</Text>
            ) : null}
          </Pressable>
        </View>
        {item.includeExpense ? (
          <View style={styles.amountRow}>
            <TextInput
              accessibilityLabel={`Số tiền món ${item.name}`}
              editable={!disabled}
              keyboardType="number-pad"
              onChangeText={handleAmountChange}
              placeholder="Nhập số tiền"
              placeholderTextColor={COLORS.placeholder}
              style={styles.amountInput}
              value={item.amount}
            />
            <Text style={styles.currency}>VNĐ</Text>
          </View>
        ) : (
          <Text style={styles.noExpense}>Không tính vào khoản chi</Text>
        )}
      </View>
    );
  },
);

const MealConsumptionModal = ({
  visible,
  date,
  mealPeriod,
  meals,
  saving,
  onCancel,
  onConfirm,
}: Props) => {
  const [drafts, setDrafts] = useState<MealExpenseDraft[]>([]);
  const [error, setError] = useState('');
  const [eatenTime, setEatenTime] = useState('');
  const periodLabel = mealPeriod === 'LUNCH' ? 'bữa trưa' : 'bữa tối';

  useEffect(() => {
    if (!visible) return;
    setDrafts(
      meals.map(item => ({
        ...item,
        amount: getSuggestedAmount(item.estimatedPrice),
        includeExpense: Boolean(
          item.estimatedPrice &&
            (item.estimatedPrice.minVnd > 0 || item.estimatedPrice.maxVnd > 0),
        ),
      })),
    );
    setError('');
    setEatenTime(
      new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    );
  }, [meals, visible]);

  const totalExpense = useMemo(
    () =>
      drafts.reduce((total, item) => {
        if (!item.includeExpense) return total;
        const amount = Number(item.amount);
        return total + (Number.isSafeInteger(amount) && amount > 0 ? amount : 0);
      }, 0),
    [drafts],
  );

  const handleToggleExpense = useCallback((mealId: string) => {
    setDrafts(previous =>
      previous.map(item =>
        item.mealId === mealId
          ? { ...item, includeExpense: !item.includeExpense }
          : item,
      ),
    );
    setError('');
  }, []);

  const handleAmountChange = useCallback((mealId: string, value: string) => {
    setDrafts(previous =>
      previous.map(item =>
        item.mealId === mealId
          ? { ...item, amount: value.replace(/[^\d]/g, '') }
          : item,
      ),
    );
    setError('');
  }, []);

  const handleConfirm = useCallback(() => {
    const selected = drafts.filter(item => item.includeExpense);
    const invalidMeal = selected.find(item => {
      const amount = Number(item.amount);
      return !Number.isSafeInteger(amount) || amount <= 0;
    });
    if (invalidMeal) {
      setError(`Nhập số tiền hợp lệ cho món ${invalidMeal.name}.`);
      return;
    }

    onConfirm(
      selected.map(item => ({
        mealId: item.mealId,
        amountVnd: Number(item.amount),
      })),
    );
  }, [drafts, onConfirm]);

  const getConfirmButtonStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.confirmButton,
      saving && styles.disabled,
      pressed && !saving && styles.pressed,
    ],
    [saving],
  );

  function renderMeal(item: MealExpenseDraft) {
    return (
      <MealExpenseRow
        key={item.mealId}
        item={item}
        disabled={saving}
        onToggle={handleToggleExpense}
        onAmountChange={handleAmountChange}
      />
    );
  }

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={saving ? undefined : onCancel}
    >
      <KeyboardAvoidingView behavior="padding" style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>
                Chi phí {periodLabel}
              </Text>
              <Text style={styles.date}>
                {formatDate(date)}{eatenTime ? ` · ${eatenTime}` : ''}
              </Text>
            </View>
            <View style={styles.eatenBadge}>
              <Text style={styles.eatenBadgeText}>Đã ăn</Text>
            </View>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.mealList}
          >
            {drafts.map(renderMeal)}
          </ScrollView>

          <View style={styles.footer}>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tổng chi phí</Text>
              <Text style={styles.totalAmount}>{formatMoney(totalExpense)}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={handleConfirm}
              style={getConfirmButtonStyle}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {totalExpense > 0
                    ? 'Xác nhận đã ăn và lưu chi phí'
                    : 'Chỉ xác nhận đã ăn'}
                </Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={onCancel}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default MealConsumptionModal;

const COLORS = {
  green: '#168653',
  lightGreen: '#E7F4EC',
  text: '#172B23',
  secondary: '#66756D',
  border: '#E5EBE7',
  white: '#FFFFFF',
  placeholder: '#879A90',
  danger: '#B42318',
  background: '#F5F7F5',
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: 'rgba(17, 35, 27, 0.48)',
  },
  sheet: {
    maxHeight: '90%',
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: '#F3FAF5',
  },
  headerCopy: { flex: 1 },
  title: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  date: { marginTop: 5, color: COLORS.secondary, fontSize: 11 },
  eatenBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: COLORS.lightGreen,
  },
  eatenBadgeText: { color: COLORS.green, fontSize: 11, fontWeight: '700' },
  mealList: {
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
  },
  mealRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  mealHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mealCopy: { flex: 1 },
  mealName: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  suggestedPrice: { marginTop: 4, color: COLORS.secondary, fontSize: 11 },
  checkbox: {
    width: 23,
    height: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#B8C6BE',
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  checkboxSelected: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.green,
  },
  checkboxCheck: {
    color: COLORS.white,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '800',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 7,
  },
  amountInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    color: COLORS.text,
    backgroundColor: '#FBFEFC',
    fontSize: 14,
  },
  currency: { color: COLORS.green, fontSize: 11, fontWeight: '700' },
  noExpense: { marginTop: 8, color: COLORS.secondary, fontSize: 11 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: '#FBFEFC',
  },
  error: { marginBottom: 8, color: COLORS.danger, fontSize: 12 },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: COLORS.lightGreen,
  },
  totalLabel: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  totalAmount: { color: COLORS.green, fontSize: 20, fontWeight: '800' },
  confirmButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.green,
  },
  confirmButtonText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  cancelButton: { alignItems: 'center', paddingVertical: 10 },
  cancelButtonText: { color: COLORS.secondary, fontSize: 12, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.8 },
});
