import React, { memo, useCallback } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CommunityMeal } from '../../utils/types/communityMeal';
import type { CommunityMealFavoriteResponse } from '../../utils/types/communityMeal';
import CommunityMealAuthorOverlay from '../community/CommunityMealAuthorOverlay';
import CommunityMealFavoriteButton from '../community/CommunityMealFavoriteButton';
import CommunityMealRatingBadge from '../community/CommunityMealRatingBadge';

const formatSharedDate = (value: string) =>
  new Date(value).toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'short',
  });

type HomeCommunityMealCardProps = {
  meal: CommunityMeal;
  onPress: (mealId: string) => void;
  onAuthorPress: (
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

const HomeCommunityMealCard = memo(
  ({
    meal,
    onPress,
    onAuthorPress,
    onToggleFavorite,
    imageAuthToken,
  }: HomeCommunityMealCardProps) => {
    const handlePress = useCallback(() => {
      onPress(meal.id);
    }, [meal.id, onPress]);

    const handleAuthorPress = useCallback(() => {
      onAuthorPress(meal.creatorId, meal.creatorName, meal.creatorAvatar);
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
            accessibilityLabel={`Xem món ${meal.name} từ cộng đồng`}
            onPress={handlePress}
            style={styles.imagePressable}
          />
          <CommunityMealAuthorOverlay
            creatorId={meal.creatorId}
            name={meal.creatorName}
            avatarUrl={meal.creatorAvatar}
            onPress={handleAuthorPress}
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
          accessibilityLabel={`Xem món ${meal.name} từ cộng đồng`}
          onPress={handlePress}
          style={styles.content}
        >
          <Text numberOfLines={2} style={styles.name}>
            {meal.name}
          </Text>
          <Text style={styles.date}>Chia sẻ ngày {formatSharedDate(meal.createdAt)}</Text>
          <Text numberOfLines={1} style={styles.calories}>
            {Math.round(meal.nutrition.caloriesKcal)} kcal / khẩu phần
          </Text>
        </Pressable>
      </View>
    );
  },
);

export default HomeCommunityMealCard;

const styles = StyleSheet.create({
  card: {
    width: 220,
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5EBE7',
  },
  imageContainer: {
    position: 'relative',
  },
  imagePressable: {
    ...StyleSheet.absoluteFill,
  },
  image: {
    width: '100%',
    height: 140,
    backgroundColor: '#E7F4EC',
  },
  content: {
    gap: 5,
    padding: 11,
  },
  name: {
    color: '#172B23',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  date: {
    color: '#89958D',
    fontSize: 10,
  },
  calories: {
    color: '#345A45',
    fontSize: 11,
    fontWeight: '700',
  },
});
