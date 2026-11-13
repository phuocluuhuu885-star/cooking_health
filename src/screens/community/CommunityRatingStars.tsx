import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type CommunityRatingStarsProps = {
  rating: number;
  interactive?: boolean;
  onSelect?: (rating: number) => void;
};

type RatingStarButtonProps = {
  value: number;
  selected: boolean;
  interactive: boolean;
  onSelect?: (rating: number) => void;
};

const RatingStarButton = memo(
  ({ value, selected, interactive, onSelect }: RatingStarButtonProps) => {
    const handlePress = useCallback(() => {
      onSelect?.(value);
    }, [onSelect, value]);

    const star = (
      <Text style={[styles.star, selected && styles.selectedStar]}>
        {selected ? '★' : '☆'}
      </Text>
    );

    return interactive ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Đánh giá ${value} sao`}
        accessibilityState={{ selected }}
        onPress={handlePress}
        hitSlop={4}
      >
        {star}
      </Pressable>
    ) : (
      star
    );
  },
);

const CommunityRatingStars = memo(
  ({
    rating,
    interactive = false,
    onSelect,
  }: CommunityRatingStarsProps) => {
    const displayedRating = interactive ? rating : Math.round(rating);
    return (
      <View style={styles.container}>
        <RatingStarButton
          value={1}
          selected={displayedRating >= 1}
          interactive={interactive}
          onSelect={onSelect}
        />
        <RatingStarButton
          value={2}
          selected={displayedRating >= 2}
          interactive={interactive}
          onSelect={onSelect}
        />
        <RatingStarButton
          value={3}
          selected={displayedRating >= 3}
          interactive={interactive}
          onSelect={onSelect}
        />
        <RatingStarButton
          value={4}
          selected={displayedRating >= 4}
          interactive={interactive}
          onSelect={onSelect}
        />
        <RatingStarButton
          value={5}
          selected={displayedRating >= 5}
          interactive={interactive}
          onSelect={onSelect}
        />
      </View>
    );
  },
);

export default CommunityRatingStars;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  star: {
    color: '#BBC4BD',
    fontSize: 21,
    lineHeight: 26,
  },
  selectedStar: {
    color: '#E5A900',
  },
});
