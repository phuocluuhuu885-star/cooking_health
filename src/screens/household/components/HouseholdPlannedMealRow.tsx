import React, { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppImage } from '../../../abase/component';
import { navigate } from '../../../utils/navigation';
import ScreenKeys from '../../../utils/screenKey';
import type { HouseholdPlannedMeal } from '../../../utils/types';
import { formatEstimatedPrice } from '../../../utils/priceUtils';
import styles from './styles';

type Props = {
  meal: HouseholdPlannedMeal;
};

const HouseholdPlannedMealRow = ({ meal }: Props) => {
  const handlePress = useCallback(() => {
    navigate(ScreenKeys.RECIPE_DETAIL, { mealId: meal.meal.id });
  }, [meal.meal.id]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Xem chi tiết món ${meal.meal.name}`}
      onPress={handlePress}
      style={styles.mealRow}
    >
      {meal.meal.imageUrl ? (
        <AppImage
          source={{ uri: meal.meal.imageUrl }}
          style={styles.mealImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.mealImage, styles.mealImagePlaceholder]}>
          <Text style={styles.memberInitial}>MC</Text>
        </View>
      )}
      <View style={styles.mealDetails}>
        <Text numberOfLines={1} style={styles.mealName}>
          {meal.meal.name}
        </Text>
        {meal.meal.description ? (
          <Text numberOfLines={2} style={styles.mealDescription}>
            {meal.meal.description}
          </Text>
        ) : null}
        <Text style={styles.mealMeta}>
          {meal.servings} khẩu phần · Thêm bởi{' '}
          {meal.addedBy.fullName?.trim() || 'thành viên'}
        </Text>
        <Text style={styles.mealPrice}>
          {formatEstimatedPrice(meal.estimatedPrice)}
        </Text>
      </View>
      <Text style={[styles.mealStatus, meal.isConsumed && styles.mealConsumed]}>
        {meal.isConsumed ? 'Đã ăn' : 'Chưa ăn'}
      </Text>
    </Pressable>
  );
};

export default HouseholdPlannedMealRow;
