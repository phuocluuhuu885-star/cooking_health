import React, { memo, useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'react-native';
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
      if (item.source === 'SCANNED') return;
      onPress(item.mealId);
    }, [item.mealId, item.source, onPress]);
    const isScannedMeal = item.source === 'SCANNED';
    const consumedTime = new Date(item.consumedAt).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          isScannedMeal
            ? `Món đã quét ${item.name}`
            : `Xem món đã ăn ${item.name}`
        }
        disabled={isScannedMeal}
        onPress={handlePress}
        style={styles.item}
      >
        {item.imageUrl?.trim() ? (
          <Image
            source={{ uri: item.imageUrl.trim() }}
            style={styles.mealImage}
            resizeMode="cover"
          />
        ) : null}
        <View style={styles.itemCopy}>
          <Text numberOfLines={2} style={styles.itemName}>
            {item.name}
          </Text>
          <View style={styles.itemMetaRow}>
            <Text style={styles.periodBadge}>
              {item.mealPeriod === 'LUNCH' ? 'Bữa trưa' : 'Bữa tối'}
            </Text>
            <Text style={styles.itemMeta}>
              {item.servings} khẩu phần · {consumedTime}
            </Text>
          </View>
          <Text style={styles.calories}>
            {item.nutrition
              ? `${formatNumberWithOptionalDecimal(
                  item.nutrition.calories,
                )} kcal`
              : 'Chưa có dinh dưỡng'}
          </Text>
          {item.source === 'HOUSEHOLD' || isScannedMeal ? (
            <Text style={styles.sourceLabel}>
              {item.source === 'HOUSEHOLD' ? 'Gia đình' : 'Quét AI'}
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  },
);

const DailyConsumedMeals = ({
  items,
  loading,
  error,
  onRetry,
  onPressMeal,
}: DailyConsumedMealsCardProps & { onPressMeal: (mealId: string) => void }) => {
  const renderMeal = (item: DailyConsumedMeal) => (
    <DailyConsumedMealRow key={item.id} item={item} onPress={onPressMeal} />
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Món đã ăn trong ngày</Text>
        {loading ? <ActivityIndicator color={COLORS.green} size="small" /> : null}
      </View>
      <Text style={styles.subtitle}>Các món được ghi nhận trong ngày đã chọn</Text>
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
        <Text style={styles.message}>Ngày này chưa có món nào được ghi nhận.</Text>
      ) : (
        items.map(renderMeal)
      )}
    </View>
  );
};

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
    padding: 14,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  subtitle: { color: COLORS.secondary, fontSize: 12, marginTop: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F7FAF8',
    borderWidth: 1,
    borderColor: '#EEF2EF',
  },
  mealImage: {
    width: 76,
    height: 76,
    borderRadius: 8,
    backgroundColor: '#E7F4EC',
  },
  itemCopy: { flex: 1, minWidth: 0 },
  itemName: { color: COLORS.text, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 7,
  },
  itemMeta: { color: COLORS.secondary, fontSize: 11 },
  periodBadge: {
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    color: COLORS.green,
    backgroundColor: '#E7F4EC',
    fontSize: 10,
    fontWeight: '700',
  },
  sourceLabel: { marginTop: 6, color: COLORS.secondary, fontSize: 10 },
  calories: {
    marginTop: 7,
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '800',
  },
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
