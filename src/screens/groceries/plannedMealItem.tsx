import React, { useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppImage } from '../../abase/component';
import { navigate } from '../../utils/navigation';
import ScreenKeys from '../../utils/screenKey';
import type { PlannedMealItemProps } from '../../utils/types';
import { formatNumberWithOptionalDecimal } from '../../utils/numberUtils';

const PlannedMealItem = ({
  item,
  onDelete,
  canDelete = false,
}: PlannedMealItemProps) => {
  const handlePress = useCallback(() => {
    navigate(ScreenKeys.RECIPE_DETAIL, { mealId: item.meal.id });
  }, [item.meal.id]);
  return (
    <LinearGradient colors={['#FFFFFF', '#F0F8F2']} style={styles.row}>
      <View style={styles.mealHeader}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Xem chi tiết món ${item.meal.name}`}
          activeOpacity={0.8}
          onPress={handlePress}
          style={styles.mealButton}
        >
          {item.meal.imageUrl ? (
            <AppImage
              source={{ uri: item.meal.imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Text style={styles.imagePlaceholderText}>MC</Text>
            </View>
          )}
          <View style={styles.details}>
            <Text numberOfLines={2} style={styles.name}>
              {item.meal.name}
            </Text>
            <Text style={styles.servings}>
              {formatNumberWithOptionalDecimal(item.servings)} khẩu phần
            </Text>
            {item.addedBy ? (
              <Text numberOfLines={1} style={styles.servings}>
                Thêm bởi {item.addedBy.fullName?.trim() || 'thành viên'}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
        {canDelete && onDelete ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Xóa ${item.meal.name} khỏi thực đơn`}
            onPress={() => onDelete(item)}
            hitSlop={8}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteButtonText}>Xóa</Text>
          </Pressable>
        ) : null}
      </View>
    </LinearGradient>
  );
};

export default PlannedMealItem;

const styles = StyleSheet.create({
  row: {
    padding: 12,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#E7F4EC',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    color: '#2FA878',
    fontSize: 12,
    fontWeight: '800',
  },
  details: {
    flex: 1,
  },
  name: {
    color: '#1C242C',
    fontSize: 14,
    fontWeight: '600',
  },
  servings: {
    marginTop: 4,
    color: '#7A858E',
    fontSize: 12,
  },
  deleteButton: {
    minWidth: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 7,
    borderRadius: 12,
    backgroundColor: '#FEF3F2',
  },
  deleteButtonText: {
    color: '#B42318',
    fontSize: 12,
    fontWeight: '700',
  },
});
