import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from '../../components/LinearGradient';
import { Calendar } from 'react-native-calendars';
import type { CalendarProps, DateData } from 'react-native-calendars';
import '../../utils/calendarLocale';
import type {
  MealPeriod,
  MealPlanDestination,
  Recipe,
} from '../../utils/types';
import MealPlanDestinationSelector from '../component/MealPlanDestinationSelector';
import {
  formatMealPlanDateLabel,
  getMealPlanDateKey,
} from '../../utils/recipeScreenUtils';
import { createStateSetter } from '../../utils/stateUtils';

type MealPlanComposerModalProps = {
  visible: boolean;
  recipe: Recipe | null;
  destination: MealPlanDestination;
  householdAvailable: boolean;
  saving: boolean;
  initialDate: string;
  onClose: () => void;
  onDestinationChange: (destination: MealPlanDestination) => void;
  onRemoveSelection: () => void;
  onSubmit: (
    date: string,
    mealPeriod: MealPeriod,
    destination: MealPlanDestination,
  ) => void;
};

const MealPlanComposerModal = ({
  visible,
  recipe,
  destination,
  householdAvailable,
  saving,
  initialDate,
  onClose,
  onDestinationChange,
  onRemoveSelection,
  onSubmit,
}: MealPlanComposerModalProps) => {
  const [state, setState] = useState<{
    date: string;
    mealPeriod: MealPeriod;
    dateError: string;
    calendarVisible: boolean;
  }>({
    date: getMealPlanDateKey(destination),
    mealPeriod: 'LUNCH',
    dateError: '',
    calendarVisible: false,
  });
  const { date, mealPeriod, dateError, calendarVisible } = state;
  const setDate = useMemo(() => createStateSetter(setState, 'date'), [setState]);
  const setMealPeriod = useMemo(
    () => createStateSetter(setState, 'mealPeriod'),
    [setState],
  );
  const setDateError = useMemo(
    () => createStateSetter(setState, 'dateError'),
    [setState],
  );
  const setCalendarVisible = useMemo(
    () => createStateSetter(setState, 'calendarVisible'),
    [setState],
  );
  const refs = useRef({ destination });
  refs.current.destination = destination;

  useEffect(() => {
    if (visible) {
      setDate(getMealPlanDateKey(refs.current.destination));
      setMealPeriod('LUNCH');
      setDateError('');
      setCalendarVisible(false);
    }
  }, [
    recipe?.id,
    setCalendarVisible,
    setDate,
    setDateError,
    setMealPeriod,
    visible,
  ]);

  const handleDestinationChange = useCallback(
    (nextDestination: MealPlanDestination) => {
      if (nextDestination === 'HOUSEHOLD') {
        const householdToday = getMealPlanDateKey('HOUSEHOLD');
        if (date < householdToday) {
          setDate(householdToday);
        }
      }
      onDestinationChange(nextDestination);
    },
    [date, onDestinationChange, setDate],
  );

  const handleSelectDate = useCallback(
    (selected: DateData) => {
      setDate(selected.dateString);
      setDateError('');
      setCalendarVisible(false);
    },
    [setCalendarVisible, setDate, setDateError],
  );

  const handleSelectLunch = useCallback(() => {
    setMealPeriod('LUNCH');
  }, [setMealPeriod]);

  const handleSelectDinner = useCallback(() => {
    setMealPeriod('DINNER');
  }, [setMealPeriod]);

  const shiftDate = useCallback(
    (amount: number) => {
      const nextDate = new Date(`${date}T00:00:00.000Z`);
      nextDate.setUTCDate(nextDate.getUTCDate() + amount);
      setDate(nextDate.toISOString().slice(0, 10));
      setDateError('');
    },
    [date, setDate, setDateError],
  );

  const handlePreviousDate = useCallback(() => {
    shiftDate(-1);
  }, [shiftDate]);

  const handleNextDate = useCallback(() => {
    shiftDate(1);
  }, [shiftDate]);

  const handleOpenCalendar = useCallback(() => {
    setCalendarVisible(true);
  }, [setCalendarVisible]);

  const handleCloseCalendar = useCallback(() => {
    setCalendarVisible(false);
  }, [setCalendarVisible]);

  const handleRemoveSelection = useCallback(() => {
    onRemoveSelection();
  }, [onRemoveSelection]);

  const handleSubmit = useCallback(() => {
    const selectedDate = date.trim() || initialDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      setDateError('Nhập ngày theo định dạng YYYY-MM-DD.');
      return;
    }
    const parsedDate = new Date(`${selectedDate}T00:00:00.000Z`);
    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== selectedDate
    ) {
      setDateError('Ngày không hợp lệ.');
      return;
    }
    if (!recipe) {
      return;
    }
    onSubmit(selectedDate, mealPeriod, destination);
  }, [
    date,
    destination,
    initialDate,
    mealPeriod,
    onSubmit,
    recipe,
    setDateError,
  ]);

  const isLunchSelected = mealPeriod === 'LUNCH';
  const previousDateDisabled =
    saving ||
    (destination === 'HOUSEHOLD' &&
      date <= getMealPlanDateKey('HOUSEHOLD'));
  const getPreviousDateButtonStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.dateArrow,
      previousDateDisabled && styles.disabled,
      pressed && !previousDateDisabled && styles.pressed,
    ],
    [previousDateDisabled],
  );
  const getNextDateButtonStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.dateArrow,
      saving && styles.disabled,
      pressed && !saving && styles.pressed,
    ],
    [saving],
  );

  return (
    <>
      <Modal
        animationType="fade"
        transparent
        visible={visible}
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <LinearGradient
            colors={['#FFFFFF', '#F2F8F4']}
            style={styles.modal}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <MealPlanDestinationSelector
                selectedDestination={destination}
                householdAvailable={householdAvailable}
                disabled={saving}
                onSelect={handleDestinationChange}
              />

              <View style={styles.optionsRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isLunchSelected }}
                  disabled={saving}
                  onPress={handleSelectLunch}
                  style={[
                    styles.option,
                    isLunchSelected && styles.optionSelected,
                    saving && styles.disabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      isLunchSelected && styles.optionTextSelected,
                    ]}
                  >
                    Bữa trưa
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: !isLunchSelected }}
                  disabled={saving}
                  onPress={handleSelectDinner}
                  style={[
                    styles.option,
                    !isLunchSelected && styles.optionSelected,
                    saving && styles.disabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      !isLunchSelected && styles.optionTextSelected,
                    ]}
                  >
                    Bữa tối
                  </Text>
                </Pressable>
              </View>

              <View style={styles.dateNavigationRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ngày trước"
                  accessibilityState={{ disabled: previousDateDisabled }}
                  disabled={previousDateDisabled}
                  onPress={handlePreviousDate}
                  style={getPreviousDateButtonStyle}
                >
                  <Text style={styles.dateArrowText}>‹</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ngày thực đơn: ${formatMealPlanDateLabel(
                    date,
                  )}. Chạm để chọn ngày`}
                  accessibilityHint="Mở lịch chọn ngày thực đơn"
                  disabled={saving}
                  onPress={handleOpenCalendar}
                  style={styles.dateButton}
                >
                  <Text style={styles.dateButtonText}>
                    {formatMealPlanDateLabel(date)}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Ngày tiếp theo"
                  accessibilityState={{ disabled: saving }}
                  disabled={saving}
                  onPress={handleNextDate}
                  style={getNextDateButtonStyle}
                >
                  <Text style={styles.dateArrowText}>›</Text>
                </Pressable>
              </View>
              {dateError ? <Text style={styles.error}>{dateError}</Text> : null}

              {recipe ? (
                <View style={styles.selectedMeal}>
                  {recipe.image ? (
                    <Image
                      source={{ uri: recipe.image }}
                      style={styles.image}
                    />
                  ) : (
                    <View style={[styles.image, styles.imagePlaceholder]}>
                      <Text style={styles.imagePlaceholderText}>MC</Text>
                    </View>
                  )}
                  <View style={styles.mealCopy}>
                    <Text numberOfLines={2} style={styles.mealName}>
                      {recipe.name}
                    </Text>
                    {recipe.description ? (
                      <Text numberOfLines={2} style={styles.mealDescription}>
                        {recipe.description}
                      </Text>
                    ) : null}
                    <Text style={styles.mealMeta}>1 khẩu phần</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Bỏ món đang chọn"
                    disabled={saving}
                    onPress={handleRemoveSelection}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeText}>Bỏ</Text>
                  </Pressable>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                disabled={saving || !recipe}
                onPress={handleSubmit}
                style={[styles.saveButton, saving && styles.disabled]}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveText}>
                    {destination === 'HOUSEHOLD' ? 'Đề xuất món' : 'Thêm món'}
                  </Text>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={onClose}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Hủy</Text>
              </Pressable>
            </ScrollView>
          </LinearGradient>
        </View>
      </Modal>
      <Modal
        animationType="fade"
        transparent
        visible={calendarVisible}
        onRequestClose={handleCloseCalendar}
      >
        <View style={styles.calendarOverlay}>
          <LinearGradient
            colors={['#FFFFFF', '#F2F8F4']}
            style={styles.calendarModal}
          >
            <View style={styles.calendarHeader}>
              <View>
                <Text style={styles.calendarTitle}>Chọn ngày thực đơn</Text>
                <Text style={styles.calendarSubtitle}>Mặc định là hôm nay</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={handleCloseCalendar}
                style={styles.calendarCloseButton}
              >
                <Text style={styles.calendarCloseText}>Đóng</Text>
              </Pressable>
            </View>
            <Calendar
              current={date}
              minDate={
                destination === 'HOUSEHOLD'
                  ? getMealPlanDateKey(destination)
                  : undefined
              }
              enableSwipeMonths
              markedDates={
                {
                  [date]: {
                    selected: true,
                    selectedColor: '#168653',
                    selectedTextColor: '#FFFFFF',
                  },
                } satisfies NonNullable<CalendarProps['markedDates']>
              }
              onDayPress={handleSelectDate}
              theme={{
                calendarBackground: '#FFFFFF',
                textSectionTitleColor: '#66756D',
                selectedDayBackgroundColor: '#168653',
                selectedDayTextColor: '#FFFFFF',
                todayTextColor: '#168653',
                dayTextColor: '#172B23',
                textDisabledColor: '#C5CEC9',
                monthTextColor: '#172B23',
                arrowColor: '#168653',
                textMonthFontWeight: '700',
                textDayFontSize: 13,
                textMonthFontSize: 15,
                textDayHeaderFontSize: 11,
              }}
            />
          </LinearGradient>
        </View>
      </Modal>
    </>
  );
};

export default MealPlanComposerModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(14, 30, 22, 0.5)',
  },
  modal: {
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  selectedMeal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 14,
    marginTop: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5EBE7',
  },
  image: { width: 52, height: 52, borderRadius: 12 },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7F4EC',
  },
  imagePlaceholderText: { color: '#168653', fontWeight: '800' },
  mealCopy: { flex: 1 },
  mealName: { color: '#172B23', fontSize: 13, fontWeight: '700' },
  mealDescription: {
    color: '#66756D',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
  mealMeta: { color: '#66756D', fontSize: 11, marginTop: 3 },
  removeButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FEF3F2',
  },
  removeText: { color: '#B42318', fontSize: 11, fontWeight: '700' },
  dateNavigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  dateButton: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 11,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E5EBE7',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  dateButtonText: {
    flexShrink: 1,
    color: '#172B23',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateArrow: {
    width: 38,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5EBE7',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  dateArrowText: {
    color: '#168653',
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '600',
  },
  calendarOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(14, 30, 22, 0.5)',
  },
  calendarModal: {
    padding: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarTitle: { color: '#172B23', fontSize: 16, fontWeight: '800' },
  calendarSubtitle: { color: '#66756D', fontSize: 11, marginTop: 4 },
  calendarCloseButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#E7F4EC',
  },
  calendarCloseText: { color: '#168653', fontSize: 11, fontWeight: '700' },
  error: { color: '#B42318', fontSize: 11, marginTop: 5 },
  optionsRow: { flexDirection: 'row', gap: 9, marginTop: 10 },
  option: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5EBE7',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  optionSelected: {
    borderColor: '#168653',
    backgroundColor: '#E7F4EC',
  },
  optionText: { color: '#66756D', fontSize: 12, fontWeight: '700' },
  optionTextSelected: { color: '#168653' },
  saveButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderRadius: 8,
    backgroundColor: '#168653',
  },
  saveText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.75 },
  cancelButton: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: '#66756D', fontSize: 12, fontWeight: '700' },
});
