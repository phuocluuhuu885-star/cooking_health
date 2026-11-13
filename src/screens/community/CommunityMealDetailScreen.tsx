import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import type { StackScreenProps } from '@react-navigation/stack';
import {
  cacheCurrentHousehold,
  invalidateCachedHouseholdMealPlan,
  invalidateCachedMealPlan,
  selectCurrentHousehold,
  selectHouseholdLoaded,
  selectMealPlanDestination,
  setMealPlanDestination,
} from '../../reduxs/reduces/appData';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { useAppDispatch } from '../../reduxs/store';
import {
  fetchCommunityMeal,
  removeCommunityMeal,
  setCommunityMealFavorite,
} from '../../utils/communityMealApi';
import { fetchCurrentHousehold } from '../../utils/householdApi';
import { addMealToPlan } from '../../utils/mealPlanApi';
import { goBack, navigate } from '../../utils/navigation';
import type { RootStackParamList } from '../../utils/types/navigation';
import ScreenKeys from '../../utils/screenKey';
import type { CommunityMeal } from '../../utils/types/communityMeal';
import type { CommunityMealFavoriteResponse } from '../../utils/types/communityMeal';
import type {
  MealPeriod,
  MealPlanDestination,
  Recipe,
} from '../../utils/types';
import CommunityNutritionSummary from './CommunityNutritionSummary';
import CommunityMealIngredientSeparator from './CommunityMealIngredientSeparator';
import CommunityMealAuthorOverlay from './CommunityMealAuthorOverlay';
import CommunityMealFavoriteButton from './CommunityMealFavoriteButton';
import CommunityMealRatingBadge from './CommunityMealRatingBadge';
import CommunityMealReviews from './CommunityMealReviews';
import ScreenHeader from '../component/ScreenHeader';
import MealPlanComposerModal from '../recipes/MealPlanComposerModal';

type CommunityMealDetailScreenProps = StackScreenProps<
  RootStackParamList,
  typeof ScreenKeys.COMMUNITY_MEAL_DETAIL
>;

const CommunityMealDetailScreen = ({
  route,
}: CommunityMealDetailScreenProps) => {
  const dispatch = useAppDispatch();
  const user = useSelector(selectUserInfo);
  const household = useSelector(selectCurrentHousehold);
  const householdLoaded = useSelector(selectHouseholdLoaded);
  const mealPlanDestination = useSelector(selectMealPlanDestination);
  const [meal, setMeal] = useState<CommunityMeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [planComposerVisible, setPlanComposerVisible] = useState(false);
  const [planComposerSaving, setPlanComposerSaving] = useState(false);
  const composerRecipe = React.useMemo<Recipe | null>(
    () =>
      meal
        ? {
            id: meal.id,
            name: meal.name,
            description: meal.description,
            image: meal.imageUrl,
            time: 0,
            calories: meal.nutrition.caloriesKcal,
            protein: meal.nutrition.proteinG,
            carbs: meal.nutrition.carbohydratesG,
            fat: meal.nutrition.fatG,
            category: ['DINNER'],
            nutritionAvailable: true,
          }
        : null,
    [meal],
  );

  const loadMeal = useCallback(async () => {
    if (!user?.accessToken) {
      setLoading(false);
      setError('Đăng nhập để xem công thức cộng đồng.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetchCommunityMeal(user, route.params.mealId);
      if (!response?.success || !response.data) {
        throw new Error(response?.message || 'Không thể tải công thức.');
      }
      setMeal(response.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Không thể tải công thức.',
      );
    } finally {
      setLoading(false);
    }
  }, [route.params.mealId, user]);

  useFocusEffect(
    useCallback(() => {
      loadMeal();
    }, [loadMeal]),
  );

  const handleDeleteMeal = useCallback(async () => {
    if (!user || !meal || deleting) return;
    setDeleting(true);
    try {
      const response = await removeCommunityMeal(user, meal.id);
      if (!response?.success) {
        throw new Error(response?.message || 'Không thể gỡ món ăn.');
      }
      goBack();
    } catch (deleteError) {
      Alert.alert(
        'Không thể gỡ món ăn',
        deleteError instanceof Error
          ? deleteError.message
          : 'Vui lòng thử lại.',
      );
    } finally {
      setDeleting(false);
    }
  }, [deleting, meal, user]);

  const handleConfirmDelete = useCallback(() => {
    if (!meal) return;
    Alert.alert(
      'Gỡ món khỏi cộng đồng?',
      'Món ăn sẽ không còn hiển thị với các thành viên khác.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Gỡ món', style: 'destructive', onPress: handleDeleteMeal },
      ],
    );
  }, [handleDeleteMeal, meal]);

  const handleRetry = useCallback(() => {
    loadMeal();
  }, [loadMeal]);

  const openMealPlanComposer = useCallback(() => {
    if (!user?.id) return;
    dispatch(
      setMealPlanDestination({ userId: user.id, destination: 'PERSONAL' }),
    );
    setPlanComposerVisible(true);
  }, [dispatch, user?.id]);

  const handleOpenMealPlanComposer = useCallback(async () => {
    if (!user?.accessToken) {
      Alert.alert('Đăng nhập để thêm món', 'Hãy đăng nhập để lưu món vào thực đơn.');
      return;
    }
    if (!householdLoaded) {
      try {
        const response = await fetchCurrentHousehold(user);
        if (!response?.success || response.data === undefined) {
          throw new Error(
            response?.message || 'Không thể kiểm tra thực đơn gia đình.',
          );
        }
        dispatch(cacheCurrentHousehold({ userId: user.id, household: response.data }));
      } catch (requestError) {
        Alert.alert(
          'Không thể kiểm tra gia đình',
          requestError instanceof Error
            ? requestError.message
            : 'Vui lòng thử lại.',
          [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Tiếp tục cá nhân', onPress: openMealPlanComposer },
          ],
        );
        return;
      }
    }
    openMealPlanComposer();
  }, [dispatch, householdLoaded, openMealPlanComposer, user]);

  const handleCloseMealPlanComposer = useCallback(() => {
    if (!planComposerSaving) setPlanComposerVisible(false);
  }, [planComposerSaving]);

  const handleDestinationChange = useCallback(
    (destination: MealPlanDestination) => {
      if (user?.id) {
        dispatch(setMealPlanDestination({ userId: user.id, destination }));
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
      if (!user || !meal) return;
      setPlanComposerSaving(true);
      try {
        let activeHousehold = destination === 'HOUSEHOLD' ? household : null;
        if (destination === 'HOUSEHOLD' && !activeHousehold) {
          const response = await fetchCurrentHousehold(user);
          if (!response?.success || !response.data) {
            throw new Error(
              response?.message || 'Bạn chưa thuộc gia đình nào.',
            );
          }
          activeHousehold = response.data;
          dispatch(
            cacheCurrentHousehold({
              userId: user.id,
              household: activeHousehold,
            }),
          );
        }
        const response = await addMealToPlan(user, destination, {
          communityMealId: meal.id,
          date,
          mealPeriod,
          servings:
            destination === 'HOUSEHOLD'
              ? Math.max(1, activeHousehold?.members.length ?? 1)
              : 1,
        });
        if (!response?.success) {
          throw new Error(response?.message || 'Không thể thêm món vào thực đơn.');
        }
        dispatch(setMealPlanDestination({ userId: user.id, destination }));
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
        setPlanComposerVisible(false);
        const addedDirectlyToPlan =
          destination === 'HOUSEHOLD' &&
          response.data?.addedDirectlyToPlan === true;
        Alert.alert(
          addedDirectlyToPlan ? 'Đã thêm món' : destination === 'HOUSEHOLD' ? 'Đã đề xuất món' : 'Đã thêm món',
          addedDirectlyToPlan
            ? `Đã thêm món vào thực đơn gia đình ngày ${date}.`
            : destination === 'HOUSEHOLD'
              ? `Đã thêm món vào danh sách bình chọn cho ngày ${date}.`
              : `Đã thêm món vào thực đơn ngày ${date}.`,
        );
      } catch (requestError) {
        Alert.alert(
          'Không thể thêm món',
          requestError instanceof Error
            ? requestError.message
            : 'Vui lòng thử lại.',
        );
      } finally {
        setPlanComposerSaving(false);
      }
    },
    [dispatch, household, meal, user],
  );

  const handleReviewSummaryChange = useCallback(
    (averageRating: number, reviewCount: number) => {
      setMeal(current =>
        current ? { ...current, averageRating, reviewCount } : current,
      );
    },
    [],
  );

  const handleToggleFavorite = useCallback(
    async (
      mealId: string,
      isFavorited: boolean,
    ): Promise<CommunityMealFavoriteResponse> => {
      if (!user) throw new Error('Đăng nhập để yêu thích món ăn.');
      const response = await setCommunityMealFavorite(
        user,
        mealId,
        isFavorited,
      );
      if (!response?.success || !response.data) {
        throw new Error(response?.message || 'Không thể cập nhật yêu thích.');
      }
      setMeal(current =>
        current
          ? {
              ...current,
              favoriteCount: response.data!.favoriteCount,
              isFavorited: response.data!.isFavorited,
            }
          : current,
      );
      return response;
    },
    [user],
  );

  const handleOpenCreatorMeals = useCallback(
    (creatorId: string) => {
      if (!meal) return;
      navigate(ScreenKeys.COMMUNITY_CREATOR_MEALS, {
        creatorId,
        creatorName: meal.creatorName,
        creatorAvatar: meal.creatorAvatar,
      });
    },
    [meal],
  );

  const renderIngredient = useCallback(
    ({ item }: { item: string }) => (
      <View style={styles.ingredientRow}>
        <Text style={styles.ingredientBullet}>•</Text>
        <Text style={styles.ingredientText}>{item}</Text>
      </View>
    ),
    [],
  );

  const keyExtractorIngredient = useCallback(
    (ingredient: string, index: number) => `${index}-${ingredient}`,
    [],
  );

  const deleteAction =
    meal?.creatorId === user?.id ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Gỡ món khỏi cộng đồng"
        disabled={deleting}
        onPress={handleConfirmDelete}
        style={styles.deleteButton}
      >
        <Text style={styles.deleteText}>{deleting ? 'Đang gỡ' : 'Gỡ món'}</Text>
      </Pressable>
    ) : null;

  const sharedDate = meal
    ? new Date(meal.createdAt).toLocaleDateString('vi-VN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <View style={styles.screen}>
      <ScreenHeader
        eyebrow="CÔNG THỨC CỘNG ĐỒNG"
        title={meal?.name || 'Chi tiết món ăn'}
        rightAction={deleteAction}
      />
      {meal?.status === 'APPROVED' ? (
        <Pressable
          accessibilityRole="button"
          disabled={planComposerSaving}
          onPress={handleOpenMealPlanComposer}
          style={styles.addToPlanButton}
        >
          <Text style={styles.addToPlanButtonText}>＋ Thêm vào thực đơn</Text>
        </Pressable>
      ) : null}
      {loading ? (
        <View style={styles.status}>
          <ActivityIndicator color="#168653" />
        </View>
      ) : error || !meal ? (
        <View style={styles.status}>
          <Text style={styles.error}>{error || 'Không tìm thấy món ăn.'}</Text>
          <Pressable onPress={handleRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroImageContainer}>
            <Image
              source={{
                uri: meal.imageUrl,
                headers: user?.accessToken
                  ? { Authorization: `Bearer ${user.accessToken}` }
                  : undefined,
              }}
              style={styles.heroImage}
            />
            <CommunityMealAuthorOverlay
              creatorId={meal.creatorId}
              name={meal.creatorName}
              avatarUrl={meal.creatorAvatar}
              onPress={handleOpenCreatorMeals}
            />
            <CommunityMealRatingBadge
              averageRating={meal.averageRating}
              reviewCount={meal.reviewCount}
            />
            {meal.status === 'APPROVED' ? (
              <CommunityMealFavoriteButton
                mealId={meal.id}
                favoriteCount={meal.favoriteCount}
                isFavorited={meal.isFavorited}
                onToggle={handleToggleFavorite}
              />
            ) : null}
          </View>
          <View style={styles.authorInfo}>
            <Text style={styles.servings}>
              {meal.nutrition.caloriesKcal.toFixed(0)} kcal / khẩu phần
            </Text>
            <Text style={styles.sharedDate}>Chia sẻ ngày {sharedDate}</Text>
          </View>
          {meal.status === 'PENDING' ? (
            <Text style={styles.pendingNotice}>
              Món ăn đang chờ quản trị viên duyệt và chỉ bạn mới xem được.
            </Text>
          ) : null}
          {meal.status === 'REJECTED' ? (
            <Text style={styles.rejectedNotice}>
              Món ăn chưa được duyệt
              {meal.moderationReason ? `: ${meal.moderationReason}` : '.'}
            </Text>
          ) : null}
          {meal.description ? (
            <Text style={styles.description}>{meal.description}</Text>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nguyên liệu</Text>
            <FlatList
              data={meal.ingredients}
              renderItem={renderIngredient}
              keyExtractor={keyExtractorIngredient}
              scrollEnabled={false}
              ItemSeparatorComponent={CommunityMealIngredientSeparator}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cách nấu</Text>
            <Text style={styles.instructions}>{meal.instructions}</Text>
          </View>

          <CommunityNutritionSummary nutrition={meal.nutrition} />
          {meal.status === 'APPROVED' ? (
            <CommunityMealReviews
              mealId={meal.id}
              creatorId={meal.creatorId}
              user={user}
              onSummaryChange={handleReviewSummaryChange}
            />
          ) : null}
        </ScrollView>
      )}
      <MealPlanComposerModal
        visible={planComposerVisible}
        recipe={composerRecipe}
        destination={mealPlanDestination}
        householdAvailable={Boolean(household)}
        saving={planComposerSaving}
        initialDate={new Date().toISOString().slice(0, 10)}
        onClose={handleCloseMealPlanComposer}
        onDestinationChange={handleDestinationChange}
        onRemoveSelection={handleCloseMealPlanComposer}
        onSubmit={handleSubmitMealPlan}
      />
    </View>
  );
};

export default CommunityMealDetailScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F8F5',
  },
  addToPlanButton: {
    marginHorizontal: 16,
    marginTop: 8,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#168653',
  },
  addToPlanButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    gap: 16,
    padding: 16,
    paddingBottom: 36,
  },
  heroImageContainer: {
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: 240,
    borderRadius: 10,
    backgroundColor: '#EAF2EC',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  servings: {
    color: '#52695B',
    fontSize: 12,
    fontWeight: '700',
  },
  sharedDate: {
    color: '#89958D',
    fontSize: 11,
  },
  pendingNotice: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFF6E8',
    color: '#8A5A12',
    fontSize: 13,
    lineHeight: 19,
  },
  rejectedNotice: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFF0EE',
    color: '#B43C35',
    fontSize: 13,
    lineHeight: 19,
  },
  description: {
    color: '#66756D',
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6ECE7',
  },
  sectionTitle: {
    marginBottom: 12,
    color: '#172B23',
    fontSize: 15,
    fontWeight: '800',
  },
  ingredientRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
  },
  ingredientBullet: {
    color: '#168653',
    fontSize: 16,
  },
  ingredientText: {
    flex: 1,
    color: '#34483B',
    fontSize: 13,
    lineHeight: 19,
  },
  instructions: {
    color: '#34483B',
    fontSize: 14,
    lineHeight: 22,
  },
  status: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  error: {
    color: '#B43C35',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#E6F3E9',
  },
  retryText: {
    color: '#168653',
    fontSize: 13,
    fontWeight: '800',
  },
  deleteButton: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFF0EE',
  },
  deleteText: {
    color: '#B43C35',
    fontSize: 12,
    fontWeight: '800',
  },
});
