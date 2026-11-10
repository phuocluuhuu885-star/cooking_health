import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import ScreenHeader from '../component/ScreenHeader';
import HealthProfile from '../profile/healthProfile';
import { navigate } from '../../utils/navigation';
import { selectUserInfo } from '../../reduxs/reduces/user';
import apiConst from '../../abase/constant/apiConst';
import { syncApi, setSyncUser } from '../../utils/syncUtils';
import { getVietnamDateKey } from '../../utils/dateUtils';
import ScreenKeys from '../../utils/screenKey';
import type {
  HouseholdHealthOverviewMember,
  HouseholdHealthOverviewResponse,
  HouseholdHealthDaily,
  HouseholdMemberHealthResponse,
} from '../../utils/types';
import type { RootStackParamList } from '../../utils/types/navigation';

const COLORS = {
  background: '#F5F7F5',
  white: '#FFFFFF',
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  border: '#E5EBE7',
  warning: '#9A6700',
};

const GOAL_LABELS = {
  LOSE_WEIGHT: 'Giảm cân',
  MAINTAIN: 'Duy trì',
  GAIN_MUSCLE: 'Tăng cơ',
} as const;

const ACTIVITY_LABELS = {
  SEDENTARY: 'Ít vận động',
  LIGHT: 'Nhẹ',
  MODERATE: 'Vừa',
  ACTIVE: 'Năng động',
  VERY_ACTIVE: 'Rất năng động',
} as const;

type ScreenState = {
  loading: boolean;
  error: string;
  overview: HouseholdHealthOverviewResponse['data'] | null;
  detail: HouseholdMemberHealthResponse['data'] | null;
  editVisible: boolean;
  date: string;
};

const shiftDate = (date: string, days: number) => {
  const shifted = new Date(`${date}T00:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
};

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });

const formatNumber = (value: number, digits = 0) =>
  new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);

const HouseholdHealthMemberCard = ({
  member,
  onSelect,
}: {
  member: HouseholdHealthOverviewMember;
  onSelect: (memberId: string) => void;
}) => {
  const handlePress = useCallback(() => {
    if (member.shared) onSelect(member.userId);
  }, [member.shared, member.userId, onSelect]);
  const profile = member.profile;
  const daily = member.daily;

  return (
    <Pressable
      accessibilityRole={member.shared ? 'button' : undefined}
      accessibilityState={{ disabled: !member.shared }}
      disabled={!member.shared}
      onPress={handlePress}
      style={[styles.memberCard, !member.shared && styles.memberCardLocked]}
    >
      <View style={styles.memberTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {member.name.trim().charAt(0).toLocaleUpperCase()}
          </Text>
        </View>
        <View style={styles.memberCopy}>
          <Text style={styles.memberName}>{member.name}</Text>
          <Text style={styles.memberRole}>
            {member.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}
          </Text>
        </View>
        {member.shared ? (
          <Text style={styles.openArrow}>›</Text>
        ) : null}
      </View>
      {member.shared ? (
        profile ? (
          <View style={styles.memberMetrics}>
            <Metric label="Cân nặng" value={`${formatNumber(profile.weightKg, 1)} kg`} />
            <Metric
              label="Calo hôm nay"
              value={`${formatNumber(daily?.nutrition.calories ?? 0)} / ${formatNumber(profile.dailyCaloriesTarget)} kcal`}
            />
            <Metric label="Nước" value={`${formatNumber(daily?.waterMl ?? 0)} ml`} />
            <Metric label="Bước chân" value={formatNumber(daily?.walking.steps ?? 0)} />
          </View>
        ) : (
          <Text style={styles.helper}>Chưa có hồ sơ sức khỏe.</Text>
        )
      ) : (
        <Text style={styles.lockedText}>
          Thành viên chưa cho phép chia sẻ dữ liệu sức khỏe.
        </Text>
      )}
    </Pressable>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.metric}>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const HouseholdHealthScreen = () => {
  const route =
    useRoute<RouteProp<RootStackParamList, typeof ScreenKeys.HOUSEHOLD_HEALTH>>();
  const memberId = route.params?.memberId;
  const user = useSelector(selectUserInfo);
  const insets = useSafeAreaInsets();
  const requestId = useRef(0);
  const [state, setState] = useState<ScreenState>({
    loading: true,
    error: '',
    overview: null,
    detail: null,
    editVisible: false,
    date: getVietnamDateKey(),
  });

  const loadData = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    if (!user?.accessToken) {
      setState(previous => ({
        ...previous,
        loading: false,
        error: 'Đăng nhập để xem dữ liệu sức khỏe gia đình.',
      }));
      return;
    }
    setSyncUser(user);
    setState(previous => ({ ...previous, loading: true, error: '' }));
    try {
      if (memberId) {
        const response = (await syncApi(apiConst.getHouseholdMemberHealth, {
          memberId,
          date: state.date,
        })) as HouseholdMemberHealthResponse;
        if (currentRequestId !== requestId.current) return;
        if (!response.success || !response.data) {
          setState(previous => ({
            ...previous,
            loading: false,
            error: response.message || 'Không thể tải dữ liệu thành viên.',
          }));
          return;
        }
        setState(previous => ({
          ...previous,
          loading: false,
          error: '',
          detail: response.data ?? null,
        }));
        return;
      }

      const response = (await syncApi(apiConst.getHouseholdHealthOverview, {
        date: state.date,
      })) as HouseholdHealthOverviewResponse;
      if (currentRequestId !== requestId.current) return;
      if (!response.success || !response.data) {
        setState(previous => ({
          ...previous,
          loading: false,
          error: response.message || 'Không thể tải sức khỏe gia đình.',
        }));
        return;
      }
      setState(previous => ({
        ...previous,
        loading: false,
        error: '',
        overview: response.data ?? null,
      }));
    } catch {
      if (currentRequestId !== requestId.current) return;
      setState(previous => ({
        ...previous,
        loading: false,
        error: 'Không thể kết nối để tải dữ liệu sức khỏe.',
      }));
    }
  }, [memberId, state.date, user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => {
        requestId.current += 1;
      };
    }, [loadData]),
  );

  const handleSelectMember = useCallback((selectedMemberId: string) => {
    navigate(ScreenKeys.HOUSEHOLD_HEALTH, { memberId: selectedMemberId });
  }, []);
  const renderOverviewMember = useCallback(
    (member: HouseholdHealthOverviewMember) => (
      <HouseholdHealthMemberCard
        key={member.userId}
        member={member}
        onSelect={handleSelectMember}
      />
    ),
    [handleSelectMember],
  );

  const handlePreviousDate = useCallback(() => {
    setState(previous => ({ ...previous, date: shiftDate(previous.date, -1) }));
  }, []);

  const handleNextDate = useCallback(() => {
    const today = getVietnamDateKey();
    setState(previous => {
      if (previous.date >= today) return previous;
      const nextDate = shiftDate(previous.date, 1);
      return { ...previous, date: nextDate > today ? today : nextDate };
    });
  }, []);

  const handleOpenEditor = useCallback(() => {
    setState(previous => ({ ...previous, editVisible: true }));
  }, []);
  const handleCloseEditor = useCallback(() => {
    setState(previous => ({ ...previous, editVisible: false }));
  }, []);
  const handleUpdatedMember = useCallback(() => {
    loadData();
  }, [loadData]);
  const canGoForward = state.date < getVietnamDateKey();
  const selectedMember = state.detail?.member;
  const profile = selectedMember?.profile ?? null;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        eyebrow={memberId ? 'SỨC KHỎE THÀNH VIÊN' : 'SỨC KHỎE GIA ĐÌNH'}
        title={selectedMember?.name ?? 'Theo dõi gia đình'}
        subtitle={memberId ? 'Hồ sơ và hoạt động sức khỏe' : 'Tổng quan các thành viên'}
        rightAction={
          memberId && state.detail?.member.canUpdate ? (
            <Pressable
              accessibilityRole="button"
              onPress={handleOpenEditor}
              style={styles.headerAction}
            >
              <Text style={styles.headerActionText}>Cập nhật</Text>
            </Pressable>
          ) : null
        }
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dateNavigator}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ngày trước"
            onPress={handlePreviousDate}
            style={styles.dateArrow}
          >
            <Text style={styles.dateArrowText}>‹</Text>
          </Pressable>
          <Text style={styles.dateText}>{formatDate(state.date)}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ngày tiếp theo"
            accessibilityState={{ disabled: !canGoForward }}
            disabled={!canGoForward}
            onPress={handleNextDate}
            style={[styles.dateArrow, !canGoForward && styles.disabled]}
          >
            <Text style={[styles.dateArrowText, !canGoForward && styles.disabledText]}>›</Text>
          </Pressable>
        </View>
        {state.loading ? (
          <View style={styles.status}>
            <ActivityIndicator color={COLORS.green} />
            <Text style={styles.helper}>Đang tải dữ liệu sức khỏe...</Text>
          </View>
        ) : state.error ? (
          <View style={styles.statusCard}>
            <Text style={styles.errorText}>{state.error}</Text>
            <Pressable onPress={loadData} style={styles.retryButton}>
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : memberId && selectedMember ? (
          <MemberDetail
            profile={profile}
            daily={state.detail?.daily ?? null}
            weightHistory={state.detail?.weightHistory ?? []}
          />
        ) : state.overview ? (
          <View style={styles.memberList}>
            <Text style={styles.sectionTitle}>Thành viên ({state.overview.members.length})</Text>
            <Text style={styles.helper}>
              Chỉ thành viên đã bật chia sẻ mới hiển thị thông tin sức khỏe.
            </Text>
            {state.overview.members.map(renderOverviewMember)}
          </View>
        ) : null}
      </ScrollView>
      {selectedMember && state.detail?.member.canUpdate ? (
        <HealthProfile
          visible={state.editVisible}
          onClose={handleCloseEditor}
          onUpdated={handleUpdatedMember}
          memberUserId={selectedMember.userId}
          memberName={selectedMember.name}
          initialProfile={profile}
        />
      ) : null}
    </View>
  );
};

const MemberDetail = ({
  profile,
  daily,
  weightHistory,
}: {
  profile: NonNullable<HouseholdMemberHealthResponse['data']>['member']['profile'] | null;
  daily: HouseholdHealthDaily | null;
  weightHistory: NonNullable<
    HouseholdMemberHealthResponse['data']
  >['weightHistory'];
}) => {
  if (!profile || !daily) {
    return (
      <View style={styles.statusCard}>
        <Text style={styles.helper}>Thành viên chưa có hồ sơ sức khỏe.</Text>
      </View>
    );
  }
  return (
    <View style={styles.detailContent}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Chỉ số sức khỏe</Text>
        <View style={styles.metricsGrid}>
          <Metric label="Cân nặng" value={`${formatNumber(profile.weightKg, 1)} kg`} />
          <Metric label="Chiều cao" value={`${formatNumber(profile.heightCm, 1)} cm`} />
          <Metric label="BMI" value={formatNumber(profile.bmi, 1)} />
          <Metric label="Tuổi" value={`${profile.age}`} />
          <Metric label="Mục tiêu" value={GOAL_LABELS[profile.goal]} />
          <Metric label="Vận động" value={ACTIVITY_LABELS[profile.activityLevel]} />
          <Metric label="Nhu cầu calo" value={`${formatNumber(profile.dailyCaloriesTarget)} kcal/ngày`} />
          <Metric label="BMR" value={`${formatNumber(profile.bmr)} kcal/ngày`} />
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Dinh dưỡng trong ngày</Text>
        <View style={styles.metricsGrid}>
          <Metric
            label="Calo"
            value={`${formatNumber(daily.nutrition.calories)} / ${formatNumber(profile.dailyCaloriesTarget)} kcal`}
          />
          <Metric label="Đạm" value={`${formatNumber(daily.nutrition.proteinG, 1)} g`} />
          <Metric label="Tinh bột" value={`${formatNumber(daily.nutrition.carbsG, 1)} g`} />
          <Metric label="Chất béo" value={`${formatNumber(daily.nutrition.fatG, 1)} g`} />
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Nước và đi bộ</Text>
        <View style={styles.metricsGrid}>
          <Metric label="Nước uống" value={`${formatNumber(daily.waterMl)} ml`} />
          <Metric label="Bước chân" value={formatNumber(daily.walking.steps)} />
          <Metric label="Quãng đường" value={`${formatNumber(daily.walking.distanceMeters / 1000, 2)} km`} />
          <Metric label="Calo vận động" value={`${formatNumber(daily.walking.caloriesBurned)} kcal`} />
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Lịch sử cân nặng</Text>
        {weightHistory.length ? weightHistory.map(renderWeightHistory) : (
          <Text style={styles.helper}>Chưa có lịch sử cân nặng.</Text>
        )}
      </View>
    </View>
  );
};

const renderWeightHistory = (
  entry: NonNullable<HouseholdMemberHealthResponse['data']>['weightHistory'][number],
) => (
  <View key={entry.id} style={styles.historyRow}>
    <View>
      <Text style={styles.historyWeight}>{formatNumber(entry.weightKg, 1)} kg</Text>
      <Text style={styles.historyDate}>
        {new Date(entry.measuredAt).toLocaleDateString('vi-VN')}
      </Text>
    </View>
    <Text style={styles.historyActor}>
      {entry.recordedByUserId ? 'Quản trị viên cập nhật' : 'Thành viên ghi nhận'}
    </Text>
  </View>
);

export default HouseholdHealthScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  dateNavigator: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  dateArrow: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  dateArrowText: { color: COLORS.green, fontSize: 30, lineHeight: 36 },
  dateText: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  disabledText: { color: COLORS.secondary },
  memberList: { gap: 10 },
  memberCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    gap: 12,
  },
  memberCardLocked: { opacity: 0.8 },
  memberTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: '#E7F4EC',
  },
  avatarText: { color: COLORS.green, fontSize: 16, fontWeight: '800' },
  memberCopy: { flex: 1, gap: 2 },
  memberName: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  memberRole: { color: COLORS.secondary, fontSize: 11 },
  openArrow: { color: COLORS.green, fontSize: 28 },
  memberMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  metric: { flexBasis: '47%', flexGrow: 1, gap: 3 },
  metricValue: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  metricLabel: { color: COLORS.secondary, fontSize: 10 },
  helper: { color: COLORS.secondary, fontSize: 12, lineHeight: 18 },
  lockedText: { color: COLORS.warning, fontSize: 12, lineHeight: 18 },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '800' },
  detailContent: { gap: 12 },
  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    gap: 14,
  },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  historyWeight: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  historyDate: { marginTop: 3, color: COLORS.secondary, fontSize: 10 },
  historyActor: { color: COLORS.secondary, fontSize: 10, textAlign: 'right' },
  status: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 10 },
  statusCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    gap: 12,
  },
  errorText: { color: '#B42318', fontSize: 13, lineHeight: 19 },
  retryButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#E7F4EC',
  },
  retryText: { color: COLORS.green, fontSize: 12, fontWeight: '800' },
  headerAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E7F4EC',
  },
  headerActionText: { color: COLORS.green, fontSize: 11, fontWeight: '800' },
});
