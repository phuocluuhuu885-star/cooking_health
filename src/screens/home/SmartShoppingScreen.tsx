import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import ScreenHeader from '../component/ScreenHeader';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { navigate } from '../../utils/navigation';
import { getUtcDateKey } from '../../utils/dateUtils';
import { aggregateMealIngredients } from '../../utils/homeUtils';
import { formatNumberWithOptionalDecimal } from '../../utils/numberUtils';
import { localStorage } from '../../utils/storage';
import ScreenKeys from '../../utils/screenKey';
import { setSyncUser, syncApi } from '../../utils/syncUtils';
import type {
  HomeAggregatedIngredient,
  MealPlanResponse,
  RecipeDetailMeal,
  RecipeDetailResponse,
} from '../../utils/types';

type PlannedMealRef = {
  id: string;
  name: string;
  servings: number;
};

type ScreenState = {
  ingredients: HomeAggregatedIngredient[];
  plannedMeals: number;
  checked: Record<string, boolean>;
  loading: boolean;
  error: string;
};

const getNextDates = () => {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + index);
    return getUtcDateKey(date);
  });
};
const formatAmount = (amountG: number) =>
  amountG >= 1000
    ? `${formatNumberWithOptionalDecimal(amountG / 1000)} kg`
    : `${formatNumberWithOptionalDecimal(amountG)} g`;
const formatWeekday = (date: string) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString('vi-VN', {
    weekday: 'short',
    timeZone: 'UTC',
  });
const getDayOfMonth = (date: string) => date.slice(8, 10);

const SmartShoppingScreen = () => {
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUserInfo);
  const requestId = useRef(0);
  const dates = useMemo(() => getNextDates(), []);
  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [state, setState] = useState<ScreenState>({
    ingredients: [],
    plannedMeals: 0,
    checked: {},
    loading: true,
    error: '',
  });

  const loadIngredients = useCallback(
    async (date: string) => {
      const currentRequestId = ++requestId.current;
      if (!user?.accessToken) {
        setState(previous => ({
          ...previous,
          loading: false,
          error: 'Đăng nhập để tổng hợp nguyên liệu từ thực đơn.',
        }));
        return;
      }
      setSyncUser(user);
      setState(previous => ({
        ...previous,
        loading: true,
        error: '',
        checked: {},
      }));

      try {
        const response = (await syncApi(apiConst.getMealPlan, {
          date,
        })) as MealPlanResponse;
        if (!response?.success || !response.data?.meals) {
          throw new Error(
            response?.message || `Không thể tải thực đơn ngày ${date}.`,
          );
        }
        if (currentRequestId !== requestId.current) return;
        const plannedMeals: PlannedMealRef[] = [
          ...response.data.meals.LUNCH.items,
          ...response.data.meals.DINNER.items,
        ]
          .filter(item => !item.isConsumed)
          .map(item => ({
            id: item.meal.id,
            name: item.meal.name,
            servings: item.servings,
          }));
        if (plannedMeals.length === 0) {
          setState(previous => ({
            ...previous,
            ingredients: [],
            plannedMeals: 0,
            checked: {},
            loading: false,
            error: '',
          }));
          return;
        }

        const details: RecipeDetailMeal[] = [];
        for (let index = 0; index < plannedMeals.length; index += 5) {
          const batch = plannedMeals.slice(index, index + 5);
          const results = await Promise.all(
            batch.map(async item => {
              const detailResponse = (await syncApi(apiConst.getMealDetail, {
                id: item.id,
                servings: item.servings,
              })) as RecipeDetailResponse;
              if (!detailResponse?.success || !detailResponse.data) {
                throw new Error(
                  detailResponse?.message ||
                    `Không thể lấy nguyên liệu của món ${item.name}.`,
                );
              }
              return detailResponse.data;
            }),
          );
          details.push(...results);
          if (currentRequestId !== requestId.current) return;
        }
        const ingredients = aggregateMealIngredients(details);
        const checked = Object.fromEntries(
          ingredients.map(ingredient => [
            ingredient.name,
            localStorage.getBoolean(
              `smart-shopping:${user.id}:${date}:${ingredient.name}`,
            ) === true,
          ]),
        );
        setState(previous => ({
          ...previous,
          ingredients,
          plannedMeals: plannedMeals.length,
          checked,
          loading: false,
          error: '',
        }));
      } catch (error) {
        if (currentRequestId === requestId.current) {
          console.error(
            'Failed to aggregate smart shopping ingredients',
            error,
          );
          setState(previous => ({
            ...previous,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : 'Không thể tổng hợp nguyên liệu.',
          }));
        }
      }
    },
    [user],
  );

  useFocusEffect(
    useCallback(() => {
      loadIngredients(selectedDate);
      return () => {
        requestId.current += 1;
      };
    }, [loadIngredients, selectedDate]),
  );

  const toggleIngredient = useCallback(
    (name: string) => {
      if (!user?.id) return;
      setState(previous => {
        const checked = !previous.checked[name];
        localStorage.set(
          `smart-shopping:${user.id}:${selectedDate}:${name}`,
          checked,
        );
        return {
          ...previous,
          checked: {
            ...previous.checked,
            [name]: checked,
          },
        };
      });
    },
    [selectedDate, user?.id],
  );
  const checkedCount = Object.values(state.checked).filter(Boolean).length;

  return (
    <View style={styles.screen}>
      <ScreenHeader eyebrow="MEALCRAFT AI COACH" title="Đi chợ thông minh" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateList}
        >
          {dates.map(date => {
            const selected = date === selectedDate;
            return (
              <Pressable
                key={date}
                accessibilityRole="button"
                accessibilityLabel={`${formatWeekday(date)} ${getDayOfMonth(
                  date,
                )}`}
                accessibilityState={{ selected }}
                onPress={() => setSelectedDate(date)}
                style={[
                  styles.dateButton,
                  selected && styles.dateButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.dateWeekday,
                    selected && styles.dateTextSelected,
                  ]}
                >
                  {formatWeekday(date)}
                </Text>
                <Text
                  style={[
                    styles.dateNumber,
                    selected && styles.dateTextSelected,
                  ]}
                >
                  {getDayOfMonth(date)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            navigate(ScreenKeys.DAILY_PLANNED_MEALS, { date: selectedDate })
          }
          style={styles.mealListButton}
        >
          <Text style={styles.mealListButtonText}>
            Xem danh sách món ngày {formatWeekday(selectedDate)}{' '}
            {getDayOfMonth(selectedDate)}
          </Text>
          <Text style={styles.mealListChevron}>›</Text>
        </Pressable>
        {state.loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.green} />
            <Text style={styles.empty}>
              Đang lấy nguyên liệu cho ngày {getDayOfMonth(selectedDate)}...
            </Text>
          </View>
        ) : state.error ? (
          <LinearGradient colors={['#FFFFFF', '#F3FAF5']} style={styles.card}>
            <Text style={styles.error}>{state.error}</Text>
            <Pressable
              onPress={() => loadIngredients(selectedDate)}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          </LinearGradient>
        ) : state.ingredients.length === 0 ? (
          <LinearGradient colors={['#FFFFFF', '#F3FAF5']} style={styles.card}>
            <Text style={styles.empty}>
              Ngày {formatWeekday(selectedDate)} {getDayOfMonth(selectedDate)}{' '}
              chưa có món nào trong thực đơn để tổng hợp nguyên liệu.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigate(ScreenKeys.WEEKLY_MEAL_PLAN)}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Lên thực đơn 7 ngày</Text>
            </Pressable>
          </LinearGradient>
        ) : (
          <>
            <LinearGradient
              colors={['#FFFFFF', '#EAF6EE']}
              style={styles.summaryCard}
            >
              <Text style={styles.summaryTitle}>
                Nguyên liệu ngày {formatWeekday(selectedDate)}{' '}
                {getDayOfMonth(selectedDate)}
              </Text>
              <Text style={styles.summaryText}>
                {state.ingredients.length} nguyên liệu · từ {state.plannedMeals}{' '}
                món ăn
              </Text>
            </LinearGradient>
            <LinearGradient colors={['#FFFFFF', '#F3FAF5']} style={styles.card}>
              <View style={styles.listHeader}>
                <Text style={styles.cardTitle}>Cần mua</Text>
                <Text style={styles.progress}>
                  {checkedCount}/{state.ingredients.length}
                </Text>
              </View>
              {state.ingredients.map(ingredient => {
                const checked = Boolean(state.checked[ingredient.name]);
                return (
                  <Pressable
                    key={ingredient.name}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    onPress={() => toggleIngredient(ingredient.name)}
                    style={styles.ingredientRow}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        checked && styles.checkboxChecked,
                      ]}
                    >
                      {checked ? <Text style={styles.checkmark}>✓</Text> : null}
                    </View>
                    <Text
                      style={[
                        styles.ingredientName,
                        checked && styles.ingredientDone,
                      ]}
                    >
                      {ingredient.name}
                    </Text>
                    <Text style={styles.amount}>
                      {formatAmount(ingredient.amountG)}
                    </Text>
                  </Pressable>
                );
              })}
            </LinearGradient>
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default SmartShoppingScreen;

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
  dateList: {
    gap: 8,
    paddingBottom: 12,
  },
  dateButton: {
    width: 58,
    minHeight: 66,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  dateButtonSelected: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.green,
  },
  dateWeekday: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateNumber: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  dateTextSelected: { color: COLORS.white },
  mealListButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  mealListButtonText: { color: COLORS.green, fontSize: 11, fontWeight: '700' },
  mealListChevron: { color: COLORS.green, fontSize: 21, fontWeight: '700' },
  loading: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  summaryCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryTitle: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  summaryText: {
    marginTop: 6,
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '700',
  },
  summaryHint: {
    marginTop: 5,
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 15,
  },
  card: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  progress: { color: COLORS.green, fontSize: 11, fontWeight: '800' },
  ingredientRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  checkbox: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  checkboxChecked: { borderColor: COLORS.green, backgroundColor: COLORS.green },
  checkmark: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  ingredientName: {
    flex: 1,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  ingredientDone: {
    color: COLORS.secondary,
    textDecorationLine: 'line-through',
  },
  amount: { color: COLORS.secondary, fontSize: 11, fontWeight: '700' },
  empty: {
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
  error: { color: COLORS.danger, fontSize: 12, lineHeight: 18 },
  retryButton: { alignSelf: 'flex-start', marginTop: 9 },
  retryText: { color: COLORS.green, fontSize: 11, fontWeight: '800' },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: COLORS.green,
  },
  primaryButtonText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
  disclaimer: {
    paddingVertical: 8,
    color: COLORS.secondary,
    fontSize: 10,
    textAlign: 'center',
  },
});
