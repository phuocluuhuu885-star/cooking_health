import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { AppImage } from '../../abase/component';
import type { HomeRecipeCardProps } from '../../utils/types';

const HomeRecipeCard = memo(
  ({
    meal,
    onPress,
    reviewSummary,
  }: HomeRecipeCardProps) => {
    const handlePress = useCallback(() => {
      onPress(meal.id);
    }, [meal.id, onPress]);

    return (
      <LinearGradient
        colors={['#FFFFFF', '#F2F8F4']}
        style={styles.card}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Xem công thức ${meal.name}`}
          onPress={handlePress}
          style={styles.recipeButton}
        >
          {meal.imageUrl ? (
            <AppImage
              source={{ uri: meal.imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Text style={styles.placeholderText}>MealCraft</Text>
            </View>
          )}
          <View style={styles.details}>
            <Text numberOfLines={2} style={styles.name}>
              {meal.name}
            </Text>
            <Text numberOfLines={1} style={styles.meta}>
              {meal.nutritionSummary
                ? `${Math.round(
                    meal.nutritionSummary.perServing.calories,
                  )} kcal`
                : 'Chưa có dữ liệu calo'}
              {' · '}
              {meal.prepTimeMinutes + meal.cookTimeMinutes} phút
            </Text>
            <Text style={styles.detailLink}>Xem chi tiết công thức</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <View
          accessible
          accessibilityLabel={
            reviewSummary?.total
              ? `Đánh giá ${reviewSummary.averageRating.toFixed(1)} trên 5 sao`
              : 'Chưa có đánh giá'
          }
          style={styles.reviewRow}
        >
          <Text style={styles.ratingStar}>★</Text>
          <Text style={styles.ratingValue}>
            {reviewSummary?.total
              ? reviewSummary.averageRating.toFixed(1)
              : '—'}
          </Text>
        </View>
      </LinearGradient>
    );
  },
);

export default HomeRecipeCard;

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5EBE7',
  },
  recipeButton: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 9,
  },
  image: {
    width: 70,
    height: 70,
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
    marginTop: 6,
    color: '#66756D',
    fontSize: 12,
  },
  chevron: {
    paddingHorizontal: 6,
    color: '#168653',
    fontSize: 22,
    fontWeight: '600',
  },
  detailLink: {
    marginTop: 5,
    color: '#168653',
    fontSize: 12,
    fontWeight: '700',
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 7,
  },
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingStar: {
    color: '#E89B36',
    fontSize: 16,
  },
  ratingValue: {
    color: '#172B23',
    fontSize: 12,
    fontWeight: '700',
  },
});
