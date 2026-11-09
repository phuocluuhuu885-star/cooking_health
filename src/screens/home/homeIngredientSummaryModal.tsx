import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HomeIngredientSummaryModalProps } from '../../utils/types';
import {
  formatLocalizedNumber,
  formatLocalizedWeight,
} from '../../utils/numberUtils';
import { localStorage } from '../../utils/storage';

const HomeIngredientSummaryRow = ({
  ingredient,
  index,
  checked,
  canCheckIngredients,
  onToggle,
}: {
  ingredient: HomeIngredientSummaryModalProps['ingredients'][number];
  index: number;
  checked: boolean;
  canCheckIngredients: boolean;
  onToggle: (name: string) => void;
}) => {
  const handleToggleIngredient = useCallback(() => {
    onToggle(ingredient.name);
  }, [ingredient.name, onToggle]);
  const getIngredientStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.item,
      checked && styles.itemChecked,
      pressed && canCheckIngredients && styles.pressed,
    ],
    [canCheckIngredients, checked],
  );

  return (
    <Pressable
      accessibilityRole={canCheckIngredients ? 'checkbox' : undefined}
      accessibilityLabel={`${ingredient.name}, ${formatLocalizedWeight(ingredient.amountG)}${
        checked ? ', đã có hoặc đã mua' : ''
      }`}
      accessibilityState={
        canCheckIngredients ? { checked: Boolean(checked) } : undefined
      }
      disabled={!canCheckIngredients}
      onPress={handleToggleIngredient}
      style={getIngredientStyle}
    >
      {canCheckIngredients ? (
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
      ) : (
        <View style={styles.ingredientMarker}>
          <Text style={styles.ingredientMarkerText}>{index + 1}</Text>
        </View>
      )}
      <View style={styles.itemCopy}>
        <Text style={[styles.itemName, checked && styles.itemNameChecked]}>
          {ingredient.name}
        </Text>
        {ingredient.mealNames?.length ? (
          <Text style={styles.mealNames} numberOfLines={2}>
            Dùng cho: {ingredient.mealNames.join(', ')}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.amount, checked && styles.itemNameChecked]}>
        {formatLocalizedWeight(ingredient.amountG)}
      </Text>
    </Pressable>
  );
};

const HomeIngredientSummaryModal = memo(
  (props: HomeIngredientSummaryModalProps) => {
    const insets = useSafeAreaInsets();
    const {
      visible,
      selectedMeals,
      ingredients,
      loading,
      error,
      shoppingListDate,
      shoppingListUserId,
      onClose,
      onRetry,
    } = props;
    const [checked, setChecked] = useState<Record<string, boolean>>({});
    const totalServings = selectedMeals.reduce(
      (total, meal) => total + meal.servings,
      0,
    );
    const totalAmountG = ingredients.reduce(
      (total, ingredient) => total + ingredient.amountG,
      0,
    );
    const canCheckIngredients = Boolean(shoppingListDate && shoppingListUserId);

    useEffect(() => {
      if (!visible || !canCheckIngredients) {
        return;
      }
      setChecked(
        Object.fromEntries(
          ingredients.map(ingredient => [
            ingredient.name,
            localStorage.getBoolean(
              `smart-shopping:${shoppingListUserId}:${shoppingListDate}:${ingredient.name}`,
            ) === true,
          ]),
        ),
      );
    }, [
      canCheckIngredients,
      ingredients,
      shoppingListDate,
      shoppingListUserId,
      visible,
    ]);

    const toggleIngredient = useCallback(
      (name: string) => {
        if (!shoppingListDate || !shoppingListUserId) {
          return;
        }
        const nextChecked = !checked[name];
        localStorage.set(
          `smart-shopping:${shoppingListUserId}:${shoppingListDate}:${name}`,
          nextChecked,
        );
        setChecked(previous => ({
          ...previous,
          [name]: nextChecked,
        }));
      },
      [checked, shoppingListDate, shoppingListUserId],
    );
    const checkedCount = ingredients.filter(
      ingredient => checked[ingredient.name],
    ).length;

    function renderIngredient(
      ingredient: (typeof ingredients)[number],
      index: number,
    ) {
      return (
        <HomeIngredientSummaryRow
          key={ingredient.name}
          ingredient={ingredient}
          index={index}
          checked={Boolean(checked[ingredient.name])}
          canCheckIngredients={canCheckIngredients}
          onToggle={toggleIngredient}
        />
      );
    }

    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.screen}>
          <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>CHUẨN BỊ THỰC ĐƠN</Text>
              <Text style={styles.title}>Danh sách nguyên liệu</Text>
              <Text style={styles.subtitle}>
                {selectedMeals.length} món ·{' '}
                {formatLocalizedNumber(totalServings)} khẩu phần
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng danh sách nguyên liệu"
              onPress={onClose}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>Đóng</Text>
            </Pressable>
          </View>

          {!loading && !error && ingredients.length > 0 ? (
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                {canCheckIngredients
                  ? `${checkedCount} / ${ingredients.length} đã có hoặc đã mua`
                  : `${ingredients.length} loại nguyên liệu · Tổng khối lượng ${formatLocalizedWeight(totalAmountG)}`}
              </Text>
            </View>
          ) : null}

          {loading && ingredients.length === 0 ? (
            <View style={styles.status}>
              <ActivityIndicator color={COLORS.green} />
              <Text style={styles.statusText}>
                Đang tổng hợp nguyên liệu…
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={[
                styles.content,
                { paddingBottom: insets.bottom + 24 },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {error ? (
                <View style={styles.errorCard}>
                  <Text style={styles.errorText}>{error}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={onRetry}
                    style={styles.retryButton}
                  >
                    <Text style={styles.retryText}>Thử lại</Text>
                  </Pressable>
                </View>
              ) : ingredients.length > 0 ? (
                ingredients.map(renderIngredient)
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Chưa có nguyên liệu</Text>
                  <Text style={styles.statusText}>
                    Món đã chọn chưa có dữ liệu nguyên liệu để tổng hợp.
                  </Text>
                </View>
              )}
              <Text style={styles.note}>
                Khối lượng chỉ mang tính tham khảo và thay đổi theo khẩu phần
                từng món.
              </Text>
            </ScrollView>
          )}
        </View>
      </Modal>
    );
  },
);

export default HomeIngredientSummaryModal;

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
    paddingHorizontal: 18,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  eyebrow: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  title: {
    marginTop: 4,
    color: COLORS.text,
    fontSize: 21,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 4,
    color: COLORS.secondary,
    fontSize: 11,
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: COLORS.lightGreen,
  },
  closeText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
  },
  summary: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  summaryText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 9,
  },
  item: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  itemChecked: {
    borderColor: '#D5E7DB',
    backgroundColor: '#F4FAF6',
  },
  pressed: {
    opacity: 0.78,
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#A8B7AE',
    backgroundColor: COLORS.white,
  },
  checkboxChecked: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.green,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  ingredientMarker: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
    borderRadius: 7,
    backgroundColor: COLORS.lightGreen,
  },
  ingredientMarkerText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
  },
  itemCopy: {
    flex: 1,
    paddingRight: 8,
  },
  itemName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  itemNameChecked: {
    color: '#85938A',
    textDecorationLine: 'line-through',
  },
  mealNames: {
    marginTop: 4,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 14,
  },
  amount: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
  },
  status: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  statusText: {
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    marginTop: 28,
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  emptyTitle: {
    marginBottom: 7,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  errorCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEF3F2',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  retryText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
  },
  note: {
    marginTop: 8,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },
});
