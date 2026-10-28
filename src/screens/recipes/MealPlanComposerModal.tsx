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
import LinearGradient from 'react-native-linear-gradient';
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
              <Text style={styles.title}>
                {destination === 'HOUSEHOLD'
                  ? 'Đề xuất món cho gia đình'
                  : 'Thêm vào thực đơn cá nhân'}
              </Text>
              <Text style={styles.subtitle}>
                Chọn ngày và bữa ăn.{' '}
                {destination === 'HOUSEHOLD'
                  ? 'Món sẽ được gửi đến gia đình để bình chọn.'
                  : 'Món sẽ được lưu vào thực đơn cá nhân.'}
              </Text>

              <MealPlanDestinationSelector
                selectedDestination={destination}
                householdAvailable={householdAvailable}
                disabled={saving}
                onSelect={handleDestinationChange}
              />

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

              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>Ngày:</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Ngày thực đơn: ${formatMealPlanDateLabel(
                    date,
                  )}. Chạm để chọn ngày`}
                  accessibilityHint="Mở lịch chọn ngày thực đơn"
                  disabled={saving}
                  onPress={() => setCalendarVisible(true)}
                  style={styles.dateButton}
                >
                  <Text style={styles.dateButtonText}>
                    {formatMealPlanDateLabel(date)}
                  </Text>
                  <Text style={styles.dateButtonAction}>Chọn ngày</Text>
                </Pressable>
              </View>
              {dateError ? <Text style={styles.error}>{dateError}</Text> : null}

              <Text style={styles.label}>Bữa ăn</Text>
              <View style={styles.optionsRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isLunchSelected }}
                  onPress={handleSelectLunch}
                  style={[
                    styles.option,
                    isLunchSelected && styles.optionSelected,
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
                  onPress={handleSelectDinner}
                  style={[
                    styles.option,
                    !isLunchSelected && styles.optionSelected,
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
        onRequestClose={() => setCalendarVisible(false)}
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
                onPress={() => setCalendarVisible(false)}
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
    padding: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  title: { color: '#172B23', fontSize: 21, fontWeight: '800' },
  subtitle: { color: '#66756D', fontSize: 13, marginTop: 5 },
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
    borderRadius: 12,
    backgroundColor: '#FEF3F2',
  },
  removeText: { color: '#B42318', fontSize: 11, fontWeight: '700' },
  label: {
    color: '#34463D',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 15,
    marginBottom: 7,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 15,
  },
  dateLabel: {
    color: '#34463D',
    fontSize: 12,
    fontWeight: '700',
  },
  dateButton: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#E5EBE7',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  dateButtonText: {
    flexShrink: 1,
    color: '#172B23',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateButtonAction: {
    color: '#168653',
    fontSize: 10,
    fontWeight: '800',
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
    borderRadius: 12,
    backgroundColor: '#E7F4EC',
  },
  calendarCloseText: { color: '#168653', fontSize: 11, fontWeight: '700' },
  error: { color: '#B42318', fontSize: 11, marginTop: 5 },
  optionsRow: { flexDirection: 'row', gap: 9 },
  option: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5EBE7',
    borderRadius: 12,
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
    borderRadius: 12,
    backgroundColor: '#168653',
  },
  saveText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  cancelButton: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: '#66756D', fontSize: 12, fontWeight: '700' },
});
