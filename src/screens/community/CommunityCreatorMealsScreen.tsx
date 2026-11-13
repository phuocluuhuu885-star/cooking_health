import React, { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { selectUserInfo } from '../../reduxs/reduces/user';
import {
  fetchCommunityMeals,
  setCommunityMealFavorite,
} from '../../utils/communityMealApi';
import { navigate } from '../../utils/navigation';
import ScreenKeys from '../../utils/screenKey';
import type { RootStackParamList } from '../../utils/types/navigation';
import type {
  CommunityMeal,
  CommunityMealFavoriteResponse,
} from '../../utils/types/communityMeal';
import CommunityMealCard from './CommunityMealCard';
import ScreenHeader from '../component/ScreenHeader';

type CommunityCreatorMealsScreenProps = StackScreenProps<
  RootStackParamList,
  typeof ScreenKeys.COMMUNITY_CREATOR_MEALS
>;

const CommunityCreatorMealsScreen = ({
  route,
}: CommunityCreatorMealsScreenProps) => {
  const user = useSelector(selectUserInfo);
  const { creatorId, creatorName, creatorAvatar } = route.params;
  const [meals, setMeals] = useState<CommunityMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasNextPage, setHasNextPage] = useState(false);
  const pageRef = useRef(1);
  const loadingMoreRef = useRef(false);

  const loadMeals = useCallback(
    async (page: number, replace: boolean) => {
      if (!user?.accessToken) {
        setMeals([]);
        setLoading(false);
        setError('Đăng nhập để xem món ăn cộng đồng.');
        return;
      }

      if (replace) setLoading(true);
      else {
        if (loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      }
      setError('');
      try {
        const response = await fetchCommunityMeals(user, {
          page,
          creatorId,
        });
        if (!response?.success || !Array.isArray(response.data)) {
          throw new Error(
            response?.message || 'Không thể tải món đã chia sẻ.',
          );
        }
        setMeals(current =>
          replace ? response.data! : [...current, ...response.data!],
        );
        pageRef.current = page;
        setHasNextPage(response.pagination?.hasNextPage ?? false);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Không thể tải món đã chia sẻ.',
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    },
    [creatorId, user],
  );

  useFocusEffect(
    useCallback(() => {
      loadMeals(1, true);
    }, [loadMeals]),
  );

  const handleOpenMeal = useCallback((mealId: string) => {
    navigate(ScreenKeys.COMMUNITY_MEAL_DETAIL, { mealId });
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!loading && !loadingMore && hasNextPage) {
      loadMeals(pageRef.current + 1, false);
    }
  }, [hasNextPage, loadMeals, loading, loadingMore]);

  const handleRetry = useCallback(() => {
    loadMeals(1, true);
  }, [loadMeals]);

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
    ({ item }: { item: CommunityMeal }) => (
      <CommunityMealCard
        meal={item}
        onPress={handleOpenMeal}
        onToggleFavorite={handleToggleFavorite}
        imageAuthToken={user?.accessToken}
      />
    ),
    [handleOpenMeal, handleToggleFavorite, user?.accessToken],
  );

  const keyExtractorMeal = useCallback((meal: CommunityMeal) => meal.id, []);

  const renderEmpty = useCallback(() => {
    if (loading) return undefined;
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🍲</Text>
        <Text style={styles.emptyTitle}>Chưa có món nào được chia sẻ</Text>
        <Text style={styles.emptyText}>
          Các công thức {creatorName} chia sẻ sẽ xuất hiện tại đây.
        </Text>
      </View>
    );
  }, [creatorName, loading]);

  const profileHeader = (
    <View style={styles.profile}>
      {creatorAvatar ? (
        <Image source={{ uri: creatorAvatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>
            {creatorName.trim().charAt(0).toLocaleUpperCase() || 'M'}
          </Text>
        </View>
      )}
      <View style={styles.profileCopy}>
        <Text style={styles.profileName}>{creatorName}</Text>
        <Text style={styles.profileSubtitle}>Các món đã chia sẻ</Text>
      </View>
    </View>
  );

  const footer = loadingMore ? (
    <ActivityIndicator color="#168653" style={styles.footerLoader} />
  ) : undefined;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        eyebrow="BẾP CỘNG ĐỒNG"
        title="Món đã chia sẻ"
        subtitle={creatorName}
      />
      {loading && meals.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#168653" />
        </View>
      ) : error && meals.length === 0 ? (
        <View style={styles.status}>
          <Text style={styles.error}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={handleRetry}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={meals}
          renderItem={renderMeal}
          keyExtractor={keyExtractorMeal}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={profileHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={footer}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={handleRetry}
        />
      )}
      {error && meals.length > 0 ? (
        <Text style={styles.inlineError}>{error}</Text>
      ) : null}
    </View>
  );
};

export default CommunityCreatorMealsScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F8F5',
  },
  list: {
    flexGrow: 1,
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 2,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6ECE7',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DDEBE0',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#168653',
    fontSize: 20,
    fontWeight: '800',
  },
  profileCopy: {
    flex: 1,
  },
  profileName: {
    color: '#172B23',
    fontSize: 16,
    fontWeight: '800',
  },
  profileSubtitle: {
    marginTop: 4,
    color: '#748078',
    fontSize: 12,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  empty: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    marginTop: 12,
    color: '#172B23',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 6,
    color: '#748078',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 16,
  },
  inlineError: {
    padding: 10,
    color: '#B43C35',
    textAlign: 'center',
  },
});
