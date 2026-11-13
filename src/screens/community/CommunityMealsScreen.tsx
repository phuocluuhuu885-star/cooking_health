import React, { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { navigate } from '../../utils/navigation';
import ScreenKeys from '../../utils/screenKey';
import {
  fetchCommunityMeals,
  setCommunityMealFavorite,
} from '../../utils/communityMealApi';
import type {
  CommunityMeal,
  CommunityMealFavoriteResponse,
} from '../../utils/types/communityMeal';
import CommunityMealCard from './CommunityMealCard';
import LoginRequiredModal from '../component/LoginRequiredModal';
import ScreenHeader from '../component/ScreenHeader';

const CommunityMealsScreen = () => {
  type CommunityMealsView = 'community' | 'mine' | 'favorites';
  const user = useSelector(selectUserInfo);
  const [meals, setMeals] = useState<CommunityMeal[]>([]);
  const [selectedView, setSelectedView] =
    useState<CommunityMealsView>('community');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loginPromptVisible, setLoginPromptVisible] = useState(false);
  const pageRef = useRef(1);
  const loadingMoreRef = useRef(false);

  const loadMeals = useCallback(
    async (page: number, replace: boolean) => {
      if (!user?.accessToken) {
        setMeals([]);
        setLoading(false);
        setLoginPromptVisible(true);
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
          mine: selectedView === 'mine',
          favorites: selectedView === 'favorites',
        });
        if (!response?.success || !Array.isArray(response.data)) {
          throw new Error(
            response?.message || 'Không thể tải món ăn cộng đồng.',
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
            : 'Không thể tải món ăn cộng đồng.',
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    },
    [selectedView, user],
  );

  useFocusEffect(
    useCallback(() => {
      loadMeals(1, true);
    }, [loadMeals]),
  );

  const handleOpenShareForm = useCallback(() => {
    if (!user?.accessToken) {
      setLoginPromptVisible(true);
      return;
    }
    navigate(ScreenKeys.SHARE_COMMUNITY_MEAL);
  }, [user?.accessToken]);

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
      if (selectedView === 'favorites' && !isFavorited) {
        setMeals(current => current.filter(meal => meal.id !== mealId));
        pageRef.current = 1;
        setHasNextPage(false);
        await loadMeals(1, true);
        return response;
      }
      setMeals(current =>
        current.map(meal => {
          if (meal.id !== mealId) return meal;
          return {
            ...meal,
            favoriteCount: response.data!.favoriteCount,
            isFavorited: response.data!.isFavorited,
          };
        }),
      );
      return response;
    },
    [loadMeals, selectedView, user],
  );

  const handleLoadMore = useCallback(() => {
    if (!loading && !loadingMore && hasNextPage) {
      loadMeals(pageRef.current + 1, false);
    }
  }, [hasNextPage, loadMeals, loading, loadingMore]);

  const handleRetry = useCallback(() => {
    loadMeals(1, true);
  }, [loadMeals]);

  const handleCloseLoginPrompt = useCallback(() => {
    setLoginPromptVisible(false);
  }, []);

  const handleConfirmLogin = useCallback(() => {
    setLoginPromptVisible(false);
    navigate(ScreenKeys.LOGIN);
  }, []);

  const renderMeal = useCallback(
    ({ item }: { item: CommunityMeal }) => (
      <CommunityMealCard
        meal={item}
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

  const keyExtractorMeal = useCallback(
    (meal: CommunityMeal) => meal.id,
    [],
  );

  const renderEmpty = useCallback(() => {
    if (loading) return undefined;
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🍲</Text>
        <Text style={styles.emptyTitle}>
          {selectedView === 'mine'
            ? 'Bạn chưa chia sẻ món nào'
            : selectedView === 'favorites'
              ? 'Bạn chưa yêu thích món nào'
              : 'Chưa có món được chia sẻ'}
        </Text>
        <Text style={styles.emptyText}>
          {selectedView === 'mine'
            ? 'Chia sẻ công thức đầu tiên để mọi người cùng khám phá.'
            : selectedView === 'favorites'
              ? 'Nhấn biểu tượng trái tim trên món ăn để lưu vào đây.'
              : 'Hãy quay lại sau để khám phá món ăn từ cộng đồng.'}
        </Text>
      </View>
    );
  }, [loading, selectedView]);

  const handleTabCommunity = useCallback(() => {
    setSelectedView('community');
  }, []);

  const handleTabMine = useCallback(() => {
    setSelectedView('mine');
  }, []);

  const handleTabFavorites = useCallback(() => {
    setSelectedView('favorites');
  }, []);

  const headerAction = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Chia sẻ món ăn"
      onPress={handleOpenShareForm}
      style={styles.shareButton}
    >
      <Text style={styles.shareButtonText}>＋ Chia sẻ</Text>
    </Pressable>
  );

  const footer = loadingMore ? (
    <ActivityIndicator color="#168653" style={styles.footerLoader} />
  ) : undefined;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        eyebrow="MÓN CỘNG ĐỒNG"
        title="Món ăn cộng đồng"
        rightAction={headerAction}
      />
      <View style={styles.tabs}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: selectedView === 'community' }}
          onPress={handleTabCommunity}
          style={[styles.tab, selectedView === 'community' && styles.activeTab]}
        >
          <Text
            style={[
              styles.tabText,
              selectedView === 'community' && styles.activeTabText,
            ]}
          >
            Cộng đồng
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: selectedView === 'mine' }}
          onPress={handleTabMine}
          style={[styles.tab, selectedView === 'mine' && styles.activeTab]}
        >
          <Text
            style={[
              styles.tabText,
              selectedView === 'mine' && styles.activeTabText,
            ]}
          >
            Món của tôi
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: selectedView === 'favorites' }}
          onPress={handleTabFavorites}
          style={[styles.tab, selectedView === 'favorites' && styles.activeTab]}
        >
          <Text
            style={[
              styles.tabText,
              selectedView === 'favorites' && styles.activeTabText,
            ]}
          >
            Yêu thích
          </Text>
        </Pressable>
      </View>
      {loading && meals.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#168653" />
        </View>
      ) : error && meals.length === 0 ? (
        <View style={styles.status}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={handleRetry} style={styles.retryButton}>
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
      <LoginRequiredModal
        visible={loginPromptVisible}
        onClose={handleCloseLoginPrompt}
        onConfirm={handleConfirmLogin}
        title="Đăng nhập để dùng bếp cộng đồng"
        message="Đăng nhập để xem, yêu thích và chia sẻ món ăn cùng cộng đồng."
      />
    </View>
  );
};

export default CommunityMealsScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F8F5',
  },
  shareButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#168653',
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#E8EEE9',
  },
  activeTab: {
    backgroundColor: '#168653',
  },
  tabText: {
    color: '#66756D',
    fontSize: 13,
    fontWeight: '700',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  list: {
    flexGrow: 1,
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 28,
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
    paddingTop: 72,
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
