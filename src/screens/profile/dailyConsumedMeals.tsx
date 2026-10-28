import React, { memo, useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type {
  DailyConsumedMeal,
  DailyConsumedMealsCardProps,
} from '../../utils/types';
import { formatNumberWithOptionalDecimal } from '../../utils/numberUtils';

const DailyConsumedMealRow = memo(
  ({
    item,
    onPress,
  }: {
    item: DailyConsumedMeal;
    onPress: (mealId: string) => void;
  }) => {
    const handlePress = useCallback(() => {
      onPress(item.mealId);
    }, [item.mealId, onPress]);
    const consumedTime = new Date(item.consumedAt).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Xem món đã ăn ${item.name}`}
        onPress={handlePress}
        style={styles.item}
      >
        <View style={styles.itemCopy}>
          <Text numberOfLines={2} style={styles.itemName}>
            {item.name}
          </Text>
          <Text style={styles.itemMeta}>
            {item.mealPeriod === 'LUNCH' ? 'Bữa trưa' : 'Bữa tối'} ·{' '}
            {item.servings} khẩu phần · {consumedTime}
            {item.source === 'HOUSEHOLD' ? ' · Gia đình' : ''}
          </Text>
        </View>
        <Text style={styles.calories}>
          {item.nutrition
            ? `${formatNumberWithOptionalDecimal(
                item.nutrition.calories,
              )} kcal`
            : 'Chưa có dinh dưỡng'}
        </Text>
      </Pressable>
    );
  },
);

const DailyConsumedMeals = ({
  items,
  loading,
  error,
  onRetry,
  onAddMeal,
  onPressMeal,
}: DailyConsumedMealsCardProps & { onPressMeal: (mealId: string) => void }) => (
  <LinearGradient
    colors={['#FFFFFF', '#F3FAF5']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.card}
  >
    <View style={styles.header}>
      <Text style={styles.title}>Thực phẩm đã tiêu thụ hôm nay</Text>
      <View style={styles.headerActions}>
        {loading ? <ActivityIndicator color={COLORS.green} size="small" /> : null}
        {onAddMeal ? (
          <Pressable
            accessibilityRole="button"
            onPress={onAddMeal}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>+ Thêm món</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
    <Text style={styles.subtitle}>Danh sách theo ngày UTC hiện tại</Text>
    {error ? (
      <View style={styles.messageBox}>
        <Text style={styles.message}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={onRetry}>
          <Text style={styles.retry}>Thử tải lại</Text>
        </Pressable>
      </View>
    ) : loading && items.length === 0 ? (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.green} />
      </View>
    ) : items.length === 0 ? (
      <Text style={styles.message}>Hôm nay chưa có món nào được ghi nhận.</Text>
    ) : (
      items.map(item => (
        <DailyConsumedMealRow key={item.id} item={item} onPress={onPressMeal} />
      ))
    )}
  </LinearGradient>
);

export default memo(DailyConsumedMeals);

const COLORS = {
  green: '#168653',
  text: '#172B23',
  secondary: '#66756D',
  border: '#E5EBE7',
  white: '#FFFFFF',
  danger: '#B42318',
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#E7F4EC',
  },
  addButtonText: { color: COLORS.green, fontSize: 12, fontWeight: '800' },
  title: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  subtitle: { color: COLORS.secondary, fontSize: 12, marginTop: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  itemCopy: { flex: 1 },
  itemName: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  itemMeta: { color: COLORS.secondary, fontSize: 12, marginTop: 4 },
  calories: { color: COLORS.green, fontSize: 12, fontWeight: '800' },
  loading: { minHeight: 64, justifyContent: 'center' },
  messageBox: { marginTop: 10 },
  message: {
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  retry: { color: COLORS.green, fontSize: 12, fontWeight: '700', marginTop: 8 },
});
