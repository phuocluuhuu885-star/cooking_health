import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { selectUserInfo } from '../../reduxs/reduces/user';
import type {
  MealReview,
  MealReviewsResponse,
  MealReviewScreenProps,
} from '../../utils/types';
import { fetchMealReviews } from '../../utils/mealReviewApi';
import { goBack } from '../../utils/navigation';
import MealReviewModal from './MealReviewModal';
import { createStateSetter } from '../../utils/stateUtils';

const COLORS = {
  background: '#F5F7F5',
  white: '#FFFFFF',
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  lightGreen: '#E7F4EC',
  border: '#E5EBE7',
  muted: '#F7FAF8',
  star: '#E89B36',
};

type ReviewData = NonNullable<MealReviewsResponse['data']>;

const MealReviewsScreen = ({ route }: MealReviewScreenProps) => {
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUserInfo);
  const { mealId, mealName } = route.params;
  const [state, setState] = useState<{
    data: ReviewData | null;
    loading: boolean;
    loadingMore: boolean;
    error: string;
    ratingModalVisible: boolean;
    refreshIndex: number;
  }>({
    data: null,
    loading: true,
    loadingMore: false,
    error: '',
    ratingModalVisible: false,
    refreshIndex: 0,
  });
  const { data, loading, loadingMore, error, ratingModalVisible, refreshIndex } =
    state;
  const setData = useMemo(() => createStateSetter(setState, 'data'), [setState]);
  const setLoading = useMemo(
    () => createStateSetter(setState, 'loading'),
    [setState],
  );
  const setLoadingMore = useMemo(
    () => createStateSetter(setState, 'loadingMore'),
    [setState],
  );
  const setError = useMemo(
    () => createStateSetter(setState, 'error'),
    [setState],
  );
  const setRatingModalVisible = useMemo(
    () => createStateSetter(setState, 'ratingModalVisible'),
    [setState],
  );
  const setRefreshIndex = useMemo(
    () => createStateSetter(setState, 'refreshIndex'),
    [setState],
  );

  const loadReviews = useCallback(
    async (offset = 0, append = false) => {
      if (offset === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError('');
      try {
        const result = await fetchMealReviews(
          mealId,
          user?.accessToken,
          offset,
        );
        setData(previous =>
          append && previous
            ? { ...result, reviews: [...previous.reviews, ...result.reviews] }
            : result,
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Không thể tải đánh giá.',
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [
      mealId,
      setData,
      setError,
      setLoading,
      setLoadingMore,
      user?.accessToken,
    ],
  );

  useEffect(() => {
    loadReviews();
  }, [loadReviews, refreshIndex]);

  const renderStars = (value: number) => (
    <Text style={styles.stars}>
      {'★'.repeat(Math.max(0, Math.min(5, Math.round(value))))}
      <Text style={styles.emptyStars}>
        {'★'.repeat(5 - Math.max(0, Math.min(5, Math.round(value))))}
      </Text>
    </Text>
  );

  const handleReviewSubmitted = useCallback(() => {
    setRatingModalVisible(false);
    setRefreshIndex(previous => previous + 1);
  }, [setRatingModalVisible, setRefreshIndex]);

  const renderReview = (review: MealReview) => (
    <View key={review.id} style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerAvatar}>
          <Text style={styles.reviewerInitial}>
            {review.userName.trim().charAt(0).toLocaleUpperCase() || 'M'}
          </Text>
        </View>
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>{review.userName}</Text>
          <Text style={styles.reviewDate}>
            {new Date(review.createdAt).toLocaleDateString('vi-VN')}
          </Text>
        </View>
        {renderStars(review.rating)}
      </View>
      {review.comment ? (
        <Text style={styles.reviewComment}>{review.comment}</Text>
      ) : (
        <Text style={styles.noComment}>Không có bình luận</Text>
      )}
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại công thức"
          onPress={goBack}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>CÔNG THỨC</Text>
          <Text numberOfLines={1} style={styles.headerTitle}>
            Đánh giá
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F2F8F4']}
          style={styles.mealCard}
        >
          <Text style={styles.mealEyebrow}>ĐÁNH GIÁ CÔNG THỨC</Text>
          <Text style={styles.mealName}>{mealName}</Text>
          {!loading && data ? (
            <LinearGradient
              colors={['#F2F8F4', '#E7F4EC']}
              style={styles.summary}
            >
              <Text style={styles.average}>
                {data.averageRating.toFixed(1)}
              </Text>
              <View>
                {renderStars(data.averageRating)}
                <Text style={styles.total}>{data.total} đánh giá</Text>
              </View>
            </LinearGradient>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => setRatingModalVisible(true)}
            style={styles.rateButton}
          >
            <Text style={styles.rateButtonText}>
              {data?.myReview ? 'Đã đánh giá' : 'Đánh giá công thức'}
            </Text>
          </Pressable>
          {data?.myReview ? (
            <Text style={styles.lockedNote}>
              Bạn đã đánh giá công thức này. Đánh giá không thể chỉnh sửa hoặc
              xóa.
            </Text>
          ) : null}
        </LinearGradient>

        {loading ? (
          <View style={styles.status}>
            <ActivityIndicator color={COLORS.green} />
            <Text style={styles.statusText}>Đang tải đánh giá...</Text>
          </View>
        ) : error ? (
          <View style={styles.statusCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => loadReviews()}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : (
          <LinearGradient
            colors={['#FFFFFF', '#F2F8F4']}
            style={styles.reviewList}
          >
            <Text style={styles.listTitle}>Nhận xét</Text>
            {data?.reviews.length ? (
              data.reviews.map(renderReview)
            ) : (
              <Text style={styles.emptyText}>
                Chưa có đánh giá nào. Hãy chia sẻ cảm nhận về công thức.
              </Text>
            )}
            {data?.hasMore ? (
              <Pressable
                accessibilityRole="button"
                disabled={loadingMore}
                onPress={() => loadReviews(data.reviews.length, true)}
                style={styles.loadMoreButton}
              >
                {loadingMore ? (
                  <ActivityIndicator color={COLORS.green} />
                ) : (
                  <Text style={styles.loadMoreText}>Xem thêm đánh giá</Text>
                )}
              </Pressable>
            ) : null}
          </LinearGradient>
        )}
      </ScrollView>

      <MealReviewModal
        mealId={mealId}
        mealName={mealName}
        token={user?.accessToken}
        visible={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        onSubmitted={handleReviewSubmitted}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.muted,
  },
  backText: {
    marginTop: -5,
    color: COLORS.text,
    fontSize: 24,
    lineHeight: 28,
  },
  headerCopy: {
    flex: 1,
    marginLeft: 12,
  },
  eyebrow: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  headerTitle: {
    marginTop: 2,
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '800',
  },
  content: {
    padding: 16,
  },
  mealCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  mealEyebrow: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  mealName: {
    marginTop: 5,
    color: COLORS.text,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  average: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  stars: {
    color: COLORS.star,
    fontSize: 22,
    lineHeight: 26,
  },
  emptyStars: {
    color: '#D5DDD8',
  },
  total: {
    marginTop: 2,
    color: COLORS.secondary,
    fontSize: 12,
  },
  rateButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 13,
    borderRadius: 12,
    backgroundColor: COLORS.green,
  },
  rateButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  lockedNote: {
    marginTop: 9,
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  status: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  statusText: {
    marginTop: 8,
    color: COLORS.secondary,
    fontSize: 12,
  },
  statusCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },
  errorText: {
    color: '#A6322A',
    fontSize: 12,
    lineHeight: 18,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  retryText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '700',
  },
  reviewList: {
    marginTop: 18,
    paddingHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  listTitle: {
    paddingTop: 16,
    paddingBottom: 3,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  reviewItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerAvatar: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.lightGreen,
  },
  reviewerInitial: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
  },
  reviewerInfo: {
    flex: 1,
    marginLeft: 9,
  },
  reviewerName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  reviewDate: {
    marginTop: 2,
    color: COLORS.secondary,
    fontSize: 12,
  },
  reviewComment: {
    marginTop: 10,
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  noComment: {
    marginTop: 10,
    color: COLORS.secondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  emptyText: {
    paddingVertical: 20,
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  loadMoreText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '700',
  },
});

export default MealReviewsScreen;
