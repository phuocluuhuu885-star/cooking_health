import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { UserInfo } from '../../type/user';
import {
  fetchCommunityMealReviews,
  submitCommunityMealReview,
} from '../../utils/communityMealApi';
import type { CommunityMealReview } from '../../utils/types/communityMeal';
import CommunityRatingStars from './CommunityRatingStars';
import CommunityMealReviewRow from './CommunityMealReviewRow';

type CommunityMealReviewsProps = {
  mealId: string;
  creatorId: string;
  user: UserInfo | null;
  onSummaryChange?: (averageRating: number, total: number) => void;
};

const CommunityMealReviews = ({
  mealId,
  creatorId,
  user,
  onSummaryChange,
}: CommunityMealReviewsProps) => {
  const [reviews, setReviews] = useState<CommunityMealReview[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [total, setTotal] = useState(0);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadReviews = useCallback(async () => {
    if (!user?.accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetchCommunityMealReviews(user, mealId);
      if (!response?.success || !response.data) {
        throw new Error(response?.message || 'Không thể tải đánh giá.');
      }
      setReviews(response.data.reviews);
      setAverageRating(response.data.averageRating);
      setTotal(response.data.total);
      setHasMore(response.data.hasMore);
      onSummaryChange?.(response.data.averageRating, response.data.total);
      setRating(response.data.myReview?.rating ?? 0);
      setComment(response.data.myReview?.comment ?? '');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Không thể tải đánh giá.',
      );
    } finally {
      setLoading(false);
    }
  }, [mealId, onSummaryChange, user]);

  const handleLoadMoreReviews = useCallback(async () => {
    if (!user || loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError('');
    try {
      const response = await fetchCommunityMealReviews(
        user,
        mealId,
        reviews.length,
      );
      if (!response?.success || !response.data) {
        throw new Error(response?.message || 'Không thể tải thêm đánh giá.');
      }
      setReviews(current => [...current, ...response.data!.reviews]);
      setAverageRating(response.data.averageRating);
      setTotal(response.data.total);
      setHasMore(response.data.hasMore);
      onSummaryChange?.(response.data.averageRating, response.data.total);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Không thể tải thêm đánh giá.',
      );
    } finally {
      setLoadingMore(false);
    }
  }, [
    hasMore,
    loading,
    loadingMore,
    mealId,
    onSummaryChange,
    reviews.length,
    user,
  ]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleSelectRating = useCallback((value: number) => {
    setRating(value);
  }, []);

  const handleCommentChange = useCallback((value: string) => {
    setComment(value);
  }, []);

  const handleSubmitReview = useCallback(async () => {
    if (!user || rating < 1 || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await submitCommunityMealReview(
        user,
        mealId,
        rating,
        comment.trim(),
      );
      if (!response?.success) {
        throw new Error(response?.message || 'Không thể gửi đánh giá.');
      }
      await loadReviews();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Không thể gửi đánh giá.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [comment, loadReviews, mealId, rating, submitting, user]);

  const renderReview = useCallback(
    (review: CommunityMealReview) => (
      <CommunityMealReviewRow key={review.id} review={review} />
    ),
    [],
  );

  const isOwner = user?.id === creatorId;
  const renderRatingForm = Boolean(user?.accessToken && !isOwner);

  const ratingSummary = loading ? (
    <ActivityIndicator color="#168653" />
  ) : (
    <View style={styles.summary}>
      <Text style={styles.average}>{averageRating.toFixed(1)}</Text>
      <View>
        <CommunityRatingStars rating={averageRating} />
      </View>
    </View>
  );

  const reviewForm = renderRatingForm ? (
    <View style={styles.reviewForm}>
      <Text style={styles.formTitle}>
        {rating ? 'Đánh giá của bạn' : 'Bạn thấy món này thế nào?'}
      </Text>
      <CommunityRatingStars
        rating={rating}
        interactive
        onSelect={handleSelectRating}
      />
      <TextInput
        value={comment}
        onChangeText={handleCommentChange}
        maxLength={1000}
        multiline
        placeholder="Viết nhận xét (không bắt buộc)"
        placeholderTextColor="#8A9790"
        style={styles.commentInput}
        textAlignVertical="top"
      />
      <Pressable
        accessibilityRole="button"
        disabled={rating < 1 || submitting}
        onPress={handleSubmitReview}
        style={[
          styles.submitButton,
          (rating < 1 || submitting) && styles.disabledButton,
        ]}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitText}>
            {rating ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
          </Text>
        )}
      </Pressable>
    </View>
  ) : isOwner ? (
    <Text style={styles.ownerMessage}>Đây là món bạn đã chia sẻ.</Text>
  ) : null;

  const emptyReviews = (
    <Text style={styles.empty}>
      Chưa có đánh giá. Hãy là người đầu tiên chia sẻ cảm nhận.
    </Text>
  );

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Đánh giá từ người dùng ({total})</Text>
      {ratingSummary}
      {reviewForm}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? null : reviews.length > 0 ? reviews.map(renderReview) : emptyReviews}
      {!loading && hasMore ? (
        <Pressable
          accessibilityRole="button"
          disabled={loadingMore}
          onPress={handleLoadMoreReviews}
          style={styles.loadMoreButton}
        >
          {loadingMore ? (
            <ActivityIndicator color="#168653" />
          ) : (
            <Text style={styles.loadMoreText}>Tải thêm đánh giá</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
};

export default CommunityMealReviews;

const styles = StyleSheet.create({
  section: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6ECE7',
  },
  title: {
    marginBottom: 12,
    color: '#172B23',
    fontSize: 16,
    fontWeight: '800',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F1F7F2',
  },
  average: {
    color: '#244C36',
    fontSize: 28,
    fontWeight: '800',
  },
  reviewForm: {
    gap: 9,
    marginTop: 14,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5ECE6',
  },
  formTitle: {
    color: '#34483B',
    fontSize: 13,
    fontWeight: '800',
  },
  commentInput: {
    minHeight: 76,
    padding: 11,
    borderWidth: 1,
    borderColor: '#DCE6DE',
    borderRadius: 10,
    color: '#172B23',
    fontSize: 13,
  },
  submitButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#168653',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.5,
  },
  ownerMessage: {
    marginTop: 4,
    color: '#748078',
    fontSize: 12,
  },
  empty: {
    paddingTop: 14,
    color: '#748078',
    fontSize: 12,
    lineHeight: 18,
  },
  error: {
    marginTop: 8,
    color: '#B43C35',
    fontSize: 12,
  },
  loadMoreButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: '#E6F3E9',
  },
  loadMoreText: {
    color: '#168653',
    fontSize: 13,
    fontWeight: '800',
  },
});
