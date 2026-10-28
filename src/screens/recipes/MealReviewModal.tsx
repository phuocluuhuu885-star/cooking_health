import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { createMealReview, fetchMealReviews } from '../../utils/mealReviewApi';
import type { MyMealReview } from '../../utils/types';
import { createStateSetter } from '../../utils/stateUtils';

const COLORS = {
  white: '#FFFFFF',
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  lightGreen: '#E7F4EC',
  border: '#E5EBE7',
  muted: '#F7FAF8',
  star: '#E89B36',
};

type MealReviewModalProps = {
  mealId: string | null;
  mealName: string;
  token?: string;
  visible: boolean;
  onClose: () => void;
  onSubmitted: (rating: number) => void;
};

const MealReviewModal = ({
  mealId,
  mealName,
  token,
  visible,
  onClose,
  onSubmitted,
}: MealReviewModalProps) => {
  const [state, setState] = useState<{
    rating: number;
    comment: string;
    myReview: MyMealReview | null;
    loading: boolean;
    submitting: boolean;
    error: string;
  }>({
    rating: 0,
    comment: '',
    myReview: null,
    loading: false,
    submitting: false,
    error: '',
  });
  const { rating, comment, myReview, loading, submitting, error } = state;
  const setRating = useMemo(
    () => createStateSetter(setState, 'rating'),
    [setState],
  );
  const setComment = useMemo(
    () => createStateSetter(setState, 'comment'),
    [setState],
  );
  const setMyReview = useMemo(
    () => createStateSetter(setState, 'myReview'),
    [setState],
  );
  const setLoading = useMemo(
    () => createStateSetter(setState, 'loading'),
    [setState],
  );
  const setSubmitting = useMemo(
    () => createStateSetter(setState, 'submitting'),
    [setState],
  );
  const setError = useMemo(
    () => createStateSetter(setState, 'error'),
    [setState],
  );

  useEffect(() => {
    if (!visible || !mealId) {
      return;
    }
    let active = true;
    setRating(0);
    setComment('');
    setMyReview(null);
    setError('');
    if (!token) {
      setLoading(false);
      return () => {
        active = false;
      };
    }
    setLoading(true);
    fetchMealReviews(mealId, token)
      .then(result => {
        if (!active) {
          return;
        }
        setMyReview(result.myReview);
        if (result.myReview) {
          setRating(result.myReview.rating);
          setComment(result.myReview.comment ?? '');
        }
      })
      .catch(loadError => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Không thể kiểm tra đánh giá của bạn.',
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [
    mealId,
    setComment,
    setError,
    setLoading,
    setMyReview,
    setRating,
    token,
    visible,
  ]);

  const submitReview = useCallback(async () => {
    if (!mealId || !token || rating < 1 || rating > 5 || submitting) {
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await createMealReview(mealId, token, rating, comment);
      onSubmitted(rating);
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Không thể gửi đánh giá.',
      );
      try {
        const result = await fetchMealReviews(mealId, token);
        setMyReview(result.myReview);
      } catch (refreshError) {
        console.error(
          'Failed to refresh review status after submission',
          refreshError,
        );
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    comment,
    mealId,
    onClose,
    onSubmitted,
    rating,
    setError,
    setMyReview,
    setSubmitting,
    submitting,
    token,
  ]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng cửa sổ đánh giá"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['#FFFFFF', '#F2F8F4']}
          style={styles.sheet}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>ĐÁNH GIÁ CÔNG THỨC</Text>
              <Text numberOfLines={2} style={styles.title}>
                {mealName}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng"
              onPress={onClose}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.status}>
              <ActivityIndicator color={COLORS.green} />
              <Text style={styles.statusText}>Đang kiểm tra...</Text>
            </View>
          ) : !token ? (
            <View style={styles.messageBox}>
              <Text style={styles.messageTitle}>Cần đăng nhập</Text>
              <Text style={styles.messageText}>
                Đăng nhập để gửi đánh giá cho công thức này.
              </Text>
            </View>
          ) : myReview ? (
            <View style={styles.messageBox}>
              <Text style={styles.messageTitle}>
                Bạn đã đánh giá công thức này
              </Text>
              <Text style={styles.messageText}>
                Mỗi tài khoản chỉ được đánh giá một lần. Đánh giá đã gửi không
                thể chỉnh sửa hoặc xóa.
              </Text>
              <View style={styles.savedRating}>
                <Text style={styles.savedStars}>
                  {'★'.repeat(myReview.rating)}
                  <Text style={styles.unselectedStars}>
                    {'★'.repeat(5 - myReview.rating)}
                  </Text>
                </Text>
                {myReview.comment ? (
                  <Text style={styles.savedComment}>{myReview.comment}</Text>
                ) : null}
              </View>
            </View>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.formContent}
            >
              <Text style={styles.prompt}>
                Bạn đánh giá công thức này thế nào?
              </Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Pressable
                    key={star}
                    accessibilityRole="button"
                    accessibilityLabel={`${star} sao`}
                    accessibilityState={{ selected: rating === star }}
                    disabled={submitting}
                    onPress={() => setRating(star)}
                    style={styles.starButton}
                  >
                    <Text
                      style={[
                        styles.star,
                        star <= rating ? styles.selectedStar : styles.emptyStar,
                      ]}
                    >
                      ★
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.ratingHint}>
                {rating ? `${rating} / 5 sao` : 'Chọn số sao'}
              </Text>
              <TextInput
                accessibilityLabel="Bình luận về công thức"
                editable={!submitting}
                maxLength={1000}
                multiline
                onChangeText={setComment}
                placeholder="Chia sẻ cảm nhận của bạn (không bắt buộc)"
                placeholderTextColor="#8B9991"
                style={styles.commentInput}
                textAlignVertical="top"
                value={comment}
              />
              <Text style={styles.characterCount}>{comment.length}/1000</Text>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Pressable
                accessibilityRole="button"
                disabled={rating === 0 || submitting}
                onPress={submitReview}
                style={[
                  styles.submitButton,
                  (rating === 0 || submitting) && styles.disabledButton,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.submitText}>Gửi đánh giá</Text>
                )}
              </Pressable>
              <Text style={styles.note}>
                Sau khi gửi, bạn không thể chỉnh sửa hoặc xóa đánh giá.
              </Text>
            </ScrollView>
          )}
          {!loading && !myReview && error && !token ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
        </LinearGradient>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(11, 26, 18, 0.45)',
  },
  sheet: {
    maxHeight: '88%',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 26,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  handle: {
    width: 38,
    height: 4,
    alignSelf: 'center',
    borderRadius: 12,
    backgroundColor: '#D9E1DC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 18,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    marginTop: 5,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    borderRadius: 12,
    backgroundColor: COLORS.muted,
  },
  closeText: {
    marginTop: -2,
    color: COLORS.secondary,
    fontSize: 20,
    lineHeight: 24,
  },
  status: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  statusText: {
    marginTop: 9,
    color: COLORS.secondary,
    fontSize: 12,
  },
  messageBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.lightGreen,
  },
  messageTitle: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: '800',
  },
  messageText: {
    marginTop: 6,
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  savedRating: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  savedStars: {
    color: COLORS.star,
    fontSize: 20,
  },
  unselectedStars: {
    color: '#D5DDD8',
  },
  savedComment: {
    marginTop: 8,
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  formContent: {
    paddingBottom: 8,
  },
  prompt: {
    marginTop: 22,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  starButton: {
    paddingHorizontal: 4,
  },
  star: {
    fontSize: 24,
    lineHeight: 28,
  },
  selectedStar: {
    color: COLORS.star,
  },
  emptyStar: {
    color: '#D5DDD8',
  },
  ratingHint: {
    minHeight: 20,
    color: COLORS.secondary,
    fontSize: 12,
    textAlign: 'center',
  },
  commentInput: {
    minHeight: 104,
    marginTop: 18,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: COLORS.muted,
    color: COLORS.text,
    fontSize: 14,
  },
  characterCount: {
    marginTop: 5,
    color: COLORS.secondary,
    fontSize: 12,
    textAlign: 'right',
  },
  errorText: {
    marginTop: 10,
    color: '#A6322A',
    fontSize: 12,
    lineHeight: 18,
  },
  submitButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: COLORS.green,
  },
  submitText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.45,
  },
  note: {
    marginTop: 10,
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});

export default MealReviewModal;
