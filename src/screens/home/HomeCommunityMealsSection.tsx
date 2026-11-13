import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { selectUserInfo } from '../../reduxs/reduces/user';
import {
  fetchCommunityMeals,
  setCommunityMealFavorite,
} from '../../utils/communityMealApi';
import { navigate } from '../../utils/navigation';
import ScreenKeys from '../../utils/screenKey';
import type {
  CommunityMeal,
  CommunityMealFavoriteResponse,
} from '../../utils/types/communityMeal';
import HomeCommunityMealCard from './HomeCommunityMealCard';

const HOME_COMMUNITY_MEAL_LIMIT = 8;

const HomeCommunityMealsSection = () => {
  const user = useSelector(selectUserInfo);
  const [meals, setMeals] = useState<CommunityMeal[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user?.accessToken) {
        setMeals([]);
        return undefined;
      }

      let active = true;
      setLoading(true);
      fetchCommunityMeals(user, { page: 1 })
        .then(response => {
          if (!active) return;
          if (!response.success || !Array.isArray(response.data)) {
            throw new Error(
              response.message || 'Không thể tải món ăn cộng đồng.',
            );
          }
          setMeals(response.data.slice(0, HOME_COMMUNITY_MEAL_LIMIT));
        })
        .catch(error => {
          if (active) {
            console.warn('Failed to load home community meals', error);
            setMeals([]);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [user]),
  );

  const handleOpenCommunity = useCallback(() => {
    navigate(ScreenKeys.COMMUNITY_MEALS);
  }, []);

  const handleOpenMeal = useCallback((mealId: string) => {
    navigate(ScreenKeys.COMMUNITY_MEAL_DETAIL, { mealId });
  }, []);

  const handleOpenCreatorMeals = useCallback(
    (
      creatorId: string,
      creatorName: string,
      creatorAvatar: string | null,
    ) => {
      navigate(ScreenKeys.COMMUNITY_CREATOR_MEALS, {
        creatorId,
        creatorName,
        creatorAvatar,
      });
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
      setMeals(current =>
        current.map(meal =>
          meal.id === mealId
            ? {
                ...meal,
                favoriteCount: response.data!.favoriteCount,
                isFavorited: response.data!.isFavorited,
              }
            : meal,
        ),
      );
      return response;
    },
    [user],
  );

  const renderMeal = useCallback(
    (meal: CommunityMeal) => (
      <HomeCommunityMealCard
        key={meal.id}
        meal={meal}
        onPress={handleOpenMeal}
        onAuthorPress={handleOpenCreatorMeals}
        onToggleFavorite={handleToggleFavorite}
        imageAuthToken={user?.accessToken}
      />
    ),
    [
      handleOpenCreatorMeals,
      handleOpenMeal,
      handleToggleFavorite,
      user?.accessToken,
    ],
  );

  const header = (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        <Text style={styles.title}>Món ngon từ cộng đồng</Text>
        <Text style={styles.subtitle}>Công thức được chia sẻ bởi mọi người</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Xem tất cả món ăn cộng đồng"
        onPress={handleOpenCommunity}
        style={styles.seeAllButton}
      >
        <Text style={styles.seeAllText}>Xem tất cả ›</Text>
      </Pressable>
    </View>
  );

  if (!loading && meals.length === 0) return null;

  return (
    <View style={styles.section}>
      {header}
      {loading && meals.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#168653" />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mealList}
        >
          {meals.map(renderMeal)}
        </ScrollView>
      )}
    </View>
  );
};

export default HomeCommunityMealsSection;

const styles = StyleSheet.create({
  section: {
    marginTop: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: '#172B23',
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 3,
    color: '#748078',
    fontSize: 11,
  },
  seeAllButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#E6F3E9',
  },
  seeAllText: {
    color: '#168653',
    fontSize: 11,
    fontWeight: '800',
  },
  mealList: {
    gap: 12,
    paddingRight: 4,
  },
  loading: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
});
