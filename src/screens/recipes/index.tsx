import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ItemProduct from './itemProduct';
import CategoryItem from './categoryItem';
import { syncApi, setSyncUser } from '../../utils/syncUtils';
import apiConst from '../../abase/constant/apiConst';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { useSelector } from 'react-redux';
import {
  appendMealCatalog,
  cacheMealCatalog,
  cacheCurrentHousehold,
  invalidateCachedHouseholdMealPlan,
  invalidateCachedMealPlan,
  selectCurrentHousehold,
  selectHouseholdLoaded,
  selectMealCatalog,
  selectMealCatalogLoaded,
  selectMealPlanDestination,
  setMealPlanDestination,
} from '../../reduxs/reduces/appData';
import { useAppDispatch } from '../../reduxs/store';
import { navigate } from '../../utils/navigation';
import ScreenKeys from '../../utils/screenKey';
import { fetchCurrentHousehold } from '../../utils/householdApi';
import { addMealToPlan } from '../../utils/mealPlanApi';
import type {
  Category,
  MealPeriod,
  MealPlanDestination,
  MealsResponse,
  Recipe,
  RecipeLibraryState,
} from '../../utils/types';
import MealPlanComposerModal from './MealPlanComposerModal';
import { fetchMealReviewSummaries } from '../../utils/mealReviewApi';
import { findRecipe, toRecipe } from '../../utils/recipeScreenUtils';
import { createStateSetter } from '../../utils/stateUtils';

const CATEGORIES: Category[] = [
  { id: 'all', title: 'Tất cả' },
  { id: 'BREAKFAST', title: 'Bữa sáng' },
  { id: 'LUNCH', title: 'Bữa trưa' },
  { id: 'DINNER', title: 'Bữa tối' },
  { id: 'SNACK', title: 'Ăn nhẹ' },
];

const RecipeLibrary = () => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const dispatch = useAppDispatch();
  const user = useSelector(selectUserInfo);
  const household = useSelector(selectCurrentHousehold);
  const householdLoaded = useSelector(selectHouseholdLoaded);
  const mealPlanDestination = useSelector(selectMealPlanDestination);
  const cachedMeals = useSelector(selectMealCatalog);
  const catalogLoaded = useSelector(selectMealCatalogLoaded);
  const refs = useRef({ activeQueryKey: '' });
  const [state, setState] = useState<RecipeLibraryState>({
    search: '',
    selectedCategory: 'all',
    favorites: [],
    favoritesOnly: false,
    recipes: [],
    loading: true,
    error: '',
    reloadIndex: 0,
    page: 1,
    hasNextPage: false,
    loadingMore: false,
    selectedRecipe: null,
    reviewSummaries: {},
    composerVisible: false,
    composerSaving: false,
  });
  const { selectedRecipe, reviewSummaries, composerVisible, composerSaving } =
    state;
  const setSelectedRecipe = useMemo(
    () => createStateSetter(setState, 'selectedRecipe'),
    [setState],
  );
  const setReviewSummaries = useMemo(
    () => createStateSetter(setState, 'reviewSummaries'),
    [setState],
  );
  const setComposerVisible = useMemo(
    () => createStateSetter(setState, 'composerVisible'),
    [setState],
  );
  const setComposerSaving = useMemo(
    () => createStateSetter(setState, 'composerSaving'),
    [setState],
  );

  const horizontalPadding = screenWidth >= 600 ? 24 : 16;
  const cardWidth = screenWidth - horizontalPadding * 2;

  useEffect(() => {
    setSyncUser(user ?? null);
    let isCurrentRequest = true;
    const queryKey = `${state.search.trim()}|${state.selectedCategory}`;
    refs.current.activeQueryKey = queryKey;
    setState(previous => ({
      ...previous,
      loading: true,
      loadingMore: false,
      error: '',
      page: 1,
      hasNextPage: false,
    }));
    const timeout = setTimeout(
      async () => {
        const isSearch = state.search.trim().length > 0;
        const endpoint = isSearch ? apiConst.searchMeals : apiConst.getAllMeal;
        const request = isSearch
          ? {
              q: state.search.trim(),
              page: 1,
              limit: 100,
              ...(state.selectedCategory !== 'all'
                ? { category: state.selectedCategory }
                : {}),
            }
          : {
              page: 1,
              limit: 100,
              ...(state.selectedCategory !== 'all'
                ? { category: state.selectedCategory }
                : {}),
            };

        try {
          const response = (await syncApi(endpoint, request)) as MealsResponse;
          const meals = response?.data;
          if (!isCurrentRequest) {
            return;
          }
          if (!response?.success || !Array.isArray(meals)) {
            setState(previous => ({
              ...previous,
              recipes: [],
              error: response?.message || 'Không thể tải danh sách món ăn',
            }));
            return;
          }
          setState(previous => ({
            ...previous,
            recipes: meals.map(toRecipe),
            page: 1,
            hasNextPage: response.pagination?.hasNextPage ?? false,
          }));
          if (!isSearch && state.selectedCategory === 'all') {
            dispatch(
              cacheMealCatalog({
                userId: user?.id ?? 'guest',
                meals,
              }),
            );
          }
        } catch {
          if (isCurrentRequest) {
            setState(previous => ({
              ...previous,
              recipes: [],
              error: 'Không thể kết nối để tải danh sách món ăn',
            }));
          }
        } finally {
          if (isCurrentRequest) {
            setState(previous => ({ ...previous, loading: false }));
          }
        }
      },
      state.search.trim() ? 300 : 0,
    );

    return () => {
      isCurrentRequest = false;
      clearTimeout(timeout);
    };
  }, [dispatch, state.search, state.selectedCategory, state.reloadIndex, user]);

  const loadMoreRecipes = useCallback(async () => {
    if (state.loading || state.loadingMore || !state.hasNextPage) {
      return;
    }

    const queryKey = `${state.search.trim()}|${state.selectedCategory}`;
    const page = state.page + 1;
    const isSearch = state.search.trim().length > 0;
    const endpoint = isSearch ? apiConst.searchMeals : apiConst.getAllMeal;
    const request = {
      ...(isSearch ? { q: state.search.trim() } : {}),
      page,
      limit: 100,
      ...(state.selectedCategory !== 'all'
        ? { category: state.selectedCategory }
        : {}),
    };
    setState(previous => ({ ...previous, loadingMore: true }));

    try {
      const response = (await syncApi(endpoint, request)) as MealsResponse;
      if (refs.current.activeQueryKey !== queryKey) {
        return;
      }
      const meals = response?.data;
      if (!response?.success || !Array.isArray(meals)) {
        Alert.alert(
          'Không thể tải thêm món',
          response?.message || 'Vui lòng thử lại.',
        );
        return;
      }
      setState(previous => ({
        ...previous,
        recipes: [...previous.recipes, ...meals.map(toRecipe)],
        page,
        hasNextPage: response.pagination?.hasNextPage ?? false,
      }));
      if (!isSearch && state.selectedCategory === 'all') {
        dispatch(
          appendMealCatalog({
            userId: user?.id ?? 'guest',
            meals,
          }),
        );
      }
    } catch {
      if (refs.current.activeQueryKey === queryKey) {
        Alert.alert('Không thể tải thêm món', 'Vui lòng thử lại sau.');
      }
    } finally {
      if (refs.current.activeQueryKey === queryKey) {
        setState(previous => ({ ...previous, loadingMore: false }));
      }
    }
  }, [
    state.hasNextPage,
    state.loading,
    state.loadingMore,
    state.page,
    state.search,
    state.selectedCategory,
    dispatch,
    user,
  ]);

  const handleSearch = useCallback((value: string) => {
    setState(prev => ({
      ...prev,
      search: value,
    }));
  }, []);

  const handleClearSearch = useCallback(() => {
    handleSearch('');
  }, [handleSearch]);

  const handleCategory = useCallback((categoryId: string) => {
    setState(prev => ({
      ...prev,
      selectedCategory: categoryId,
    }));
  }, []);

  const handleFavorite = useCallback((recipeId: string) => {
    setState(prev => ({
      ...prev,
      favorites: prev.favorites.includes(recipeId)
        ? prev.favorites.filter(id => id !== recipeId)
        : [...prev.favorites, recipeId],
    }));
  }, []);

  const toggleFavoritesOnly = useCallback(() => {
    setState(previous => ({
      ...previous,
      favoritesOnly: !previous.favoritesOnly,
    }));
  }, []);

  const handleAddRecipe = useCallback(
    async (recipeId: string) => {
      if (!user?.accessToken) {
        Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để lên thực đơn.');
        return;
      }

      let activeHousehold = household;
      let householdLookupError = '';
      if (!householdLoaded) {
        try {
          const householdResponse = await fetchCurrentHousehold(user);
          if (
            !householdResponse?.success ||
            householdResponse.data === undefined
          ) {
            householdLookupError =
              householdResponse?.message || 'Vui lòng thử lại sau.';
          } else {
            activeHousehold = householdResponse.data;
            dispatch(
              cacheCurrentHousehold({
                userId: user.id,
                household: activeHousehold,
              }),
            );
          }
        } catch (error) {
          householdLookupError =
            error instanceof Error ? error.message : 'Vui lòng thử lại sau.';
        }
      }
      const recipe = findRecipe(recipeId, state.recipes, cachedMeals);
      if (!recipe) {
        Alert.alert('Không thể thêm món', 'Không tìm thấy thông tin món ăn.');
        return;
      }
      const openComposer = () => {
        setSelectedRecipe(recipe);
        setComposerVisible(true);
      };
      if (householdLookupError) {
        Alert.alert(
          'Không thể kiểm tra gia đình',
          `${householdLookupError} Bạn vẫn có thể thêm món vào thực đơn cá nhân.`,
          [
            {
              text: 'Tiếp tục cá nhân',
              onPress: () => {
                dispatch(
                  setMealPlanDestination({
                    userId: user.id,
                    destination: 'PERSONAL',
                  }),
                );
                openComposer();
              },
            },
            { text: 'Hủy', style: 'cancel' },
          ],
        );
        return;
      }
      if (!activeHousehold && mealPlanDestination === 'HOUSEHOLD') {
        dispatch(
          setMealPlanDestination({
            userId: user.id,
            destination: 'PERSONAL',
          }),
        );
      }
      openComposer();
    },
    [
      cachedMeals,
      dispatch,
      householdLoaded,
      household,
      mealPlanDestination,
      setComposerVisible,
      setSelectedRecipe,
      state.recipes,
      user,
    ],
  );

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

  const handleCloseComposer = useCallback(() => {
    if (composerSaving) {
      return;
    }
    setComposerVisible(false);
  }, [composerSaving, setComposerVisible]);

  const handleRemoveSelectedRecipe = useCallback(() => {
    setSelectedRecipe(null);
    setComposerVisible(false);
  }, [setComposerVisible, setSelectedRecipe]);

  const handleSubmitMealPlan = useCallback(
    async (
      date: string,
      mealPeriod: MealPeriod,
      destination: MealPlanDestination,
    ) => {
      if (!user?.accessToken || !selectedRecipe) {
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
              householdResponse?.message || 'Vui lòng thử lại.',
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
            'Hãy tạo hoặc tham gia gia đình trước khi đề xuất món.',
            [
              { text: 'Để sau', style: 'cancel' },
              {
                text: 'Mở Gia đình',
                onPress: () => navigate(ScreenKeys.FAMILY),
              },
            ],
          );
          return;
        }
        const response = await addMealToPlan(user, destination, {
          mealId: selectedRecipe.id,
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
        setSelectedRecipe(null);
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
      selectedRecipe,
      setComposerSaving,
      setComposerVisible,
      setSelectedRecipe,
      user,
    ],
  );

  const handleRecipePress = useCallback((recipeId: string) => {
    navigate(ScreenKeys.RECIPE_DETAIL, { mealId: recipeId });
  }, []);

  const isUnfilteredCatalog =
    state.search.trim().length === 0 && state.selectedCategory === 'all';
  const reviewMealIds = (
    isUnfilteredCatalog && catalogLoaded
      ? cachedMeals.map(meal => meal.id)
      : state.recipes.map(recipe => recipe.id)
  ).join(',');

  useFocusEffect(
    useCallback(() => {
      if (!reviewMealIds) {
        return undefined;
      }
      let active = true;
      fetchMealReviewSummaries(reviewMealIds.split(','))
        .then(summaries => {
          if (active) {
            setReviewSummaries(previous => ({
              ...previous,
              ...Object.fromEntries(
                summaries.map(summary => [summary.mealId, summary]),
              ),
            }));
          }
        })
        .catch(error => {
          console.warn('Failed to load recipe review summaries', error);
        });
      return () => {
        active = false;
      };
    }, [reviewMealIds, setReviewSummaries]),
  );

  const handleRetry = useCallback(() => {
    setState(previous => ({
      ...previous,
      reloadIndex: previous.reloadIndex + 1,
    }));
  }, []);

  const renderCategory = useCallback(
    ({ item }: { item: Category }) => (
      <CategoryItem
        item={item}
        selected={state.selectedCategory === item.id}
        onPress={handleCategory}
      />
    ),
    [state.selectedCategory, handleCategory],
  );

  const renderRecipe = useCallback(
    ({ item }: { item: Recipe }) => (
      <ItemProduct
        item={item}
        width={cardWidth}
        isFavorite={state.favorites.includes(item.id)}
        onFavorite={handleFavorite}
        onAdd={handleAddRecipe}
        onPress={handleRecipePress}
        reviewSummary={reviewSummaries[item.id]}
      />
    ),
    [
      cardWidth,
      state.favorites,
      handleFavorite,
      handleAddRecipe,
      handleRecipePress,
      reviewSummaries,
    ],
  );

  const keyExtractorCategory = useCallback((item: Category) => item.id, []);

  const keyExtractorRecipe = useCallback((item: Recipe) => item.id, []);
  const catalogRecipes =
    isUnfilteredCatalog && catalogLoaded
      ? cachedMeals.map(toRecipe)
      : state.recipes;
  const displayedRecipes = state.favoritesOnly
    ? catalogRecipes.filter(recipe => state.favorites.includes(recipe.id))
    : catalogRecipes;
  const listHeader = (
    <View style={styles.listHeader}>
      <View>
        <Text style={styles.listTitle}>
          {state.favoritesOnly ? 'Món yêu thích' : 'Công thức dành cho bạn'}
        </Text>
        <Text style={styles.listSubtitle}>
          {displayedRecipes.length} món ngon đang chờ bạn khám phá
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: state.favoritesOnly }}
        accessibilityLabel={
          state.favoritesOnly
            ? 'Hiển thị tất cả công thức'
            : 'Chỉ hiển thị món yêu thích'
        }
        onPress={toggleFavoritesOnly}
        style={[
          styles.favoritesFilter,
          state.favoritesOnly && styles.favoritesFilterSelected,
        ]}
      >
        <Text
          style={[
            styles.favoritesFilterIcon,
            state.favoritesOnly && styles.favoritesFilterIconSelected,
          ]}
        >
          {state.favoritesOnly ? '♥' : '♡'}
        </Text>
        <Text
          style={[
            styles.favoritesFilterText,
            state.favoritesOnly && styles.favoritesFilterTextSelected,
          ]}
        >
          Yêu thích
        </Text>
      </Pressable>
    </View>
  );

  const listEmty = useCallback(() => {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptySymbol}>
          {state.favoritesOnly ? '♡' : '🍽'}
        </Text>
        <Text style={styles.emptyTitle}>
          {state.favoritesOnly ? 'Chưa có món yêu thích' : 'Chưa tìm thấy món'}
        </Text>
        <Text style={styles.emptyText}>
          {state.favoritesOnly
            ? 'Chạm vào trái tim trên món ăn để lưu lại nhé.'
            : 'Thử đổi từ khóa hoặc chọn danh mục khác.'}
        </Text>
      </View>
    );
  }, [state.favoritesOnly]);

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <View style={styles.container}>
        <View
          style={[
            styles.header,
            {
              paddingHorizontal: horizontalPadding,
            },
          ]}
        >
          <Text style={styles.eyebrow}>BẾP CỦA BẠN</Text>
          <Text style={styles.title}>Khám phá món ngon</Text>
          <Text style={styles.subtitle}>Tìm cảm hứng cho bữa ăn tiếp theo</Text>
        </View>

        <View
          style={[
            styles.searchContainer,
            {
              marginHorizontal: horizontalPadding,
            },
          ]}
        >
          <Text accessibilityElementsHidden style={styles.searchIcon}>
            ⌕
          </Text>
          <TextInput
            value={state.search}
            onChangeText={handleSearch}
            maxLength={100}
            placeholder="Tìm món ăn hoặc nguyên liệu"
            placeholderTextColor="#8A9790"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {state.search.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xóa nội dung tìm kiếm"
              hitSlop={10}
              onPress={handleClearSearch}
              style={styles.clearSearch}
            >
              <Text style={styles.clearSearchText}>×</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.categoryWrapper}>
          <FlatList
            horizontal
            data={CATEGORIES}
            renderItem={renderCategory}
            keyExtractor={keyExtractorCategory}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.categoryList,
              { paddingHorizontal: horizontalPadding },
            ]}
          />
        </View>

        {state.loading && displayedRecipes.length === 0 ? (
          <View style={styles.statusContainer}>
            <ActivityIndicator color="#17A673" />
          </View>
        ) : state.error && displayedRecipes.length === 0 ? (
          <View style={styles.statusContainer}>
            <Text style={styles.errorText}>{state.error}</Text>
            <Pressable onPress={handleRetry}>
              <Text style={styles.retryText}>Thử tìm lại</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={displayedRecipes}
            renderItem={renderRecipe}
            keyExtractor={keyExtractorRecipe}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMoreRecipes}
            onEndReachedThreshold={0.5}
            contentContainerStyle={[
              styles.list,
              { paddingHorizontal: horizontalPadding },
            ]}
            ListEmptyComponent={listEmty}
            ListHeaderComponent={
              state.error ? (
                <View>
                  {listHeader}
                  <View style={styles.inlineError}>
                    <Text style={styles.errorText}>{state.error}</Text>
                    <Pressable onPress={handleRetry}>
                      <Text style={styles.retryText}>Thử tải lại</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                listHeader
              )
            }
            ListFooterComponent={
              state.loadingMore ? (
                <ActivityIndicator color="#17A673" style={styles.listFooter} />
              ) : undefined
            }
          />
        )}
      </View>
      <MealPlanComposerModal
        visible={composerVisible}
        recipe={selectedRecipe}
        destination={mealPlanDestination}
        householdAvailable={Boolean(household)}
        saving={composerSaving}
        initialDate={new Date().toISOString().slice(0, 10)}
        onClose={handleCloseComposer}
        onDestinationChange={handleDestinationChange}
        onRemoveSelection={handleRemoveSelectedRecipe}
        onSubmit={handleSubmitMealPlan}
      />
    </View>
  );
};

export default RecipeLibrary;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F8F5',
    marginBottom: 48,
  },
  list: {
    paddingTop: 7,
    paddingBottom: 34,
    gap: 14,
  },
  container: {
    flex: 1,
    gap: 0,
  },

  header: {
    paddingTop: 14,
    paddingBottom: 14,
  },
  eyebrow: {
    color: '#168653',
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  title: {
    marginTop: 5,
    fontSize: 21,
    fontWeight: '800',
    color: '#172B23',
    letterSpacing: -0.7,
  },
  subtitle: {
    marginTop: 4,
    color: '#748078',
    fontSize: 14,
  },
  searchContainer: {
    height: 50,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5ECE6',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    shadowColor: '#193A2A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
    color: '#168653',
    fontSize: 16,
    lineHeight: 20,
  },
  searchInput: {
    flex: 1,
    height: 48,
    paddingVertical: 0,
    fontSize: 12,
    color: '#172B23',
  },
  clearSearch: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#EEF3EF',
  },
  clearSearchText: {
    color: '#68766E',
    fontSize: 16,
    lineHeight: 20,
  },
  categoryWrapper: {
    height: 52,
    justifyContent: 'center',
  },
  categoryList: {
    gap: 9,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 9,
    paddingBottom: 5,
  },
  listTitle: {
    color: '#172B23',
    fontSize: 16,
    fontWeight: '800',
  },
  listSubtitle: {
    marginTop: 3,
    color: '#87928B',
    fontSize: 14,
  },
  favoritesFilter: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E3EAE4',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  favoritesFilterSelected: {
    borderColor: '#F2C9C5',
    backgroundColor: '#FFF3F2',
  },
  favoritesFilterIcon: {
    color: '#68766E',
    fontSize: 16,
  },
  favoritesFilterIconSelected: {
    color: '#E45D57',
  },
  favoritesFilterText: {
    color: '#56665E',
    fontSize: 14,
    fontWeight: '700',
  },
  favoritesFilterTextSelected: {
    color: '#C84D47',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 55,
    paddingHorizontal: 20,
  },
  emptySymbol: {
    color: '#168653',
    fontSize: 16,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#34483D',
  },
  emptyText: {
    marginTop: 5,
    fontSize: 12,
    color: '#87928B',
    textAlign: 'center',
  },
  statusContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#B42318',
    fontSize: 14,
  },
  inlineError: {
    paddingVertical: 8,
    textAlign: 'center',
  },
  retryText: {
    color: '#168653',
    fontWeight: '700',
    marginTop: 12,
  },
  listFooter: {
    paddingVertical: 16,
  },
});
