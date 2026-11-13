import React, { memo, useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from 'react-native';
import type { CommunityMealFavoriteResponse } from '../../utils/types/communityMeal';

type CommunityMealFavoriteButtonProps = {
  mealId: string;
  favoriteCount: number;
  isFavorited: boolean;
  onToggle: (
    mealId: string,
    isFavorited: boolean,
  ) => Promise<CommunityMealFavoriteResponse>;
};

const CommunityMealFavoriteButton = memo(
  ({
    mealId,
    favoriteCount,
    isFavorited,
    onToggle,
  }: CommunityMealFavoriteButtonProps) => {
    const [loading, setLoading] = useState(false);

    const handleToggle = useCallback(async () => {
      if (loading) return;
      setLoading(true);
      try {
        const response = await onToggle(mealId, !isFavorited);
        if (!response?.success || !response.data) {
          throw new Error(
            response?.message || 'Không thể cập nhật món yêu thích.',
          );
        }
      } catch (requestError) {
        Alert.alert(
          'Không thể cập nhật yêu thích',
          requestError instanceof Error
            ? requestError.message
            : 'Vui lòng thử lại.',
        );
      } finally {
        setLoading(false);
      }
    }, [isFavorited, loading, mealId, onToggle]);

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          isFavorited ? 'Bỏ yêu thích món ăn' : 'Thêm món vào yêu thích'
        }
        accessibilityState={{ selected: isFavorited, disabled: loading }}
        disabled={loading}
        onPress={handleToggle}
        style={styles.button}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Text style={[styles.heart, isFavorited && styles.selectedHeart]}>
              {isFavorited ? '♥' : '♡'}
            </Text>
            <Text style={styles.count}>{favoriteCount}</Text>
          </>
        )}
      </Pressable>
    );
  },
);

export default CommunityMealFavoriteButton;

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    zIndex: 3,
    minWidth: 58,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(20, 35, 27, 0.84)',
  },
  heart: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 21,
  },
  selectedHeart: {
    color: '#FF6B72',
  },
  count: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
