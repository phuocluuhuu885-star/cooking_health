import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Calendar } from 'react-native-calendars';
import type { CalendarProps, DateData } from 'react-native-calendars';
import type { MealPeriod } from '../../utils/types';
import '../../utils/calendarLocale';
import { createStateSetter } from '../../utils/stateUtils';
import {
  getDefaultMealDeadlineSelection,
  getTodayMealDeadlineDate,
} from '../../utils/householdScreenUtils';

type Props = {
  visible: boolean;
  date: string;
  mealPeriod: MealPeriod;
  closesAt: string | null;
  defaultCloseTime: string;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (closesAt: string) => void;
};

const HouseholdPollScheduleModal = ({
  visible,
  date,
  mealPeriod,
  closesAt,
  defaultCloseTime,
  saving,
  onCancel,
  onConfirm,
}: Props) => {
  const [state, setState] = useState({
    selectedDate: date,
    selectedTime: '11:00',
    error: '',
  });
  const { selectedDate, selectedTime, error } = state;
  const setSelectedDate = useMemo(
    () => createStateSetter(setState, 'selectedDate'),
    [setState],
  );
  const setSelectedTime = useMemo(
    () => createStateSetter(setState, 'selectedTime'),
    [setState],
  );
  const setError = useMemo(
    () => createStateSetter(setState, 'error'),
    [setState],
  );
  const mealLabel = mealPeriod === 'LUNCH' ? 'bữa trưa' : 'bữa tối';

  useEffect(() => {
    if (!visible) {
      return;
    }
    const initial = getDefaultMealDeadlineSelection(
      date,
      mealPeriod,
      closesAt,
      defaultCloseTime,
    );
    setSelectedDate(initial.date);
    setSelectedTime(initial.time);
    setError('');
  }, [
    closesAt,
    date,
    defaultCloseTime,
    mealPeriod,
    setError,
    setSelectedDate,
    setSelectedTime,
    visible,
  ]);

  const markedDates: NonNullable<CalendarProps['markedDates']> = {
    [selectedDate]: {
      selected: true,
      selectedColor: COLORS.green,
      selectedTextColor: COLORS.white,
    },
  };

  const handleSelectDate = (day: DateData) => {
    setSelectedDate(day.dateString);
    setError('');
  };

  const handleConfirm = () => {
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(selectedTime)) {
      setError('Nhập giờ theo định dạng HH:mm, ví dụ 18:30.');
      return;
    }
    const closesAtValue = new Date(`${selectedDate}T${selectedTime}:00+07:00`);
    if (
      Number.isNaN(closesAtValue.getTime()) ||
      closesAtValue.getTime() <= Date.now()
    ) {
      setError('Thời hạn bình chọn phải nằm trong tương lai.');
      return;
    }
    onConfirm(closesAtValue.toISOString());
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={saving ? undefined : onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <LinearGradient
            colors={['#FFFFFF', '#F3FAF5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>Thời hạn bình chọn</Text>
              <Text style={styles.subtitle}>
                Áp dụng cho {mealLabel} này và làm giờ mặc định cho các ngày
                sau.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={onCancel}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>Đóng</Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.label}>Chọn ngày kết thúc</Text>
            <Calendar
              current={selectedDate}
              minDate={
                date > getTodayMealDeadlineDate()
                  ? date
                  : getTodayMealDeadlineDate()
              }
              enableSwipeMonths
              markedDates={markedDates}
              onDayPress={handleSelectDate}
              theme={{
                calendarBackground: COLORS.white,
                textSectionTitleColor: COLORS.secondary,
                selectedDayBackgroundColor: COLORS.green,
                selectedDayTextColor: COLORS.white,
                todayTextColor: COLORS.green,
                dayTextColor: COLORS.text,
                textDisabledColor: '#C5CEC9',
                monthTextColor: COLORS.text,
                arrowColor: COLORS.green,
                textMonthFontWeight: '700',
                textDayFontSize: 12,
                textMonthFontSize: 14,
                textDayHeaderFontSize: 10,
              }}
            />

            <Text style={styles.label}>Chọn giờ kết thúc</Text>
            <TextInput
              accessibilityLabel={`Giờ kết thúc bình chọn ${mealLabel}`}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              onChangeText={value => {
                setSelectedTime(value.replace(/[^\d:]/g, '').slice(0, 5));
                setError('');
              }}
              placeholder="HH:mm"
              placeholderTextColor={COLORS.secondary}
              style={styles.timeInput}
              value={selectedTime}
            />
            <Text style={styles.timeHint}>Giờ Việt Nam (UTC+7)</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={handleConfirm}
              style={[styles.saveButton, saving && styles.disabled]}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.saveText}>Lưu thời hạn cho cả bữa</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={onCancel}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Hủy</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default memo(HouseholdPollScheduleModal);

const COLORS = {
  green: '#168653',
  text: '#172B23',
  secondary: '#66756D',
  border: '#E5EBE7',
  white: '#FFFFFF',
  background: '#F5F7F5',
  danger: '#B42318',
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(14, 30, 22, 0.5)',
  },
  sheet: {
    maxHeight: '94%',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  headerCopy: { flex: 1 },
  title: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  subtitle: {
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  closeButton: { paddingHorizontal: 4, paddingVertical: 4 },
  closeText: { color: COLORS.green, fontSize: 12, fontWeight: '700' },
  label: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 7,
  },
  timeInput: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    color: COLORS.text,
  },
  timeHint: { color: COLORS.secondary, fontSize: 10, marginTop: 5 },
  error: { color: COLORS.danger, fontSize: 11, marginTop: 7 },
  saveButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: COLORS.green,
  },
  saveText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  cancelButton: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: COLORS.secondary, fontSize: 12, fontWeight: '700' },
});
