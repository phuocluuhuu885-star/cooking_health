import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppImage } from '../../abase/component';
import apiConst from '../../abase/constant/apiConst';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { useSelector } from 'react-redux';
import {
  cacheCurrentHousehold,
  invalidateCachedHouseholdMealPlan,
  invalidateCachedMealPlan,
  selectCurrentHousehold,
  selectHouseholdLoaded,
  selectMealPlanDestination,
  setMealPlanDestination,
} from '../../reduxs/reduces/appData';
import { useAppDispatch } from '../../reduxs/store';
import { syncApi, setSyncUser } from '../../utils/syncUtils';
import { goBack, navigate } from '../../utils/navigation';
import { fetchCurrentHousehold } from '../../utils/householdApi';
import { addMealToPlan } from '../../utils/mealPlanApi';
import ScreenKeys from '../../utils/screenKey';
import { fetchMealReviewSummaries } from '../../utils/mealReviewApi';
import { createStateSetter } from '../../utils/stateUtils';
import { formatNumberWithOptionalDecimal } from '../../utils/numberUtils';
import MealPlanComposerModal from './MealPlanComposerModal';
import MealReviewModal from './MealReviewModal';
import type {
  MealPeriod,
  MealPlanDestination,
  NutritionItemProps,
  Recipe,
  RecipeDetailMeal,
  RecipeDetailResponse,
  RecipeDetailScreenProps,
  RecipeDetailState,
} from '../../utils/types';

const CATEGORY_LABELS: Record<RecipeDetailMeal['category'], string> = {
  BREAKFAST: 'Bữa sáng',
  LUNCH: 'Bữa trưa',
  DINNER: 'Bữa tối',
  SNACK: 'Ăn nhẹ',
};

const RecipeDetail = (props: RecipeDetailScreenProps) => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useSelector(selectUserInfo);
  const household = useSelector(selectCurrentHousehold);
  const householdLoaded = useSelector(selectHouseholdLoaded);
  const mealPlanDestination = useSelector(selectMealPlanDestination);
  const [state, setState] = useState<RecipeDetailState>({
    servings: 1,
    reloadIndex: 0,
    meal: null,
    loading: true,
    error: '',
    composerVisible: false,
    composerSaving: false,
    reviewModalVisible: false,
    reviewSummary: null,
  });
  const {
    servings,
    meal,
    loading,
    error,
    composerVisible,
    composerSaving,
    reviewModalVisible,
    reviewSummary,
  } = state;
  const setComposerVisible = useMemo(
    () => createStateSetter(setState, 'composerVisible'),
    [setState],
  );
  const setComposerSaving = useMemo(
    () => createStateSetter(setState, 'composerSaving'),
    [setState],
  );
  const setReviewModalVisible = useMemo(
    () => createStateSetter(setState, 'reviewModalVisible'),
    [setState],
  );
  const setReviewSummary = useMemo(
    () => createStateSetter(setState, 'reviewSummary'),
    [setState],
  );
  const mealId = props.route.params.mealId;
  const composerRecipe = useMemo<Recipe | null>(
    () =>
      meal
        ? {
            id: meal.id,
            name: meal.name,
            description: meal.description,
            image: meal.imageUrl ?? '',
            time: meal.prepTimeMinutes + meal.cookTimeMinutes,
            calories: meal.nutritionSummary?.perServing.calories ?? 0,
            protein: meal.nutritionSummary?.perServing.proteinG ?? 0,
            carbs: meal.nutritionSummary?.perServing.carbsG ?? 0,
            fat: meal.nutritionSummary?.perServing.fatG ?? 0,
            category: [meal.category],
            nutritionAvailable: meal.nutritionSummary !== null,
          }
        : null,
    [meal],
  );

  useEffect(() => {
    setSyncUser(user ?? null);
    let isCurrentRequest = true;
    setState(previous => ({ ...previous, loading: true, error: '' }));

    const loadMeal = async () => {
      const response = (await syncApi(apiConst.getMealDetail, {
        id: mealId,
        servings,
      })) as RecipeDetailResponse;

      if (!isCurrentRequest) {
        return;
      }

      if (response?.success && response.data) {
        setState(previous => ({
          ...previous,
          meal: response.data ?? null,
        }));
      } else {
        setState(previous => ({
          ...previous,
          meal: null,
          error:
            response?.message ||
            response?.ErrorMessage ||
            'Không thể tải thông tin món ăn.',
        }));
      }
      setState(previous => ({ ...previous, loading: false }));
    };

    loadMeal().catch(() => {
      if (isCurrentRequest) {
        setState(previous => ({
          ...previous,
          meal: null,
          error: 'Không thể kết nối để tải công thức. Vui lòng thử lại.',
          loading: false,
        }));
      }
    });

    return () => {
      isCurrentRequest = false;
    };
  }, [mealId, servings, state.reloadIndex, user]);

  useEffect(() => {
    let active = true;
    setReviewSummary(null);
    fetchMealReviewSummaries([mealId])
      .then(summaries => {
        if (active) {
          setReviewSummary(summaries[0] ?? null);
        }
      })
      .catch(reviewError => {
        console.warn('Failed to load recipe review summary', reviewError);
      });
    return () => {
      active = false;
    };
  }, [mealId, setReviewSummary]);

  const orderedSteps = useMemo(
    () =>
      meal?.cookingSteps
        ? [...meal.cookingSteps].sort(
            (first, second) => first.stepNumber - second.stepNumber,
          )
        : [],
    [meal],
  );

  const retry = useCallback(() => {
    setState(previous => ({
      ...previous,
      reloadIndex: previous.reloadIndex + 1,
    }));
  }, [setState]);
  const adjustServings = useCallback((amount: number) => {
    setState(previous => ({
      ...previous,
      servings: Math.max(1, Math.min(20, previous.servings + amount)),
    }));
  }, [setState]);
  const decreaseServings = useCallback(() => {
    adjustServings(-1);
  }, [adjustServings]);
  const increaseServings = useCallback(() => {
    adjustServings(1);
  }, [adjustServings]);
  const handleViewReviews = useCallback(() => {
    if (meal) {
      navigate(ScreenKeys.MEAL_REVIEWS, {
        mealId: meal.id,
        mealName: meal.name,
      });
    }
  }, [meal]);
  const handleReviewSubmitted = useCallback((rating: number) => {
    setReviewSummary(current => {
      const total = (current?.total ?? 0) + 1;
      return {
        mealId,
        total,
        averageRating:
          ((current?.averageRating ?? 0) * (current?.total ?? 0) + rating) /
          total,
      };
    });
    setReviewModalVisible(false);
  }, [mealId, setReviewModalVisible, setReviewSummary]);
  const handleCloseComposer = useCallback(() => {
    if (!composerSaving) {
      setComposerVisible(false);
    }
  }, [composerSaving, setComposerVisible]);
  const handleRemoveComposerRecipe = useCallback(() => {
    setComposerVisible(false);
  }, [setComposerVisible]);
  const handleOpenComposer = useCallback(async () => {
    if (!user?.accessToken) {
      Alert.alert(
        'Cần đăng nhập',
        'Vui lòng đăng nhập để thêm món vào thực đơn.',
      );
      return;
    }

    let activeHousehold = household;
    const openForPersonalPlan = () => {
      dispatch(
        setMealPlanDestination({
          userId: user.id,
          destination: 'PERSONAL',
        }),
      );
      setComposerVisible(true);
    };

    if (!householdLoaded) {
      try {
        const householdResponse = await fetchCurrentHousehold(user);
        if (
          !householdResponse?.success ||
          householdResponse.data === undefined
        ) {
          Alert.alert(
            'Không thể kiểm tra gia đình',
            householdResponse?.message ||
              'Bạn vẫn có thể thêm món vào thực đơn cá nhân.',
            [
              { text: 'Tiếp tục cá nhân', onPress: openForPersonalPlan },
              { text: 'Hủy', style: 'cancel' },
            ],
          );
          return;
        }
        activeHousehold = householdResponse.data;
        dispatch(
          cacheCurrentHousehold({
            userId: user.id,
            household: activeHousehold,
          }),
        );
      } catch {
        Alert.alert(
          'Không thể kiểm tra gia đình',
          'Bạn vẫn có thể thêm món vào thực đơn cá nhân.',
          [
            { text: 'Tiếp tục cá nhân', onPress: openForPersonalPlan },
            { text: 'Hủy', style: 'cancel' },
          ],
        );
        return;
      }
    }

    if (!activeHousehold && mealPlanDestination === 'HOUSEHOLD') {
      openForPersonalPlan();
      return;
    }
    setComposerVisible(true);
  }, [
    dispatch,
    household,
    householdLoaded,
    mealPlanDestination,
    setComposerVisible,
    user,
  ]);
  const handleDestinationChange = useCallback(
    (destination: MealPlanDestination) => {
      if (user?.id) {
        dispatch(
          setMealPlanDestination({
            userId: user.id,
            destination,
          }),
        );
      }
    },
    [dispatch, user?.id],
  );
  const handleSubmitMealPlan = useCallback(
    async (
      date: string,
      mealPeriod: MealPeriod,
      destination: MealPlanDestination,
    ) => {
      if (!user?.accessToken || !meal) {
        Alert.alert(
          'Cần đăng nhập',
          'Vui lòng đăng nhập để thêm món vào thực đơn.',
        );
        return;
      }
      setComposerSaving(true);
      try {
        let activeHousehold = destination === 'HOUSEHOLD' ? household : null;
        if (destination === 'HOUSEHOLD' && !householdLoaded) {
          const householdResponse = await fetchCurrentHousehold(user);
          if (
            !householdResponse?.success ||
            householdResponse.data === undefined
          ) {
            Alert.alert(
              'Không thể kiểm tra gia đình',
              householdResponse?.message ||
                'Vui lòng thử lại trước khi thêm món vào thực đơn gia đình.',
            );
            return;
          }
          activeHousehold = householdResponse.data;
          dispatch(
            cacheCurrentHousehold({
              userId: user.id,
              household: activeHousehold,
            }),
          );
        }
        if (destination === 'HOUSEHOLD' && !activeHousehold) {
          Alert.alert(
            'Gia đình chưa sẵn sàng',
            'Hãy tạo hoặc tham gia gia đình trước khi thêm món vào thực đơn chung.',
          );
          return;
        }

        const response = await addMealToPlan(user, destination, {
          mealId: meal.id,
          date,
          mealPeriod,
        });
        if (!response?.success) {
          Alert.alert(
            'Không thể thêm món',
            response?.message || 'Vui lòng thử lại.',
          );
          return;
        }
        dispatch(
          setMealPlanDestination({
            userId: user.id,
            destination,
          }),
        );
        if (destination === 'HOUSEHOLD' && activeHousehold) {
          dispatch(
            invalidateCachedHouseholdMealPlan({
              userId: user.id,
              householdId: activeHousehold.id,
              date,
            }),
          );
        } else {
          dispatch(invalidateCachedMealPlan({ userId: user.id, date }));
        }
        setComposerVisible(false);
        const addedDirectlyToHouseholdPlan =
          destination === 'HOUSEHOLD' && response.data?.addedDirectlyToPlan;
        Alert.alert(
          addedDirectlyToHouseholdPlan
            ? 'Đã thêm món vào thực đơn gia đình'
            : destination === 'HOUSEHOLD'
            ? 'Đã đề xuất món'
            : 'Đã thêm món',
          addedDirectlyToHouseholdPlan
            ? `Bình chọn đã đóng, món được thêm trực tiếp vào thực đơn ngày ${date}.`
            : destination === 'HOUSEHOLD'
            ? `Món đã được thêm vào danh sách bình chọn cho ngày ${date}. Hạn bình chọn được cài đặt trong màn Thực phẩm gia đình.`
            : `Đã thêm món vào thực đơn ngày ${date}.`,
        );
      } catch {
        Alert.alert('Không thể thêm món', 'Vui lòng thử lại sau.');
      } finally {
        setComposerSaving(false);
      }
    },
    [
      dispatch,
      household,
      householdLoaded,
      meal,
      setComposerSaving,
      setComposerVisible,
      user,
    ],
  );

  if (loading) {
    return (
      <View style={[styles.statusScreen, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.green} />
        <Text style={styles.statusMessage}>Đang tải công thức...</Text>
      </View>
    );
  }

  if (!meal) {
    return (
      <View style={[styles.statusScreen, { paddingTop: insets.top }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại danh sách công thức"
          onPress={goBack}
          style={styles.statusBackButton}
        >
          <Text style={styles.statusBackText}>‹ Quay lại</Text>
        </Pressable>
        <Text style={styles.errorTitle}>Chưa thể mở công thức</Text>
        <Text style={styles.statusMessage}>{error}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={retry}
          style={styles.retryButton}
        >
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }

  const nutrition = meal.nutritionSummary;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero]}>
          {meal.imageUrl ? (
            <AppImage
              source={{ uri: meal.imageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.heroImage, styles.imagePlaceholder]}>
              <Text style={styles.imagePlaceholderText}>MealCraft</Text>
            </View>
          )}
          <View style={styles.heroShade} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại danh sách công thức"
            hitSlop={8}
            onPress={goBack}
            style={[styles.backButton, { top: insets.top + 12 }]}
          >
            <Text style={styles.backButtonText}>‹</Text>
          </Pressable>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              {CATEGORY_LABELS[meal.category]}
            </Text>
          </View>
        </View>

        <LinearGradient
          colors={['#FFFFFF', '#F2F8F4']}
          style={styles.section}
        >
          <Pressable
            accessibilityRole="button"
            onPress={handleOpenComposer}
            style={styles.addToPlanButton}
          >
            <Text style={styles.addToPlanButtonText}>Thêm vào thực đơn</Text>
          </Pressable>
          <Text style={styles.title}>{meal.name}</Text>
          {meal.description ? (
            <Text style={styles.description}>{meal.description}</Text>
          ) : null}

          <View style={styles.quickInfo}>
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoLabel}>Chuẩn bị</Text>
              <Text style={styles.quickInfoValue}>
                {meal.prepTimeMinutes} phút
              </Text>
            </View>

            <View style={styles.quickInfoDivider} />
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoLabel}>Nấu</Text>
              <Text style={styles.quickInfoValue}>
                {meal.cookTimeMinutes} phút
              </Text>
            </View>
            <View style={styles.quickInfoDivider} />
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoLabel}>Tổng thời gian</Text>
              <Text style={styles.quickInfoValue}>
                {meal.prepTimeMinutes + meal.cookTimeMinutes} phút
              </Text>
            </View>
          </View>
        </LinearGradient>

        <LinearGradient
          colors={['#FFFFFF', '#F2F8F4']}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Đánh giá món ăn</Text>
          <View style={styles.reviewSummaryRow}>
            <Text style={styles.reviewStar}>★</Text>
            <Text style={styles.reviewAverage}>
              {reviewSummary?.total
                ? reviewSummary.averageRating.toFixed(1)
                : '—'}
            </Text>
            <Text style={styles.reviewCount}>
              {reviewSummary?.total ?? 0} đánh giá
            </Text>
          </View>
          <View style={styles.reviewActions}>
            <Pressable
              accessibilityRole="button"
              onPress={handleViewReviews}
              style={styles.viewReviewsButton}
            >
              <Text style={styles.viewReviewsText}>Xem đánh giá</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setReviewModalVisible(true)}
              style={styles.rateButton}
            >
              <Text style={styles.rateButtonText}>Đánh giá</Text>
            </Pressable>
          </View>
        </LinearGradient>

        <LinearGradient
          colors={['#FFFFFF', '#F2F8F4']}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Khẩu phần</Text>
          <Text style={styles.sectionSubtitle}>
            Nguyên liệu và dinh dưỡng được cập nhật theo số người
          </Text>
          <View style={styles.servingSelector}>
            <View style={styles.servingControl}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Giảm khẩu phần"
                disabled={servings <= 1}
                onPress={decreaseServings}
                style={[
                  styles.servingButton,
                  servings <= 1 && styles.disabledButton,
                ]}
              >
                <Text style={styles.servingButtonText}>−</Text>
              </Pressable>
              <View style={styles.servingValueContainer}>
                <Text style={styles.servingValue}>{servings}</Text>
                <Text style={styles.servingUnit}>khẩu phần</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tăng khẩu phần"
                disabled={servings >= 20}
                onPress={increaseServings}
                style={[
                  styles.servingButton,
                  servings >= 20 && styles.disabledButton,
                ]}
              >
                <Text style={styles.servingButtonText}>+</Text>
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        <LinearGradient
          colors={['#FFFFFF', '#F2F8F4']}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Dinh dưỡng</Text>
          {nutrition ? (
            <LinearGradient
              colors={['#F7FAF8', '#EAF4EE']}
              style={styles.nutritionCard}
            >
              <Text style={styles.nutritionCaption}>
                Mỗi khẩu phần · {nutrition.perServing.calories} kcal
              </Text>
              <View style={styles.nutritionGrid}>
                <NutritionItem
                  label="Đạm"
                  value={nutrition.perServing.proteinG}
                  color={COLORS.protein}
                />
                <NutritionItem
                  label="Tinh bột"
                  value={nutrition.perServing.carbsG}
                  color={COLORS.carbs}
                />
                <NutritionItem
                  label="Chất béo"
                  value={nutrition.perServing.fatG}
                  color={COLORS.fat}
                />
              </View>
              <View style={styles.nutritionTotal}>
                <Text style={styles.nutritionTotalLabel}>
                  Tổng {nutrition.servings} khẩu phần
                </Text>
                <Text style={styles.nutritionTotalValue}>
                  {nutrition.total.calories} kcal
                </Text>
              </View>
              <Text style={styles.weightBasis}>
                {nutrition.weightBasis === 'FINAL_WEIGHT'
                  ? 'Tính theo khối lượng món sau khi nấu'
                  : 'Tính theo khối lượng nguyên liệu ước tính'}
                {' · '}
                {formatNumberWithOptionalDecimal(nutrition.totalWeightG)} g
              </Text>
            </LinearGradient>
          ) : (
            <View style={styles.unavailableCard}>
              <Text style={styles.unavailableText}>
                Chưa có đủ dữ liệu để tính dinh dưỡng cho món này.
              </Text>
            </View>
          )}
        </LinearGradient>

        <LinearGradient
          colors={['#FFFFFF', '#F2F8F4']}
          style={styles.section}
        >
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>Nguyên liệu</Text>
              <Text style={styles.sectionSubtitle}>
                Cho {meal.servings} khẩu phần
              </Text>
            </View>
            <Text style={styles.ingredientCount}>
              {meal.groceryList.length} nguyên liệu
            </Text>
          </View>
          <View style={styles.ingredientsCard}>
            {meal.groceryList.map((ingredient, index) => (
              <View
                key={ingredient.id}
                style={[
                  styles.ingredientRow,
                  index < meal.groceryList.length - 1 &&
                    styles.ingredientDivider,
                ]}
              >
                <View style={styles.ingredientBullet} />
                <Text style={styles.ingredientName}>{ingredient.name}</Text>
                <Text style={styles.ingredientAmount}>
                  {ingredient.formattedAmount ||
                    `${formatNumberWithOptionalDecimal(
                      ingredient.amountG,
                    )} g`}
                </Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <LinearGradient
          colors={['#FFFFFF', '#F2F8F4']}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Cách nấu</Text>
          <Text style={styles.sectionSubtitle}>
            Làm theo từng bước để món ăn đạt kết quả tốt nhất
          </Text>
          <View style={styles.stepsContainer}>
            {orderedSteps.map((step, index) => (
              <View key={step.id} style={styles.stepRow}>
                <View style={styles.stepMarkerColumn}>
                  <View style={styles.stepMarker}>
                    <Text style={styles.stepMarkerText}>{step.stepNumber}</Text>
                  </View>
                  {index < orderedSteps.length - 1 ? (
                    <View style={styles.stepConnector} />
                  ) : null}
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepInstruction}>{step.instruction}</Text>
                  {step.imageUrl ? (
                    <AppImage
                      source={{ uri: step.imageUrl }}
                      style={styles.stepImage}
                      resizeMode="cover"
                    />
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </LinearGradient>

        <Text style={styles.disclaimer}>
          Thông tin dinh dưỡng mang tính tham khảo và có thể thay đổi theo
          nguyên liệu thực tế.
        </Text>
      </ScrollView>
      <MealPlanComposerModal
        visible={composerVisible}
        recipe={composerRecipe}
        destination={mealPlanDestination}
        householdAvailable={Boolean(household)}
        saving={composerSaving}
        initialDate={new Date().toISOString().slice(0, 10)}
        onClose={handleCloseComposer}
        onDestinationChange={handleDestinationChange}
        onRemoveSelection={handleRemoveComposerRecipe}
        onSubmit={handleSubmitMealPlan}
      />
      <MealReviewModal
        mealId={meal?.id ?? null}
        mealName={meal?.name ?? ''}
        token={user?.accessToken}
        visible={reviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
        onSubmitted={handleReviewSubmitted}
      />
    </View>
  );
};

const NutritionItem = ({ label, value, color }: NutritionItemProps) => (
  <View style={styles.nutritionItem}>
    <View style={[styles.nutritionDot, { backgroundColor: color }]} />
    <Text style={styles.nutritionLabel}>{label}</Text>
    <Text style={styles.nutritionValue}>
      {formatNumberWithOptionalDecimal(value)} g
    </Text>
  </View>
);

const COLORS = {
  background: '#F5F7F5',
  white: '#FFFFFF',
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  lightGreen: '#E7F4EC',
  border: '#E5EBE7',
  protein: '#168653',
  carbs: '#E89B36',
  fat: '#5D8FE8',
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 24,
  },
  hero: {
    height: 280,
    justifyContent: 'flex-end',
    backgroundColor: '#DCE8DF',
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightGreen,
  },
  imagePlaceholderText: {
    color: COLORS.green,
    fontSize: 20,
    fontWeight: '800',
  },
  heroShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 18,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  backButtonText: {
    marginTop: -4,
    color: COLORS.text,
    fontSize: 34,
    lineHeight: 38,
  },
  categoryBadge: {
    position: 'absolute',
    left: 18,
    bottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },
  categoryBadgeText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  title: {
    color: COLORS.text,
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '800',
  },
  description: {
    marginTop: 8,
    color: COLORS.secondary,
    fontSize: 14,
    lineHeight: 21,
  },
  quickInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  quickInfoItem: {
    flex: 1,
  },
  quickInfoLabel: {
    color: COLORS.secondary,
    fontSize: 11,
  },
  quickInfoValue: {
    marginTop: 4,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  quickInfoDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 10,
    backgroundColor: COLORS.border,
  },
  addToPlanButton: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.green,
    paddingHorizontal: 12,
  },
  addToPlanButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },
  reviewSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  reviewStar: {
    color: '#E89B36',
    fontSize: 20,
  },
  reviewAverage: {
    marginLeft: 5,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  reviewCount: {
    marginLeft: 8,
    color: COLORS.secondary,
    fontSize: 12,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  viewReviewsButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.lightGreen,
  },
  viewReviewsText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '700',
  },
  rateButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.green,
  },
  rateButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    marginTop: 4,
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  servingControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  servingSelector: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F7FAF8',
  },
  servingValueContainer: {
    minWidth: 108,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingUnit: {
    marginTop: 2,
    color: COLORS.secondary,
    fontSize: 11,
  },
  servingButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.lightGreen,
  },
  servingButtonText: {
    color: COLORS.green,
    fontSize: 21,
    lineHeight: 24,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.4,
  },
  servingValue: {
    minWidth: 16,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  nutritionCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    overflow: 'hidden',
  },
  nutritionCaption: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  nutritionGrid: {
    marginTop: 14,
    gap: 12,
  },
  nutritionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nutritionDot: {
    width: 9,
    height: 9,
    marginRight: 8,
    borderRadius: 12,
  },
  nutritionLabel: {
    flex: 1,
    color: COLORS.secondary,
    fontSize: 13,
  },
  nutritionValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  nutritionTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  nutritionTotalLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  nutritionTotalValue: {
    color: COLORS.green,
    fontSize: 13,
    fontWeight: '800',
  },
  weightBasis: {
    marginTop: 8,
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 16,
  },
  unavailableCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F7FAF8',
  },
  unavailableText: {
    color: COLORS.secondary,
    fontSize: 13,
    lineHeight: 19,
  },
  ingredientCount: {
    color: COLORS.secondary,
    fontSize: 12,
  },
  ingredientsCard: {
    marginTop: 12,
  },
  ingredientRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ingredientDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2EF',
  },
  ingredientBullet: {
    width: 8,
    height: 8,
    borderRadius: 12,
    backgroundColor: COLORS.green,
  },
  ingredientName: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  ingredientAmount: {
    color: COLORS.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  stepsContainer: {
    marginTop: 18,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 96,
  },
  stepMarkerColumn: {
    width: 34,
    alignItems: 'center',
  },
  stepMarker: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.lightGreen,
  },
  stepMarkerText: {
    color: COLORS.green,
    fontSize: 13,
    fontWeight: '800',
  },
  stepConnector: {
    width: 1,
    flex: 1,
    marginVertical: 5,
    backgroundColor: COLORS.border,
  },
  stepContent: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 24,
  },
  stepTitle: {
    marginTop: 5,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  stepInstruction: {
    marginTop: 6,
    color: COLORS.secondary,
    fontSize: 13,
    lineHeight: 20,
  },
  stepImage: {
    width: '100%',
    height: 160,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#EEF2EF',
  },
  disclaimer: {
    marginHorizontal: 22,
    marginTop: 15,
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
  statusScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: COLORS.background,
  },
  statusBackButton: {
    position: 'absolute',
    top: 12,
    left: 18,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  statusBackText: {
    color: COLORS.green,
    fontSize: 15,
    fontWeight: '700',
  },
  statusMessage: {
    marginTop: 12,
    color: COLORS.secondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '800',
  },
  retryButton: {
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: COLORS.green,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default RecipeDetail;
