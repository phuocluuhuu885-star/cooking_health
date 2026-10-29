import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { AppImage } from '../../abase/component';
import ScreenHeader from '../component/ScreenHeader';
import apiConst from '../../abase/constant/apiConst';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { navigate } from '../../utils/navigation';
import ScreenKeys from '../../utils/screenKey';
import { formatNumberWithOptionalDecimal } from '../../utils/numberUtils';
import { setSyncUser, syncApi } from '../../utils/syncUtils';
import type { MealPeriod, MealPlanResponse } from '../../utils/types';
import type { RootStackParamList } from '../../utils/types/navigation';

type Props = StackScreenProps<
  RootStackParamList,
  typeof ScreenKeys.DAILY_PLANNED_MEALS
>;
type Period = {
  key: MealPeriod;
  title: string;
};

const PERIODS: Period[] = [
  { key: 'LUNCH', title: 'Bữa trưa' },
  { key: 'DINNER', title: 'Bữa tối' },
];
const formatDate = (date: string) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

const DailyPlannedMealsScreen = ({ route }: Props) => {
  const { date } = route.params;
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUserInfo);
  const requestId = useRef(0);
  const [state, setState] = useState<{
    data: MealPlanResponse['data'] | null;
    loading: boolean;
    error: string;
  }>({ data: null, loading: true, error: '' });

  const loadMeals = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    if (!user?.accessToken) {
      setState({
        data: null,
        loading: false,
        error: 'Đăng nhập để xem thực đơn trong ngày.',
      });
      return;
    }

    setSyncUser(user);
    setState(previous => ({ ...previous, loading: true, error: '' }));
    try {
      const response = await syncApi(apiConst.getMealPlan, {
        date,
      });
      if (currentRequestId !== requestId.current) return;
      if (!response?.success || !response.data?.meals) {
        console.error(
          response?.message || 'Không thể tải danh sách món trong ngày.',
        );
      }
      setState({ data: response.data, loading: false, error: '' });
    } catch (error) {
      if (currentRequestId === requestId.current) {
        console.error('Failed to load daily planned meals', error);
        setState({
          data: null,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : 'Không thể tải danh sách món trong ngày.',
        });
      }
    }
  }, [date, user]);

  useFocusEffect(
    useCallback(() => {
      loadMeals();
      return () => {
        requestId.current += 1;
      };
    }, [loadMeals]),
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader
        eyebrow="THỰC ĐƠN CÁ NHÂN"
        title="Món trong ngày"
        subtitle={formatDate(date)}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {state.loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.green} />
            <Text style={styles.empty}>Đang tải thực đơn ngày này...</Text>
          </View>
        ) : state.error ? (
          <LinearGradient colors={['#FFFFFF', '#F3FAF5']} style={styles.card}>
            <Text style={styles.error}>{state.error}</Text>
            <Pressable onPress={loadMeals} style={styles.retryButton}>
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          </LinearGradient>
        ) : (
          PERIODS.map(period => {
            const meals = state.data?.meals[period.key].items ?? [];
            return (
              <LinearGradient
                key={period.key}
                colors={['#FFFFFF', '#F3FAF5']}
                style={styles.card}
              >
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{period.title}</Text>
                  <Text style={styles.count}>{meals.length} món</Text>
                </View>
                {meals.length ? (
                  meals.map(item => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Xem món ${item.meal.name}`}
                      onPress={() =>
                        navigate(ScreenKeys.RECIPE_DETAIL, {
                          mealId: item.meal.id,
                        })
                      }
                      style={styles.mealRow}
                    >
                      {item.meal.imageUrl ? (
                        <AppImage
                          source={{ uri: item.meal.imageUrl }}
                          style={styles.mealImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.mealImage, styles.imageFallback]}>
                          <Text style={styles.fallbackText}>MealCraft</Text>
                        </View>
                      )}
                      <View style={styles.mealCopy}>
                        <Text numberOfLines={2} style={styles.mealName}>
                          {item.meal.name}
                        </Text>
                        <Text style={styles.mealMeta}>
                          {formatNumberWithOptionalDecimal(item.servings)} khẩu
                          phần
                          {item.nutritionSummary?.total
                            ? ` · ${Math.round(
                                item.nutritionSummary.total.calories,
                              )} kcal`
                            : ''}
                        </Text>
                        {item.isConsumed ? (
                          <Text style={styles.consumed}>Đã ghi nhận</Text>
                        ) : null}
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.empty}>
                    Chưa có món nào được lên lịch.
                  </Text>
                )}
              </LinearGradient>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

export default DailyPlannedMealsScreen;

const COLORS = {
  background: '#F5F7F5',
  white: '#FFFFFF',
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  lightGreen: '#E7F4EC',
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
  },
  backButton: {
    width: 40,
    height: 42,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },
  backText: {
    color: COLORS.green,
    fontSize: 34,
    lineHeight: 38,
    textAlign: 'center',
  },
  headerCopy: { flex: 1 },
  eyebrow: {
    color: COLORS.green,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: { marginTop: 2, color: COLORS.text, fontSize: 19, fontWeight: '800' },
  subtitle: { marginTop: 3, color: COLORS.secondary, fontSize: 11 },
  content: { paddingTop: 8 },
  loading: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  card: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  count: { color: COLORS.green, fontSize: 11, fontWeight: '700' },
  mealRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  mealImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: COLORS.lightGreen,
  },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  fallbackText: { color: COLORS.green, fontSize: 10, fontWeight: '800' },
  mealCopy: { flex: 1 },
  mealName: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  mealMeta: { marginTop: 4, color: COLORS.secondary, fontSize: 10 },
  consumed: {
    marginTop: 4,
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '700',
  },
  chevron: { color: COLORS.green, fontSize: 22 },
  empty: { color: COLORS.secondary, fontSize: 11, lineHeight: 17 },
  error: { color: COLORS.danger, fontSize: 12, lineHeight: 18 },
  retryButton: { alignSelf: 'flex-start', marginTop: 9 },
  retryText: { color: COLORS.green, fontSize: 11, fontWeight: '800' },
});
