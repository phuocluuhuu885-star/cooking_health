import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type CommunityMealRatingBadgeProps = {
  averageRating: number;
  reviewCount: number;
};

const CommunityMealRatingBadge = memo(
  ({ averageRating, reviewCount }: CommunityMealRatingBadgeProps) => (
    <View pointerEvents="none" style={styles.badge}>
      <Text style={styles.star}>★</Text>
      <Text style={styles.rating}>
        {reviewCount > 0 ? averageRating.toFixed(1) : 'Mới'}
      </Text>
      <Text style={styles.count}>({reviewCount})</Text>
    </View>
  ),
);

export default CommunityMealRatingBadge;

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 35, 27, 0.82)',
  },
  star: {
    color: '#FFD166',
    fontSize: 13,
  },
  rating: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  count: {
    color: '#E1E9E3',
    fontSize: 11,
    fontWeight: '600',
  },
});
