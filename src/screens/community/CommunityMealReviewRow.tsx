import React, { memo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { CommunityMealReview } from '../../utils/types/communityMeal';
import CommunityRatingStars from './CommunityRatingStars';

type CommunityMealReviewRowProps = {
  review: CommunityMealReview;
};

const CommunityMealReviewRow = memo(
  ({ review }: CommunityMealReviewRowProps) => (
    <View style={styles.container}>
      <View style={styles.header}>
        {review.userAvatar ? (
          <Image
            source={{ uri: review.userAvatar }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.initial}>
              {review.userName.trim().charAt(0).toLocaleUpperCase() || 'M'}
            </Text>
          </View>
        )}
        <View style={styles.authorInfo}>
          <Text numberOfLines={1} style={styles.name}>
            {review.userName}
          </Text>
          <Text style={styles.date}>
            {new Date(review.createdAt).toLocaleDateString('vi-VN')}
          </Text>
        </View>
        <CommunityRatingStars rating={review.rating} />
      </View>
      <Text style={styles.comment}>
        {review.comment || 'Người dùng đã đánh giá món ăn này.'}
      </Text>
    </View>
  ),
);

export default CommunityMealReviewRow;

const styles = StyleSheet.create({
  container: {
    gap: 9,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5ECE6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8F1EA',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#168653',
    fontSize: 14,
    fontWeight: '800',
  },
  authorInfo: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: '#26392E',
    fontSize: 13,
    fontWeight: '800',
  },
  date: {
    color: '#89958D',
    fontSize: 11,
  },
  comment: {
    color: '#526158',
    fontSize: 13,
    lineHeight: 19,
  },
});
