import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppImage } from '../../abase/component';
import type { HomeMealItemProps } from '../../utils/types';
import { formatNumberWithOptionalDecimal } from '../../utils/numberUtils';

const HomeMealItem = memo(({ item, onPress }: HomeMealItemProps) => {
  const handlePress = useCallback(() => {
    onPress(item.meal.id);
  }, [item.meal.id, onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Xem chi tiết món ${item.meal.name}`}
      onPress={handlePress}
      style={styles.row}
    >
      {item.meal.imageUrl ? (
        <AppImage
          source={{ uri: item.meal.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderText}>MC</Text>
        </View>
      )}
      <View style={styles.details}>
        <Text numberOfLines={1} style={styles.name}>
          {item.meal.name}
        </Text>
        <Text style={styles.meta}>
          {item.addedBy
            ? `Thêm bởi ${item.addedBy.fullName?.trim() || 'thành viên'} · `
            : ''}
          {formatNumberWithOptionalDecimal(item.servings)} khẩu phần
          {item.nutritionSummary
            ? ` · ${formatNumberWithOptionalDecimal(
                item.nutritionSummary.total.calories,
              )} kcal`
            : ''}
        </Text>
      </View>
      <Text style={[styles.status, item.isConsumed && styles.consumedStatus]}>
        {item.isConsumed ? 'Đã ăn' : 'Đã lên lịch'}
      </Text>
    </Pressable>
  );
});

export default HomeMealItem;

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5EBE7',
  },
  image: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#E7F4EC',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#168653',
    fontSize: 12,
    fontWeight: '800',
  },
  details: {
    flex: 1,
  },
  name: {
    color: '#172B23',
    fontSize: 14,
    fontWeight: '700',
  },
  meta: {
    marginTop: 4,
    color: '#66756D',
    fontSize: 12,
  },
  status: {
    color: '#66756D',
    fontSize: 11,
    fontWeight: '600',
  },
  consumedStatus: {
    color: '#168653',
  },
});
