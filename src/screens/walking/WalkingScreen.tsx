import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack } from '../../utils/navigation';
import { useSelector } from 'react-redux';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { getDailyConsumedMeals } from '../../utils/mealPlanApi';
import { getVietnamDateKey } from '../../utils/dateUtils';
import {
  getWalkingSummary,
  getWalkingWorkoutHistory,
} from '../../utils/walkingApi';
import type {
  WalkingSummary,
  WalkingWorkout,
} from '../../utils/types/walking';
import type { DailyConsumedMealsResponse } from '../../utils/types/meal';
import useWalkingWorkout from './useWalkingWorkout';
import {
  formatWalkingDuration,
  formatWorkoutDate,
  getWalkingPeriodRange,
  summarizeDailyCalorieIntake,
  type WalkingSummaryPeriod,
} from '../../utils/walkingScreenUtils';
import { createStateSetter } from '../../utils/stateUtils';

type SummaryPeriod = WalkingSummaryPeriod;

const SUMMARY_PERIODS: Array<{ id: SummaryPeriod; label: string }> = [
  { id: 'DAY', label: 'Hôm nay' },
  { id: 'WEEK', label: 'Tuần này' },
  { id: 'MONTH', label: 'Tháng này' },
];

const WalkingScreen = () => {
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUserInfo);
  const walking = useWalkingWorkout();
  const { startWorkout, finishWorkout } = walking;
  const workoutStatus = walking.workout?.status;
  const [state, setState] = useState<{
    weightInput: string;
    period: SummaryPeriod;
    summary: WalkingSummary | null;
    history: WalkingWorkout[];
    historyLoading: boolean;
    historyError: string;
    summaryLoading: boolean;
    summaryError: string;
    consumedCalories: number | null;
    incompleteCalorieMeals: number;
    intakeLoading: boolean;
    intakeError: string;
  }>({
    weightInput: user?.healthProfile?.weightKg?.toString() ?? '',
    period: 'DAY',
    summary: null,
    history: [],
    historyLoading: true,
    historyError: '',
    summaryLoading: true,
    summaryError: '',
    consumedCalories: null,
    incompleteCalorieMeals: 0,
    intakeLoading: true,
    intakeError: '',
  });
  const {
    weightInput,
    period,
    summary,
    history,
    historyLoading,
    historyError,
    summaryLoading,
    summaryError,
    consumedCalories,
    incompleteCalorieMeals,
    intakeLoading,
    intakeError,
  } = state;
  const setWeightInput = useMemo(
    () => createStateSetter(setState, 'weightInput'),
    [setState],
  );
  const setPeriod = useMemo(
    () => createStateSetter(setState, 'period'),
    [setState],
  );
  const setSummary = useMemo(
    () => createStateSetter(setState, 'summary'),
    [setState],
  );
  const setHistory = useMemo(
    () => createStateSetter(setState, 'history'),
    [setState],
  );
  const setHistoryLoading = useMemo(
    () => createStateSetter(setState, 'historyLoading'),
    [setState],
  );
  const setHistoryError = useMemo(
    () => createStateSetter(setState, 'historyError'),
    [setState],
  );
  const setSummaryLoading = useMemo(
    () => createStateSetter(setState, 'summaryLoading'),
    [setState],
  );
  const setSummaryError = useMemo(
    () => createStateSetter(setState, 'summaryError'),
    [setState],
  );
  const setConsumedCalories = useMemo(
    () => createStateSetter(setState, 'consumedCalories'),
    [setState],
  );
  const setIncompleteCalorieMeals = useMemo(
    () => createStateSetter(setState, 'incompleteCalorieMeals'),
    [setState],
  );
  const setIntakeLoading = useMemo(
    () => createStateSetter(setState, 'intakeLoading'),
    [setState],
  );
  const setIntakeError = useMemo(
    () => createStateSetter(setState, 'intakeError'),
    [setState],
  );
  const range = useMemo(() => getWalkingPeriodRange(period), [period]);
  const today = getVietnamDateKey();
  const parsedWeight = Number(weightInput);
  const weightIsValid =
    weightInput.trim().length > 0 &&
    Number.isFinite(parsedWeight) &&
    parsedWeight >= 25 &&
    parsedWeight <= 300;

  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const result = await getWalkingWorkoutHistory(range.from, range.to);
      setHistory(result.workouts);
    } catch (loadError) {
      setHistoryError(
        loadError instanceof Error
          ? loadError.message
          : 'Không thể tải lịch sử đi bộ.',
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [
    range.from,
    range.to,
    setHistory,
    setHistoryError,
    setHistoryLoading,
  ]);

  const refreshSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      setSummary(await getWalkingSummary(range.from, range.to));
    } catch (loadError) {
      setSummaryError(
        loadError instanceof Error
          ? loadError.message
          : 'Không thể tải tổng kết đi bộ.',
      );
    } finally {
      setSummaryLoading(false);
    }
  }, [
    range.from,
    range.to,
    setSummary,
    setSummaryError,
    setSummaryLoading,
  ]);

  useEffect(() => {
    refreshHistory();
    refreshSummary();
  }, [refreshHistory, refreshSummary]);

  useEffect(() => {
    if (!workoutStatus || workoutStatus === 'FINISHED') {
      setWeightInput(user?.healthProfile?.weightKg?.toString() ?? '');
    }
  }, [
    setWeightInput,
    user?.healthProfile?.updatedAt,
    user?.healthProfile?.weightKg,
    workoutStatus,
  ]);

  const refreshDailyIntake = useCallback(async () => {
    setIntakeLoading(true);
    setIntakeError('');
    if (!user?.accessToken) {
      setConsumedCalories(null);
      setIncompleteCalorieMeals(0);
      setIntakeError('Đăng nhập để xem lượng calo đã ăn hôm nay.');
      setIntakeLoading(false);
      return;
    }

    try {
      const response: DailyConsumedMealsResponse =
        await getDailyConsumedMeals(user, today);
      if (
        !response.success ||
        !response.data ||
        response.data.date !== today ||
        !Array.isArray(response.data.items)
      ) {
        throw new Error(
          response.message || 'Không thể tải lượng calo đã ăn hôm nay.',
        );
      }
      const intake = summarizeDailyCalorieIntake(response.data.items);
      setConsumedCalories(intake.calories);
      setIncompleteCalorieMeals(intake.incompleteMeals);
    } catch (loadError) {
      setConsumedCalories(null);
      setIncompleteCalorieMeals(0);
      setIntakeError(
        loadError instanceof Error
          ? loadError.message
          : 'Không thể tải lượng calo đã ăn hôm nay.',
      );
    } finally {
      setIntakeLoading(false);
    }
  }, [
    setConsumedCalories,
    setIncompleteCalorieMeals,
    setIntakeError,
    setIntakeLoading,
    today,
    user,
  ]);

  useFocusEffect(
    useCallback(() => {
      refreshDailyIntake();
    }, [refreshDailyIntake]),
  );

  const handleStart = useCallback(() => {
    if (weightInput.trim() && !weightIsValid) {
      Alert.alert(
        'Cân nặng chưa hợp lệ',
        'Nhập cân nặng từ 25 đến 300 kg hoặc xóa ô này để tiếp tục mà không tính calo.',
      );
      return;
    }
    startWorkout(weightIsValid ? parsedWeight : undefined);
  }, [parsedWeight, startWorkout, weightInput, weightIsValid]);

  const handleFinish = useCallback(() => {
    Alert.alert(
      'Kết thúc buổi đi bộ?',
      'Bạn có muốn lưu kết quả buổi tập này không?',
      [
        { text: 'Tiếp tục đi bộ', style: 'cancel' },
        {
          text: 'Kết thúc',
          style: 'destructive',
          onPress: () => {
            finishWorkout().then(finished => {
              if (finished) {
                refreshHistory();
                refreshSummary();
              }
            });
          },
        },
      ],
    );
  }, [finishWorkout, refreshHistory, refreshSummary]);

  const durationSeconds = walking.durationSeconds;
  const currentSpeedKmh =
    durationSeconds > 0
      ? (walking.distanceMeters / durationSeconds) * 3.6
      : null;
  const calorieText =
    walking.workout?.caloriesBurned == null
      ? '—'
      : `${Math.round(walking.workout.caloriesBurned)}`;
  const distanceKm = (walking.distanceMeters / 1000).toFixed(2);
  const isActive = workoutStatus === 'IN_PROGRESS';
  const isPaused = workoutStatus === 'PAUSED';
  const isFinished = workoutStatus === 'FINISHED';
  const dailyCaloriesTarget = user?.healthProfile?.dailyCaloriesTarget;
  const caloriesToTarget =
    dailyCaloriesTarget != null && consumedCalories != null
      ? dailyCaloriesTarget - consumedCalories
      : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại hồ sơ"
            onPress={goBack}
            style={styles.backButton}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>HOẠT ĐỘNG THỂ CHẤT</Text>
            <Text style={styles.title}>Theo dõi đi bộ</Text>
          </View>
        </View>

        <View style={styles.foregroundNotice}>
          <Text style={styles.noticeText}>
            {Platform.OS === 'android'
              ? 'Cảnh báo: Cần cấp quyền Vị trí để ghi nhận quãng đường. Hệ thống có thể gián đoạn theo dõi nền.'
              : 'Cảnh báo: Cần cấp quyền Vị trí Luôn luôn để tiếp tục ghi nhận khi khóa màn hình.'}
          </Text>
        </View>

        <LinearGradient
          colors={['#FFFFFF', '#F0F8F2']}
          style={styles.workoutCard}
        >
          <View style={styles.sessionHeader}>
            <View>
              <Text style={styles.sessionLabel}>
                {isActive
                  ? 'ĐANG ĐI BỘ'
                  : isPaused
                    ? 'ĐANG TẠM DỪNG'
                    : isFinished
                      ? 'BUỔI TẬP ĐÃ LƯU'
                      : 'SẴN SÀNG'}
              </Text>
              <Text style={styles.sessionDate}>
                {walking.workout
                  ? formatWorkoutDate(walking.workout.startedAt)
                  : 'Bắt đầu một buổi đi bộ mới'}
              </Text>
            </View>
            {walking.loading ? (
              <ActivityIndicator color={COLORS.green} />
            ) : null}
          </View>

          <View style={styles.heroMetric}>
            <Text style={styles.heroValue}>{walking.steps.toLocaleString()}</Text>
            <Text style={styles.heroLabel}>bước chân</Text>
          </View>

          <View style={styles.metricGrid}>
            <Metric label="Quãng đường" value={`${distanceKm} km`} />
            <Metric
              label="Thời gian"
              value={formatWalkingDuration(durationSeconds)}
            />
            <Metric label="Calo tổng" value={`${calorieText} kcal`} />
            <Metric
              label="Tốc độ TB"
              value={
                currentSpeedKmh == null
                  ? '—'
                  : `${currentSpeedKmh.toFixed(1)} km/h`
              }
            />
          </View>
          <Text style={styles.activeCalorieText}>
            Calo hoạt động:{' '}
            {walking.workout?.activeCalories == null
              ? 'chưa đủ dữ liệu cân nặng'
              : `${Math.round(walking.workout.activeCalories)} kcal`}
            {' · '}ước tính theo MET, không cộng vào TDEE
          </Text>

          {!walking.workout || isFinished ? (
            <View style={styles.weightSection}>
              <Text style={styles.weightLabel}>
                Cân nặng dùng để ước tính calo (kg)
              </Text>
              <TextInput
                accessibilityLabel="Cân nặng tính calo"
                keyboardType="decimal-pad"
                maxLength={6}
                onChangeText={setWeightInput}
                placeholder="Ví dụ: 60"
                placeholderTextColor={COLORS.secondary}
                value={weightInput}
                style={styles.weightInput}
              />
              {!user?.healthProfile?.weightKg ? (
                <Text style={styles.weightHint}>
                  Chưa có cân nặng trong hồ sơ. Có thể bỏ trống, nhưng calo sẽ
                  không được tính cho buổi tập.
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.controls}>
            {!walking.workout || isFinished ? (
              <ActionButton
                label={walking.busy ? 'Đang bắt đầu…' : 'Bắt đầu đi bộ'}
                disabled={walking.busy || walking.loading}
                onPress={handleStart}
              />
            ) : isActive ? (
              <>
                <ActionButton
                  label="Tạm dừng"
                  secondary
                  disabled={walking.busy}
                  onPress={() => walking.pauseWorkout()}
                />
                <ActionButton
                  label="Kết thúc"
                  destructive
                  disabled={walking.busy}
                  onPress={handleFinish}
                />
              </>
            ) : (
              <>
                <ActionButton
                  label="Tiếp tục"
                  disabled={walking.busy}
                  onPress={() => walking.resumeWorkout()}
                />
                <ActionButton
                  label="Kết thúc"
                  destructive
                  disabled={walking.busy}
                  onPress={handleFinish}
                />
              </>
            )}
          </View>
        </LinearGradient>

        <LinearGradient
          colors={['#FFFFFF', '#F0F8F2']}
          style={styles.sectionCard}
        >
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Dinh dưỡng hôm nay</Text>
              <Text style={styles.sectionSubtitle}>
                So sánh lượng đã ăn với mục tiêu cá nhân
              </Text>
            </View>
            {intakeLoading ? (
              <ActivityIndicator color={COLORS.green} size="small" />
            ) : null}
          </View>
          {intakeError ? (
            <View>
              <Text style={styles.errorText}>{intakeError}</Text>
              {user?.accessToken ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={refreshDailyIntake}
                >
                  <Text style={styles.retryText}>Tải lại</Text>
                </Pressable>
              ) : null}
            </View>
          ) : !intakeLoading ? (
            <>
              <View style={styles.summaryGrid}>
                <Metric
                  label="Đã nạp hôm nay"
                  value={
                    consumedCalories == null && incompleteCalorieMeals > 0
                      ? 'Thiếu dữ liệu'
                      : `${Math.round(consumedCalories ?? 0)} kcal`
                  }
                />
                <Metric
                  label="Mục tiêu cá nhân"
                  value={
                    dailyCaloriesTarget != null
                      ? `${Math.round(dailyCaloriesTarget)} kcal`
                      : 'Chưa có'
                  }
                />
                <Metric
                  label={
                    caloriesToTarget == null
                      ? 'So với mục tiêu'
                      : caloriesToTarget >= 0
                        ? 'Còn trong mục tiêu'
                        : 'Vượt mục tiêu'
                  }
                  value={
                    caloriesToTarget == null
                      ? '—'
                      : `${Math.round(Math.abs(caloriesToTarget))} kcal`
                  }
                />
              </View>
              {dailyCaloriesTarget == null ? (
                <Text style={styles.statusHint}>
                  Hãy cập nhật hồ sơ sức khỏe để xem mục tiêu calo cá nhân.
                </Text>
              ) : null}
              {incompleteCalorieMeals > 0 ? (
                <Text style={styles.statusHint}>
                  Tổng đã nạp chưa đầy đủ: {incompleteCalorieMeals} món chưa có
                  dữ liệu dinh dưỡng.
                </Text>
              ) : null}
              <Text style={styles.statusHint}>
                Đây là mức đối chiếu dinh dưỡng trong ngày, không phải lượng
                calo cần đốt bằng đi bộ. Mục tiêu cá nhân đã tính mức vận động.
              </Text>
            </>
          ) : null}
        </LinearGradient>

        <LinearGradient
          colors={['#FFFFFF', '#F0F8F2']}
          style={styles.statusCard}
        >
          <StatusLine
            label="Cảm biến bước chân"
            status={walking.sensorStatus}
          />
          <StatusLine label="GPS" status={walking.gpsStatus} />
          {walking.sensorStatus === 'denied' ? (
            <Text style={styles.statusHint}>
              Quyền nhận dạng hoạt động chưa được cấp. Bạn vẫn có thể theo dõi
              quãng đường bằng GPS.
            </Text>
          ) : null}
          {walking.gpsStatus === 'denied' ||
          walking.gpsStatus === 'unavailable' ? (
            <Text style={styles.statusHint}>
              GPS không khả dụng hoặc chưa được cấp quyền. Số bước vẫn được ghi
              nhận nếu cảm biến hỗ trợ.
            </Text>
          ) : null}
        </LinearGradient>

        {walking.error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{walking.error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => walking.refresh()}
            >
              <Text style={styles.retryText}>Tải lại buổi tập</Text>
            </Pressable>
          </View>
        ) : null}

        <LinearGradient
          colors={['#FFFFFF', '#F0F8F2']}
          style={styles.sectionCard}
        >
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Tổng kết hoạt động</Text>
              <Text style={styles.sectionSubtitle}>
                Chỉ gồm buổi đi bộ đã kết thúc
              </Text>
            </View>
            {summaryLoading ? (
              <ActivityIndicator color={COLORS.green} size="small" />
            ) : null}
          </View>
          <LinearGradient
            colors={['#FFFFFF', '#EAF6EE']}
            style={styles.periodSelector}
          >
            {SUMMARY_PERIODS.map(option => (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected: period === option.id }}
                onPress={() => setPeriod(option.id)}
                style={styles.periodButton}
              >
                {period === option.id ? (
                  <LinearGradient
                    colors={['#FFFFFF', '#EAF6EE']}
                    pointerEvents="none"
                    style={styles.periodButtonGradient}
                  />
                ) : null}
                <Text
                  style={[
                    styles.periodText,
                    period === option.id && styles.periodTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </LinearGradient>
          {summaryError ? (
            <Text style={styles.errorText}>{summaryError}</Text>
          ) : summary ? (
            <View style={styles.summaryGrid}>
              <Metric
                label="Bước chân"
                value={summary.steps.toLocaleString()}
              />
              <Metric
                label="Quãng đường"
                value={`${(summary.distanceMeters / 1000).toFixed(2)} km`}
              />
              <Metric
                label="Thời gian"
                value={formatWalkingDuration(summary.durationSeconds)}
              />
              <Metric
                label="Calo tổng"
                value={
                  summary.caloriesBurned == null
                    ? '—'
                    : `${Math.round(summary.caloriesBurned)} kcal`
                }
              />
            </View>
          ) : null}
        </LinearGradient>

        <LinearGradient
          colors={['#FFFFFF', '#F0F8F2']}
          style={styles.sectionCard}
        >
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Lịch sử đi bộ</Text>
              <Text style={styles.sectionSubtitle}>
                Các buổi trong khoảng thời gian đang chọn
              </Text>
            </View>
            {historyLoading ? (
              <ActivityIndicator color={COLORS.green} size="small" />
            ) : null}
          </View>
          {historyError ? (
            <Text style={styles.errorText}>{historyError}</Text>
          ) : history.length > 0 ? (
            history.map(item => (
              <HistoryRow key={item.id} workout={item} />
            ))
          ) : !historyLoading ? (
            <Text style={styles.emptyText}>
              Chưa có buổi đi bộ nào trong khoảng thời gian này.
            </Text>
          ) : null}
        </LinearGradient>
      </ScrollView>
    </View>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.metric}>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const ActionButton = ({
  label,
  onPress,
  disabled,
  secondary = false,
  destructive = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  destructive?: boolean;
}) => (
  <Pressable
    accessibilityRole="button"
    disabled={disabled}
    onPress={onPress}
    style={[
      styles.actionButton,
      secondary && styles.secondaryAction,
      destructive && styles.destructiveAction,
      disabled && styles.disabledAction,
    ]}
  >
    <Text
      style={[
        styles.actionText,
        secondary && styles.secondaryActionText,
      ]}
    >
      {label}
    </Text>
  </Pressable>
);

const StatusLine = ({
  label,
  status,
}: {
  label: string;
  status: 'checking' | 'available' | 'denied' | 'unavailable';
}) => {
  const text =
    status === 'available'
      ? 'Sẵn sàng'
      : status === 'denied'
        ? 'Chưa được cấp quyền'
        : status === 'unavailable'
          ? 'Không khả dụng'
          : 'Đang kiểm tra';
  return (
    <View style={styles.statusLine}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text
        style={[
          styles.statusValue,
          status === 'available' && styles.statusAvailable,
          status === 'denied' && styles.statusDenied,
        ]}
      >
        {text}
      </Text>
    </View>
  );
};

const HistoryRow = ({ workout }: { workout: WalkingWorkout }) => (
  <View style={styles.historyRow}>
    <View style={styles.historyCopy}>
      <Text style={styles.historyDate}>{formatWorkoutDate(workout.startedAt)}</Text>
      <Text style={styles.historyMetrics}>
        {workout.steps.toLocaleString()} bước ·{' '}
        {(workout.distanceMeters / 1000).toFixed(2)} km ·{' '}
        {formatWalkingDuration(workout.durationSeconds)}
      </Text>
    </View>
    <Text style={styles.historyCalories}>
      {workout.caloriesBurned == null
        ? '—'
        : `${Math.round(workout.caloriesBurned)} kcal`}
    </Text>
  </View>
);

const COLORS = {
  background: '#F5F7F5',
  white: '#FFFFFF',
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  lightGreen: '#E7F4EC',
  border: '#E5EBE7',
  danger: '#B42318',
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  foregroundNotice: {
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#FFF7E8',
  },
  noticeText: { color: '#76541A', fontSize: 12, lineHeight: 18 },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },
  backText: { marginTop: -4, color: COLORS.text, fontSize: 28 },
  headerCopy: { flex: 1 },
  eyebrow: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: { marginTop: 2, color: COLORS.text, fontSize: 22, fontWeight: '800' },
  workoutCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionLabel: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sessionDate: { marginTop: 4, color: COLORS.secondary, fontSize: 12 },
  heroMetric: { alignItems: 'center', paddingVertical: 22 },
  heroValue: { color: COLORS.text, fontSize: 44, fontWeight: '800' },
  heroLabel: { color: COLORS.secondary, fontSize: 14 },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  metric: { width: '50%', paddingVertical: 10 },
  metricValue: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  metricLabel: { marginTop: 3, color: COLORS.secondary, fontSize: 11 },
  activeCalorieText: {
    marginTop: 10,
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 16,
  },
  weightSection: { marginTop: 14 },
  weightLabel: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  weightInput: {
    height: 44,
    paddingHorizontal: 12,
    marginTop: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    color: COLORS.text,
  },
  weightHint: {
    marginTop: 6,
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 16,
  },
  controls: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionButton: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.green,
  },
  secondaryAction: {
    borderWidth: 1,
    borderColor: COLORS.green,
    backgroundColor: COLORS.lightGreen,
  },
  destructiveAction: { backgroundColor: COLORS.danger },
  disabledAction: { opacity: 0.5 },
  actionText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  secondaryActionText: { color: COLORS.green },
  statusCard: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  statusLabel: { color: COLORS.text, fontSize: 12 },
  statusValue: { color: COLORS.secondary, fontSize: 12, fontWeight: '700' },
  statusAvailable: { color: COLORS.green },
  statusDenied: { color: '#A96B00' },
  statusHint: {
    marginVertical: 5,
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 16,
  },
  errorCard: {
    padding: 12,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#FEF3F2',
  },
  errorText: { color: COLORS.danger, fontSize: 12, lineHeight: 18 },
  retryText: { marginTop: 8, color: COLORS.green, fontSize: 12, fontWeight: '700' },
  sectionCard: {
    padding: 15,
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  sectionSubtitle: { marginTop: 3, color: COLORS.secondary, fontSize: 11 },
  periodSelector: {
    flexDirection: 'row',
    padding: 4,
    marginTop: 12,
    borderRadius: 12,
  },
  periodButton: {
    position: 'relative',
    flex: 1,
    minHeight: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    overflow: 'hidden',
  },
  periodButtonGradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 10,
  },
  periodText: { color: COLORS.secondary, fontSize: 11, fontWeight: '600' },
  periodTextSelected: { color: COLORS.green, fontWeight: '800' },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  historyCopy: { flex: 1 },
  historyDate: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  historyMetrics: { marginTop: 4, color: COLORS.secondary, fontSize: 11 },
  historyCalories: {
    marginLeft: 8,
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyText: {
    paddingVertical: 14,
    color: COLORS.secondary,
    fontSize: 12,
    textAlign: 'center',
  },
});

export default WalkingScreen;
