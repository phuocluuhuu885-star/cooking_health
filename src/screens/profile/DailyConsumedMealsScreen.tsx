import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import ScreenHeader from '../component/ScreenHeader';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import apiConst from '../../abase/constant/apiConst';
import { invalidateCachedConsumptionReports } from '../../reduxs/reduces/appData';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { useAppDispatch } from '../../reduxs/store';
import { createStateSetter } from '../../utils/stateUtils';
import { navigate } from '../../utils/navigation';
import ScreenKeys from '../../utils/screenKey';
import { setSyncUser, syncApi } from '../../utils/syncUtils';
import type {
  DailyConsumedMeal,
  DailyConsumedMealsResponse,
} from '../../utils/types';
import DailyConsumedMeals from './dailyConsumedMeals';
import AddConsumedMealModal from './addConsumedMealModal';

const getTodayDateKey = () => new Date().toISOString().slice(0, 10);

const DailyConsumedMealsScreen = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useSelector(selectUserInfo);
  const [addMealVisible, setAddMealVisible] = useState(false);
  const [state, setState] = useState<{
    date: string;
    items: DailyConsumedMeal[];
    loading: boolean;
    error: string;
  }>({
    date: getTodayDateKey(),
    items: [],
    loading: true,
    error: '',
  });
  const setItems = useMemo(() => createStateSetter(setState, 'items'), []);
  const setLoading = useMemo(() => createStateSetter(setState, 'loading'), []);
  const setError = useMemo(() => createStateSetter(setState, 'error'), []);
  const requestId = useRef(0);

  const loadConsumedMeals = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    const date = getTodayDateKey();
    setSyncUser(user ?? null);
    if (!user?.accessToken) {
      setItems([]);
      setLoading(false);
      setError('Đăng nhập để xem thực phẩm đã tiêu thụ.');
      setState(previous => ({ ...previous, date }));
      return;
    }

    setState(previous => ({ ...previous, date }));
    setLoading(true);
    setError('');
    try {
      const response = (await syncApi(apiConst.getDailyConsumedMeals, {
        date,
      })) as DailyConsumedMealsResponse;
      if (currentRequestId !== requestId.current) return;
      if (
        !response?.success ||
        !response.data ||
        response.data.date !== date ||
        !Array.isArray(response.data.items)
      ) {
        setError(response?.message || 'Không thể tải danh sách món đã ăn.');
        return;
      }
      setItems(response.data.items);
    } catch (error) {
      if (currentRequestId === requestId.current) {
        console.error('Failed to load daily consumed meals', error);
        setError(
          error instanceof Error
            ? error.message
            : 'Không thể kết nối để tải danh sách món đã ăn.',
        );
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, [setError, setItems, setLoading, user]);

  useFocusEffect(
    useCallback(() => {
      loadConsumedMeals();
      return () => {
        requestId.current += 1;
      };
    }, [loadConsumedMeals]),
  );

  const openMeal = useCallback((mealId: string) => {
    navigate(ScreenKeys.RECIPE_DETAIL, { mealId });
  }, []);
  const handleMealSaved = useCallback(async () => {
    if (user?.id) {
      dispatch(invalidateCachedConsumptionReports({ userId: user.id }));
    }
    await loadConsumedMeals();
  }, [dispatch, loadConsumedMeals, user?.id]);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        eyebrow="NHẬT KÝ DINH DƯỠNG"
        title="Thực phẩm đã tiêu thụ"
        subtitle={state.date}
        backAccessibilityLabel="Quay lại hồ sơ cá nhân"
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 18 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <DailyConsumedMeals
          items={state.items}
          loading={state.loading}
          error={state.error}
          onRetry={loadConsumedMeals}
          onAddMeal={
            user?.accessToken ? () => setAddMealVisible(true) : undefined
          }
          onPressMeal={openMeal}
        />
      </ScrollView>
      <AddConsumedMealModal
        visible={addMealVisible}
        user={user}
        onClose={() => setAddMealVisible(false)}
        onSaved={handleMealSaved}
      />
    </View>
  );
};

export default DailyConsumedMealsScreen;

const COLORS = {
  background: '#F5F7F5',
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  white: '#FFFFFF',
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 18,
  },
  content: { flexGrow: 1 },
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
  title: { marginTop: 2, color: COLORS.text, fontSize: 18, fontWeight: '800' },
  subtitle: { marginTop: 2, color: COLORS.secondary, fontSize: 11 },
});
