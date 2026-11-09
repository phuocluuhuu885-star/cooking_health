import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ScreenHeader from '../component/ScreenHeader';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Calendar } from 'react-native-calendars';
import type { CalendarProps, DateData } from 'react-native-calendars';
import apiConst from '../../abase/constant/apiConst';
import { invalidateCachedConsumptionReports } from '../../reduxs/reduces/appData';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { useAppDispatch } from '../../reduxs/store';
import { createStateSetter } from '../../utils/stateUtils';
import { getVietnamDateKey } from '../../utils/dateUtils';
import { navigate } from '../../utils/navigation';
import ScreenKeys from '../../utils/screenKey';
import { setSyncUser, syncApi } from '../../utils/syncUtils';
import type {
  DailyConsumedMeal,
  DailyConsumedMealsResponse,
} from '../../utils/types';
import DailyConsumedMeals from './dailyConsumedMeals';
import AddConsumedMealModal from './addConsumedMealModal';
import '../../utils/calendarLocale';

const formatDateLabel = (date: string) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

const shiftDate = (date: string, days: number) => {
  const shifted = new Date(`${date}T12:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
};

const DailyConsumedMealsScreen = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useSelector(selectUserInfo);
  const [addMealVisible, setAddMealVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [state, setState] = useState<{
    date: string;
    items: DailyConsumedMeal[];
    loading: boolean;
    error: string;
  }>({
    date: getVietnamDateKey(),
    items: [],
    loading: true,
    error: '',
  });
  const setItems = useMemo(() => createStateSetter(setState, 'items'), []);
  const setLoading = useMemo(() => createStateSetter(setState, 'loading'), []);
  const setError = useMemo(() => createStateSetter(setState, 'error'), []);
  const requestId = useRef(0);
  const handleAddMeal = useCallback(() => setAddMealVisible(true), []);
  const handleCloseAddMeal = useCallback(() => setAddMealVisible(false), []);
  const handleOpenCalendar = useCallback(() => setCalendarVisible(true), []);
  const handleCloseCalendar = useCallback(() => setCalendarVisible(false), []);
  const handlePreviousDate = useCallback(() => {
    setState(previous => ({
      ...previous,
      date: shiftDate(previous.date, -1),
      items: [],
      loading: true,
      error: '',
    }));
  }, []);
  const handleNextDate = useCallback(() => {
    setState(previous => {
      if (previous.date >= getVietnamDateKey()) return previous;
      return {
        ...previous,
        date: shiftDate(previous.date, 1),
        items: [],
        loading: true,
        error: '',
      };
    });
  }, []);
  const handleSelectDate = useCallback((day: DateData) => {
    setState(previous => ({
      ...previous,
      date: day.dateString,
      items: [],
      loading: true,
      error: '',
    }));
    setCalendarVisible(false);
  }, []);
  const markedDates = useMemo(
    () =>
      ({
        [state.date]: {
          selected: true,
          selectedColor: COLORS.green,
          selectedTextColor: COLORS.white,
        },
      }) satisfies NonNullable<CalendarProps['markedDates']>,
    [state.date],
  );

  const loadConsumedMeals = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    const date = state.date;
    setSyncUser(user ?? null);
    if (!user?.accessToken) {
      setItems([]);
      setLoading(false);
      setError('Đăng nhập để xem thực phẩm đã tiêu thụ.');
      return;
    }

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
  }, [setError, setItems, setLoading, state.date, user]);

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
  const isToday = state.date === getVietnamDateKey();
  const canGoForward = state.date < getVietnamDateKey();
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
        backAccessibilityLabel="Quay lại hồ sơ cá nhân"
        rightAction={
          user?.accessToken && isToday ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Thêm món đã ăn"
              onPress={handleAddMeal}
              style={styles.addMealButton}
            >
              <Text style={styles.addMealIcon}>+</Text>
            </Pressable>
          ) : null
        }
      />
      <View style={styles.dateNavigator}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Xem ngày trước"
          onPress={handlePreviousDate}
          style={styles.dateArrow}
        >
          <Text style={styles.dateArrowText}>‹</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Chọn ngày. ${formatDateLabel(state.date)}`}
          onPress={handleOpenCalendar}
          style={styles.selectedDateButton}
        >
          <Text style={styles.selectedDateText}>
            {formatDateLabel(state.date)}
          </Text>
          <Text style={styles.calendarHint}>Nhấn để mở lịch</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Xem ngày tiếp theo"
          accessibilityState={{ disabled: !canGoForward }}
          disabled={!canGoForward}
          onPress={handleNextDate}
          style={[styles.dateArrow, !canGoForward && styles.dateArrowDisabled]}
        >
          <Text
            style={[
              styles.dateArrowText,
              !canGoForward && styles.dateArrowTextDisabled,
            ]}
          >
            ›
          </Text>
        </Pressable>
      </View>

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
          onPressMeal={openMeal}
        />
      </ScrollView>
      <Modal
        animationType="fade"
        transparent
        visible={calendarVisible}
        onRequestClose={handleCloseCalendar}
      >
        <View style={styles.calendarOverlay}>
          <View style={styles.calendarSheet}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Chọn ngày xem</Text>
              <Pressable
                accessibilityRole="button"
                onPress={handleCloseCalendar}
                style={styles.calendarCloseButton}
              >
                <Text style={styles.calendarCloseText}>Đóng</Text>
              </Pressable>
            </View>
            <Calendar
              current={state.date}
              maxDate={getVietnamDateKey()}
              markedDates={markedDates}
              onDayPress={handleSelectDate}
              theme={{
                calendarBackground: COLORS.white,
                textSectionTitleColor: COLORS.secondary,
                selectedDayBackgroundColor: COLORS.green,
                selectedDayTextColor: COLORS.white,
                todayTextColor: COLORS.green,
                arrowColor: COLORS.green,
              }}
            />
          </View>
        </View>
      </Modal>
      <AddConsumedMealModal
        visible={addMealVisible}
        user={user}
        onClose={handleCloseAddMeal}
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
  dateNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  dateArrow: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  dateArrowDisabled: { opacity: 0.45 },
  dateArrowText: {
    marginTop: -4,
    color: COLORS.green,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '500',
  },
  dateArrowTextDisabled: { color: '#A8B3AC' },
  selectedDateButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  selectedDateText: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  calendarHint: { marginTop: 2, color: COLORS.secondary, fontSize: 10 },
  addMealButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#E7F4EC',
  },
  addMealIcon: {
    marginTop: -2,
    color: COLORS.green,
    fontSize: 27,
    lineHeight: 32,
    fontWeight: '500',
  },
  calendarOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: 'rgba(23, 43, 35, 0.35)',
  },
  calendarSheet: {
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: COLORS.white,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  calendarTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  calendarCloseButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#E7F4EC',
  },
  calendarCloseText: { color: COLORS.green, fontSize: 12, fontWeight: '700' },
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
