import React, { memo, useCallback } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CommunityMeal } from '../../utils/types/communityMeal';
import type { CommunityMealFavoriteResponse } from '../../utils/types/communityMeal';
import CommunityMealAuthorOverlay from './CommunityMealAuthorOverlay';
import CommunityMealFavoriteButton from './CommunityMealFavoriteButton';
import CommunityMealRatingBadge from './CommunityMealRatingBadge';

const formatSharedDate = (value: string) =>
  new Date(value).toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

type CommunityMealCardProps = {
  meal: CommunityMeal;
  onPress: (mealId: string) => void;
  onAuthorPress?: (
    creatorId: string,
    creatorName: string,
    creatorAvatar: string | null,
  ) => void;
  onToggleFavorite: (
    mealId: string,
    isFavorited: boolean,
  ) => Promise<CommunityMealFavoriteResponse>;
  imageAuthToken?: string;
};

const CommunityMealCard = memo(
  ({
    meal,
    onPress,
    onAuthorPress,
    onToggleFavorite,
    imageAuthToken,
  }: CommunityMealCardProps) => {
    const handlePress = useCallback(() => {
      onPress(meal.id);
    }, [meal.id, onPress]);

    const handleAuthorPress = useCallback(() => {
      onAuthorPress?.(meal.creatorId, meal.creatorName, meal.creatorAvatar);
    }, [meal.creatorAvatar, meal.creatorId, meal.creatorName, onAuthorPress]);

    return (
      <View style={styles.card}>
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: meal.imageUrl,
              headers: imageAuthToken
                ? { Authorization: `Bearer ${imageAuthToken}` }
                : undefined,
            }}
            style={styles.image}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Xem công thức ${meal.name}`}
            onPress={handlePress}
            style={styles.imagePressable}
          />
          <CommunityMealAuthorOverlay
            creatorId={meal.creatorId}
            name={meal.creatorName}
            avatarUrl={meal.creatorAvatar}
            onPress={onAuthorPress ? handleAuthorPress : undefined}
          />
          <CommunityMealRatingBadge
            averageRating={meal.averageRating}
            reviewCount={meal.reviewCount}
          />
          {meal.status === 'APPROVED' ? (
            <CommunityMealFavoriteButton
              mealId={meal.id}
              favoriteCount={meal.favoriteCount}
              isFavorited={meal.isFavorited}
              onToggle={onToggleFavorite}
            />
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Xem công thức ${meal.name}`}
          onPress={handlePress}
          style={styles.content}
        >
          <Text numberOfLines={2} style={styles.name}>
            {meal.name}
          </Text>
          <View style={styles.dateAndStatus}>
            <Text style={styles.date}>
              Chia sẻ ngày {formatSharedDate(meal.createdAt)}
            </Text>
            {meal.status !== 'APPROVED' ? (
              <Text
                style={[
                  styles.status,
                  meal.status === 'REJECTED' && styles.rejectedStatus,
                ]}
              >
                {meal.status === 'PENDING' ? 'Chờ duyệt' : 'Chưa được duyệt'}
              </Text>
            ) : null}
          </View>
          {meal.status === 'REJECTED' && meal.moderationReason ? (
            <Text style={styles.moderationReason}>{meal.moderationReason}</Text>
          ) : null}
          {meal.description ? (
            <Text numberOfLines={2} style={styles.description}>
              {meal.description}
            </Text>
          ) : null}
          <View style={styles.meta}>
            <Text style={styles.calories}>
              {Math.round(meal.nutrition.caloriesKcal)} kcal / khẩu phần
            </Text>
            <Text style={styles.ingredientCount}>
              {meal.ingredients.length} nguyên liệu
            </Text>
          </View>
        </Pressable>
      </View>
    );
  },
);

export default CommunityMealCard;

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6ECE7',
  },
  imageContainer: {
    position: 'relative',
  },
  imagePressable: {
    ...StyleSheet.absoluteFill,
  },
  image: {
    width: '100%',
    height: 190,
    backgroundColor: '#EAF2EC',
  },
  content: {
    padding: 14,
  },
  name: {
    marginTop: 4,
    color: '#172B23',
    fontSize: 17,
    fontWeight: '800',
  },
  dateAndStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 5,
  },
  date: {
    flex: 1,
    color: '#89958D',
    fontSize: 11,
  },
  status: {
    color: '#A56912',
    fontSize: 11,
    fontWeight: '700',
  },
  rejectedStatus: {
    color: '#B43C35',
  },
  moderationReason: {
    marginTop: 5,
    color: '#B43C35',
    fontSize: 12,
    lineHeight: 17,
  },
  description: {
    marginTop: 5,
    color: '#66756D',
    fontSize: 13,
    lineHeight: 18,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 12,
  },
  calories: {
    color: '#345A45',
    fontSize: 12,
    fontWeight: '700',
  },
  ingredientCount: {
    color: '#7A887F',
    fontSize: 12,
  },
});
