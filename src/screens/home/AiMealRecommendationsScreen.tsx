import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import apiConst from '../../abase/constant/apiConst';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { navigate } from '../../utils/navigation';
import ScreenKeys from '../../utils/screenKey';
import {
  hasAiRecommendationConsent,
  saveAiRecommendationConsent,
} from '../../utils/aiRecommendationConsent';
import { getUtcDateKey } from '../../utils/dateUtils';
import { getApiError } from '../../utils/homeUtils';
import { setSyncUser, syncApi } from '../../utils/syncUtils';
import type {
  AiMealRecommendationsResponse,
  MealPeriod,
} from '../../utils/types';
import HomeRecipeCard from './homeRecipeCard';
import ScreenHeader from '../component/ScreenHeader';

type ScreenState = {
  recommendations: AiMealRecommendationsResponse['data'] | null;
  loading: boolean;
  error: string;
};

const PERIODS: MealPeriod[] = ['LUNCH', 'DINNER'];

const AiMealRecommendationsScreen = () => {
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUserInfo);
  const requestId = useRef(0);
  const [state, setState] = useState<ScreenState>({
    recommendations: null,
    loading: false,
    error: '',
  });

  const loadRecommendations = useCallback(async () => {
    if (!user?.accessToken || !user.id) {
      setState(previous => ({
        ...previous,
        error: 'Đăng nhập để nhận gợi ý cá nhân hóa.',
      }));
      return;
    }
    if (!user.healthProfile) {
      setState(previous => ({
        ...previous,
        error: 'Hoàn thành hồ sơ sức khỏe để nhận gợi ý cá nhân hóa.',
      }));
      return;
    }

    const currentRequestId = ++requestId.current;
    setSyncUser(user);
    setState(previous => ({ ...previous, loading: true, error: '' }));
    try {
      const response = (await syncApi(apiConst.getAiMealRecommendations, {
        date: getUtcDateKey(new Date()),
        consent: true,
      })) as AiMealRecommendationsResponse;
      if (currentRequestId !== requestId.current) return;
      if (!response?.success || !response.data?.recommendations) {
        setState(previous => ({
          ...previous,
          loading: false,
          error:
            response?.message ||
            response?.ErrorMessage ||
            'Không thể tạo gợi ý AI lúc này.',
        }));
        return;
      }
      setState(previous => ({
        ...previous,
        recommendations: response.data ?? null,
        loading: false,
        error: '',
      }));
    } catch (error) {
      if (currentRequestId === requestId.current) {
        setState(previous => ({
          ...previous,
          loading: false,
          error: getApiError(error, 'Không thể kết nối để tạo gợi ý AI.'),
        }));
      }
    }
  }, [user]);

  const requestRecommendations = useCallback(() => {
    if (!user?.accessToken || !user.id) {
      setState(previous => ({
        ...previous,
        error: 'Đăng nhập để nhận gợi ý cá nhân hóa.',
      }));
      return;
    }
    if (!user.healthProfile) {
      setState(previous => ({
        ...previous,
        error: 'Hoàn thành hồ sơ sức khỏe để nhận gợi ý cá nhân hóa.',
      }));
      return;
    }
    if (user.healthProfile.age < 18 || hasAiRecommendationConsent(user.id)) {
      loadRecommendations();
      return;
    }
    setState(previous => ({
      ...previous,
      recommendations: null,
      loading: false,
    }));
    Alert.alert(
      'Đồng ý dùng gợi ý AI?',
      'Nếu tiếp tục, MealCraft sẽ gửi mục tiêu kcal và dinh dưỡng, tổng món đã ăn hôm nay cùng thông tin các món phù hợp đến Google Gemini để xếp hạng. Không gửi tên, email, mã tài khoản, tuổi, giới tính, chiều cao, cân nặng hoặc BMI. Bạn có thể từ chối và vẫn xem gợi ý món thông thường.',
      [
        { text: 'Để sau', style: 'cancel' },
        {
          text: 'Đồng ý và tiếp tục',
          onPress: () => {
            saveAiRecommendationConsent(user.id, true);
            loadRecommendations();
          },
        },
      ],
    );
  }, [loadRecommendations, user]);

  useFocusEffect(
    useCallback(() => {
      requestRecommendations();
      return () => {
        requestId.current += 1;
      };
    }, [requestRecommendations]),
  );

  const openRecipe = useCallback((mealId: string) => {
    navigate(ScreenKeys.RECIPE_DETAIL, { mealId });
  }, []);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        eyebrow="MEALCRAFT AI COACH"
        title="Gợi ý món ăn bằng AI"
        rightAction={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Làm mới gợi ý"
            disabled={state.loading}
            onPress={requestRecommendations}
            style={[styles.refreshButton, state.loading && styles.disabled]}
          >
            {state.loading ? (
              <ActivityIndicator color={COLORS.green} />
            ) : (
              <Text style={styles.refreshText}>↻</Text>
            )}
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {state.error ? (
          <LinearGradient colors={['#FFFFFF', '#F3FAF5']} style={styles.card}>
            <Text style={styles.error}>{state.error}</Text>
            <Pressable
              accessibilityRole="button"
              disabled={state.loading}
              onPress={requestRecommendations}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          </LinearGradient>
        ) : state.loading ? (
          <LinearGradient
            colors={['#FFFFFF', '#F3FAF5']}
            style={styles.loadingCard}
          >
            <ActivityIndicator color={COLORS.green} />
            <Text style={styles.emptyText}>
              Đang so khớp món trong thư viện với mục tiêu dinh dưỡng...
            </Text>
          </LinearGradient>
        ) : state.recommendations ? (
          <LinearGradient colors={['#FFFFFF', '#F3FAF5']} style={styles.card}>
            <Text style={styles.status}>
              Còn khoảng {Math.round(state.recommendations.remaining.calories)}{' '}
              kcal · Đạm {Math.round(state.recommendations.remaining.proteinG)}{' '}
              g{' · '}
              Tinh bột {Math.round(state.recommendations.remaining.carbsG)} g
              {' · '}
              Béo {Math.round(state.recommendations.remaining.fatG)} g
            </Text>
            {state.recommendations.unavailableNutritionItems > 0 ? (
              <Text style={styles.note}>
                Một số món đã ăn chưa có dữ liệu dinh dưỡng, nên chưa được tính
                vào phần còn lại.
              </Text>
            ) : null}
            {PERIODS.map((period, index) => {
              const recommendations =
                state.recommendations?.recommendations[period] ?? [];
              return (
                <View key={period} style={index > 0 && styles.periodSection}>
                  <Text style={styles.periodTitle}>
                    {period === 'LUNCH' ? 'Bữa trưa' : 'Bữa tối'}
                  </Text>
                  {recommendations.length ? (
                    recommendations.map(recommendation => (
                      <HomeRecipeCard
                        key={recommendation.meal.id}
                        meal={recommendation.meal}
                        onPress={openRecipe}
                        recommendationReason={
                          recommendation.recommendationReason
                        }
                        recommendedServings={recommendation.recommendedServings}
                        estimatedPrice={recommendation.estimatedPrice}
                      />
                    ))
                  ) : (
                    <Text style={styles.emptyText}>
                      {state.recommendations?.consumedPeriods.includes(period)
                        ? 'Đã ghi nhận bữa này.'
                        : 'Chưa có món trong thư viện phù hợp với lượng dinh dưỡng còn lại.'}
                    </Text>
                  )}
                </View>
              );
            })}
          </LinearGradient>
        ) : (
          <LinearGradient colors={['#FFFFFF', '#F3FAF5']} style={styles.card}>
            <Text style={styles.emptyText}>
              Gợi ý bữa ăn sẽ xuất hiện tại đây.
            </Text>
          </LinearGradient>
        )}
        <Text style={styles.disclaimer}>
          Gợi ý dinh dưỡng chỉ mang tính tham khảo, không phải tư vấn y tế.
        </Text>
      </ScrollView>
    </View>
  );
};

export default AiMealRecommendationsScreen;

const COLORS = {
  background: '#F5F7F5',
  white: '#FFFFFF',
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  border: '#E5EBE7',
  danger: '#B42318',
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 8,
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 42,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  backText: {
    color: COLORS.green,
    fontSize: 34,
    lineHeight: 38,
    textAlign: 'center',
  },
  headerCopy: {},
  eyebrow: {
    color: COLORS.green,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: { marginTop: 2, color: COLORS.text, fontSize: 18, fontWeight: '800' },
  subtitle: { marginTop: 3, color: COLORS.secondary, fontSize: 10 },
  refreshButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  refreshText: { color: COLORS.green, fontSize: 27, lineHeight: 31 },
  disabled: { opacity: 0.55 },
  content: { paddingTop: 8 },
  card: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loadingCard: {
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  status: {
    marginBottom: 8,
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '800',
  },
  nutritionSummary: {
    marginBottom: 10,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 15,
  },
  note: {
    marginBottom: 8,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 15,
  },
  periodSection: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  periodTitle: {
    marginBottom: 8,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  emptyText: { color: COLORS.secondary, fontSize: 11, lineHeight: 16 },
  error: { color: COLORS.danger, fontSize: 12, lineHeight: 18 },
  retryButton: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 5 },
  retryText: { color: COLORS.green, fontSize: 11, fontWeight: '800' },
  disclaimer: {
    paddingVertical: 8,
    color: COLORS.secondary,
    fontSize: 10,
    textAlign: 'center',
  },
});
