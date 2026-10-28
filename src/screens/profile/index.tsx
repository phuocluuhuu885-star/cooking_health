import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import apiConst from '../../abase/constant/apiConst';
import { logOutUser, selectUserInfo } from '../../reduxs/reduces/user';
import {
  cacheConsumptionReport,
  getConsumptionReportCacheKey,
  invalidateCachedConsumptionReports,
  selectMealPlanDestination,
  selectConsumptionReport,
  setMealPlanDestination,
} from '../../reduxs/reduces/appData';
import { useAppDispatch } from '../../reduxs/store';
import { setSyncUser, syncApi } from '../../utils/syncUtils';
import ScreenKeys from '../../utils/screenKey';
import { navigate, resetTo } from '../../utils/navigation';
import { createStateSetter } from '../../utils/stateUtils';
import { formatNumberWithOptionalDecimal } from '../../utils/numberUtils';
import { getInitials } from '../../utils/stringUtils';
import { getAvatarUri } from '../../utils/avatarImageUtils';
import type { GlobalState } from '../../type/global';
import type { ActivityLevel, BmiCategory, Goal } from '../../type/user';
import type { MealPlanDestination } from '../../utils/types';
import type {
  ConsumptionReportResponse,
  DailyConsumedMealsResponse,
  ProfileScreenState,
} from '../../utils/types';
import HealthProfile from './healthProfile';
import ConsumptionReport from './consumptionReport';
import DailyConsumedMeals from './dailyConsumedMeals';
import AddConsumedMealModal from './addConsumedMealModal';
import FamilyCodeCard from '../component/FamilyCodeCard';

const COLORS = {
  background: '#F5F7F5',
  white: '#FFFFFF',
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  lightGreen: '#E7F4EC',
  border: '#E5EBE7',
  muted: '#A5B1AA',
};

const GOAL_LABELS: Record<Goal, string> = {
  LOSE_WEIGHT: 'Giảm cân',
  MAINTAIN: 'Duy trì cân nặng',
  GAIN_MUSCLE: 'Tăng cơ',
};

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  SEDENTARY: 'Ít vận động',
  LIGHT: 'Vận động nhẹ',
  MODERATE: 'Vận động vừa',
  ACTIVE: 'Năng động',
  VERY_ACTIVE: 'Rất năng động',
};

const BMI_LABELS: Record<BmiCategory, string> = {
  UNDERWEIGHT: 'Thiếu cân',
  NORMAL_WEIGHT: 'Bình thường',
  OVERWEIGHT: 'Thừa cân',
  OBESITY_CLASS_I: 'Béo phì độ I',
  OBESITY_CLASS_II: 'Béo phì độ II',
  OBESITY_CLASS_III: 'Béo phì độ III',
};

const MacroItem = memo(
  ({
    label,
    value,
    color,
    marker,
  }: {
    label: string;
    value: number;
    color: string;
    marker: string;
  }) => (
    <View style={styles.macroItem}>
      <View style={styles.macroLabelRow}>
        <View style={[styles.macroMarker, { backgroundColor: color }]}>
          <Text style={styles.macroMarkerText}>{marker}</Text>
        </View>
        <Text style={styles.macroLabel}>{label}</Text>
      </View>
      <Text style={styles.macroValue}>
        {formatNumberWithOptionalDecimal(value)} g
      </Text>
    </View>
  ),
);

const DetailRow = memo(
  ({
    label,
    value,
    last = false,
  }: {
    label: string;
    value: string;
    last?: boolean;
  }) => (
    <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  ),
);

const Profile = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useSelector(selectUserInfo);
  const mealPlanDestination = useSelector(selectMealPlanDestination);
  const healthProfile = user?.healthProfile ?? null;
  const reportDate = new Date().toISOString().slice(0, 10);
  const [state, setState] = useState<ProfileScreenState>({
    isHealthProfileVisible: false,
    isAddConsumedMealVisible: false,
    consumptionPeriod: 'WEEK',
    reportLoading: true,
    reportError: '',
    dailyMeals: [],
    dailyMealsLoading: true,
    dailyMealsError: '',
  });
  const { isAddConsumedMealVisible } = state;
  const setAddConsumedMealVisible = useMemo(
    () => createStateSetter(setState, 'isAddConsumedMealVisible'),
    [setState],
  );
  const reportCacheKey = getConsumptionReportCacheKey(
    state.consumptionPeriod,
    reportDate,
  );
  const cachedConsumptionReport = useSelector((root: GlobalState) =>
    selectConsumptionReport(root, reportCacheKey),
  );
  const refs = useRef({
    reportCache: cachedConsumptionReport,
    reportRequestId: 0,
    dailyMealsRequestId: 0,
  });
  refs.current.reportCache = cachedConsumptionReport;
  const fullName = user?.fullName?.trim() || 'Thành viên MealCraft';

  const changeMealPlanDestination = useCallback(
    (destination: MealPlanDestination) => {
      dispatch(
        setMealPlanDestination({
          userId: user?.id ?? 'guest',
          destination,
        }),
      );
    },
    [dispatch, user?.id],
  );

  const changeConsumptionPeriod = useCallback(
    (consumptionPeriod: ProfileScreenState['consumptionPeriod']) => {
      setState(previous => ({
        ...previous,
        consumptionPeriod,
        reportLoading: true,
        reportError: '',
      }));
    },
    [],
  );
  const confirmLogOut = useCallback(() => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: () => {
            setSyncUser(null);
            dispatch(logOutUser());
            resetTo(ScreenKeys.LOGIN);
          },
        },
      ],
    );
  }, [dispatch]);

  const loadConsumptionReport = useCallback(async () => {
    const requestId = ++refs.current.reportRequestId;
    setSyncUser(user ?? null);

    if (!user?.accessToken) {
      setState(previous => ({
        ...previous,
        reportLoading: false,
        reportError: '',
      }));
      return;
    }

    if (refs.current.reportCache) {
      setState(previous => ({
        ...previous,
        reportLoading: false,
        reportError: '',
      }));
      return;
    }

    setState(previous => ({
      ...previous,
      reportLoading: true,
      reportError: '',
    }));
    try {
      const response = (await syncApi(apiConst.getConsumptionReport, {
        period: state.consumptionPeriod,
        date: reportDate,
      })) as ConsumptionReportResponse;

      if (requestId !== refs.current.reportRequestId) {
        return;
      }
      if (!response?.success || !response.data) {
        setState(previous => ({
          ...previous,
          reportLoading: false,
          reportError: response?.message || 'Không thể tải báo cáo.',
        }));
        return;
      }
      dispatch(
        cacheConsumptionReport({
          userId: user.id,
          key: reportCacheKey,
          report: response.data,
        }),
      );
      setState(previous => ({
        ...previous,
        reportLoading: false,
      }));
    } catch {
      if (requestId === refs.current.reportRequestId) {
        setState(previous => ({
          ...previous,
          reportLoading: false,
          reportError: 'Không thể kết nối để tải báo cáo.',
        }));
      }
    }
  }, [dispatch, reportCacheKey, reportDate, state.consumptionPeriod, user]);

  const retryConsumptionReport = useCallback(() => {
    loadConsumptionReport();
  }, [loadConsumptionReport]);

  const loadDailyConsumedMeals = useCallback(async () => {
    const requestId = ++refs.current.dailyMealsRequestId;
    setSyncUser(user ?? null);
    if (!user?.accessToken) {
      setState(previous => ({
        ...previous,
        dailyMeals: [],
        dailyMealsLoading: false,
        dailyMealsError: '',
      }));
      return;
    }
    setState(previous => ({
      ...previous,
      dailyMealsLoading: true,
      dailyMealsError: '',
    }));
    try {
      const response = (await syncApi(apiConst.getDailyConsumedMeals, {
        date: reportDate,
      })) as DailyConsumedMealsResponse;
      if (requestId !== refs.current.dailyMealsRequestId) {
        return;
      }
      if (
        !response?.success ||
        !response.data ||
        response.data.date !== reportDate ||
        !Array.isArray(response.data.items)
      ) {
        setState(previous => ({
          ...previous,
          dailyMealsLoading: false,
          dailyMealsError:
            response?.message || 'Không thể tải thực phẩm đã tiêu thụ hôm nay.',
        }));
        return;
      }
      const dailyMeals = response.data.items;
      setState(previous => ({
        ...previous,
        dailyMeals,
        dailyMealsLoading: false,
        dailyMealsError: '',
      }));
    } catch {
      if (requestId === refs.current.dailyMealsRequestId) {
        setState(previous => ({
          ...previous,
          dailyMealsLoading: false,
          dailyMealsError: 'Không thể kết nối để tải thực phẩm đã tiêu thụ.',
        }));
      }
    }
  }, [reportDate, user]);

  const retryDailyConsumedMeals = useCallback(() => {
    loadDailyConsumedMeals();
  }, [loadDailyConsumedMeals]);

  const handleConsumedMealSaved = useCallback(async () => {
    if (user?.id) {
      dispatch(invalidateCachedConsumptionReports({ userId: user.id }));
    }
    refs.current.reportCache = null;
    await Promise.all([loadDailyConsumedMeals(), loadConsumptionReport()]);
  }, [dispatch, loadConsumptionReport, loadDailyConsumedMeals, user?.id]);

  const handleOpenConsumedMeal = useCallback((mealId: string) => {
    navigate(ScreenKeys.RECIPE_DETAIL, { mealId });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConsumptionReport();
      loadDailyConsumedMeals();
      return () => {
        refs.current.reportRequestId += 1;
        refs.current.dailyMealsRequestId += 1;
      };
    }, [loadConsumptionReport, loadDailyConsumedMeals]),
  );

  const bmiLabel = useMemo(() => {
    if (!healthProfile) {
      return 'Chưa có hồ sơ';
    }
    if (healthProfile.bmiCategory) {
      return BMI_LABELS[healthProfile.bmiCategory];
    }
    return healthProfile.age < 18
      ? 'Chưa phân loại theo tuổi'
      : 'Chưa có dữ liệu';
  }, [healthProfile]);

  const healthyWeightRange =
    healthProfile?.healthyWeightMinKg != null &&
    healthProfile.healthyWeightMaxKg != null
      ? `${formatNumberWithOptionalDecimal(
          healthProfile.healthyWeightMinKg,
        )}–${formatNumberWithOptionalDecimal(
          healthProfile.healthyWeightMaxKg,
        )} kg`
      : healthProfile?.age != null && healthProfile.age < 18
      ? 'Không áp dụng dưới 18 tuổi'
      : 'Chưa có dữ liệu';

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 96 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>Hồ sơ cá nhân</Text>
            <Text style={styles.pageSubtitle}>
              Thông tin và mục tiêu sức khỏe
            </Text>
          </View>
          <View style={styles.headerMark}>
            <Text style={styles.headerMarkText}>MC</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mở thông tin cá nhân"
          onPress={() => navigate(ScreenKeys.PERSONAL_INFO)}
        >
          <LinearGradient
            colors={['#FFFFFF', '#F3FAF5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.identityCard}
          >
            <View style={styles.avatar}>
              {user?.avatar ? (
                <Image
                  source={{ uri: getAvatarUri(user.avatar) }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {getInitials(fullName) || 'M'}
                </Text>
              )}
            </View>
            <View style={styles.identityDetails}>
              <Text style={styles.name} numberOfLines={1}>
                {fullName}
              </Text>
              <Text style={styles.email} numberOfLines={1}>
                {user?.email || 'Chưa có email'}
              </Text>
              <View style={styles.memberBadge}>
                <Text style={styles.memberBadgeText}>MEALCRAFT MEMBER</Text>
              </View>
            </View>
            <Text style={styles.identityChevron}>›</Text>
          </LinearGradient>
        </Pressable>
        <FamilyCodeCard />

        <LinearGradient
          colors={['#FFFFFF', '#F3FAF5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.planDestinationCard}
        >
          <Text style={styles.sectionTitle}>Chế độ thực đơn</Text>
          <Text style={styles.planDestinationDescription}>
            Chọn nơi xem thực đơn và nơi lưu món khi bạn thêm món ăn.
          </Text>
          <View style={styles.planDestinationOptions}>
            {(
              [
                ['PERSONAL', 'Cá nhân'],
                ['HOUSEHOLD', 'Gia đình'],
              ] as const
            ).map(([destination, label]) => {
              const selected = mealPlanDestination === destination;
              return (
                <Pressable
                  key={destination}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => changeMealPlanDestination(destination)}
                  style={[
                    styles.planDestinationOption,
                    selected && styles.planDestinationOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.planDestinationOptionText,
                      selected && styles.planDestinationOptionTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.planDestinationHint}>
            {mealPlanDestination === 'HOUSEHOLD'
              ? 'Món mới sẽ được gửi vào thực đơn gia đình để các thành viên bình chọn.'
              : 'Món mới sẽ được lưu vào thực đơn cá nhân của bạn.'}
          </Text>
        </LinearGradient>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigate(ScreenKeys.WALKING)}
          style={({ pressed }) => [
            styles.walkingButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <View style={styles.walkingButtonCopy}>
            <Text style={styles.walkingButtonTitle}>Theo dõi đi bộ</Text>
            <Text style={styles.walkingButtonSubtitle}>
              Ghi nhận bước chân, quãng đường và calo ước tính
            </Text>
          </View>
          <Text style={styles.editButtonArrow}>›</Text>
        </Pressable>

        <ConsumptionReport
          period={state.consumptionPeriod}
          report={cachedConsumptionReport}
          loading={state.reportLoading}
          error={state.reportError}
          isLoggedIn={Boolean(user?.accessToken)}
          dailyCaloriesTarget={healthProfile?.dailyCaloriesTarget}
          onChangePeriod={changeConsumptionPeriod}
          onRetry={retryConsumptionReport}
        />
        <DailyConsumedMeals
          items={state.dailyMeals}
          loading={state.dailyMealsLoading}
          error={state.dailyMealsError}
          onRetry={retryDailyConsumedMeals}
          onAddMeal={
            user?.accessToken
              ? () => setAddConsumedMealVisible(true)
              : undefined
          }
          onPressMeal={handleOpenConsumedMeal}
        />

        {healthProfile ? (
          <>
            <LinearGradient
              colors={['#FFFFFF', '#EAF6EE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.calorieCard}
            >
              <View style={styles.calorieCardTop}>
                <View>
                  <Text style={styles.eyebrow}>MỤC TIÊU MỖI NGÀY</Text>
                  <Text style={styles.calorieValue}>
                    {healthProfile.dailyCaloriesTarget}
                    <Text style={styles.calorieUnit}> kcal</Text>
                  </Text>
                </View>
                <View style={styles.goalBadge}>
                  <Text style={styles.goalBadgeText}>
                    {GOAL_LABELS[healthProfile.goal]}
                  </Text>
                </View>
              </View>
              <Text style={styles.calorieCaption}>
                Mức năng lượng được đề xuất theo hồ sơ sức khỏe của bạn.
              </Text>
            </LinearGradient>

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Chỉ số cơ thể</Text>
              <Text style={styles.sectionHint}>Theo hồ sơ sức khỏe</Text>
            </View>
            <LinearGradient
              colors={['#FFFFFF', '#F3FAF5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bodyCard}
            >
              <View style={styles.measurements}>
                <View style={styles.measurement}>
                  <Text style={styles.measurementLabel}>CHIỀU CAO</Text>
                  <Text style={styles.measurementValue}>
                    {formatNumberWithOptionalDecimal(healthProfile.heightCm)}
                    <Text style={styles.measurementUnit}> cm</Text>
                  </Text>
                </View>
                <View style={styles.measurementDivider} />
                <View style={styles.measurement}>
                  <Text style={styles.measurementLabel}>CÂN NẶNG</Text>
                  <Text style={styles.measurementValue}>
                    {formatNumberWithOptionalDecimal(healthProfile.weightKg)}
                    <Text style={styles.measurementUnit}> kg</Text>
                  </Text>
                </View>
                <View style={styles.measurementDivider} />
                <View style={styles.measurement}>
                  <Text style={styles.measurementLabel}>BMI</Text>
                  <Text style={styles.measurementValue}>
                    {formatNumberWithOptionalDecimal(healthProfile.bmi)}
                  </Text>
                </View>
              </View>

              <View style={styles.bmiInfo}>
                <Text style={styles.bmiInfoLabel}>Phân loại BMI</Text>
                <View style={styles.bmiBadge}>
                  <Text style={styles.bmiBadgeText}>{bmiLabel}</Text>
                </View>
              </View>
              <DetailRow
                label="Khoảng cân nặng khỏe mạnh"
                value={healthyWeightRange}
                last
              />
            </LinearGradient>

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Mục tiêu dinh dưỡng</Text>
              <Text style={styles.sectionHint}>Mỗi ngày</Text>
            </View>
            <LinearGradient
              colors={['#FFFFFF', '#F3FAF5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.macroCard}
            >
              <MacroItem
                label="Chất đạm"
                value={healthProfile.targetProteinG}
                color="#168653"
                marker="P"
              />
              <MacroItem
                label="Tinh bột"
                value={healthProfile.targetCarbsG}
                color="#E89B36"
                marker="C"
              />
              <MacroItem
                label="Chất béo"
                value={healthProfile.targetFatG}
                color="#5D8FE8"
                marker="F"
              />
            </LinearGradient>

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Thông tin sức khỏe</Text>
            </View>
            <LinearGradient
              colors={['#FFFFFF', '#F3FAF5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.detailsCard}
            >
              <DetailRow label="Tuổi" value={`${healthProfile.age}`} />
              <DetailRow
                label="Giới tính"
                value={healthProfile.gender === 'MALE' ? 'Nam' : 'Nữ'}
              />
              <DetailRow
                label="Mức độ vận động"
                value={ACTIVITY_LABELS[healthProfile.activityLevel]}
              />
              <DetailRow
                label="Mục tiêu"
                value={GOAL_LABELS[healthProfile.goal]}
                last
              />
            </LinearGradient>
          </>
        ) : (
          <LinearGradient
            colors={['#FFFFFF', '#F3FAF5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.emptyCard}
          >
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>+</Text>
            </View>
            <Text style={styles.emptyTitle}>Hoàn thiện hồ sơ sức khỏe</Text>
            <Text style={styles.emptyDescription}>
              Thêm chiều cao, cân nặng và mục tiêu để nhận gợi ý dinh dưỡng phù
              hợp.
            </Text>
          </LinearGradient>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() =>
            setState(previous => ({
              ...previous,
              isHealthProfileVisible: true,
            }))
          }
          style={({ pressed }) => [
            styles.editButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.editButtonText}>
            {healthProfile
              ? 'Cập nhật hồ sơ sức khỏe'
              : 'Thiết lập hồ sơ sức khỏe'}
          </Text>
          <Text style={styles.editButtonArrow}>›</Text>
        </Pressable>
        <Text style={styles.footerNote}>
          Các chỉ số sức khỏe chỉ mang tính tham khảo.
        </Text>
        {user?.accessToken ? (
          <Pressable
            accessibilityRole="button"
            onPress={confirmLogOut}
            style={({ pressed }) => [
              styles.logOutButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.logOutButtonText}>Đăng xuất</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <HealthProfile
        visible={state.isHealthProfileVisible}
        onClose={() =>
          setState(previous => ({
            ...previous,
            isHealthProfileVisible: false,
          }))
        }
      />
      <AddConsumedMealModal
        visible={isAddConsumedMealVisible}
        user={user}
        onClose={() => setAddConsumedMealVisible(false)}
        onSaved={handleConsumedMealSaved}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 18,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  pageTitle: {
    color: COLORS.text,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    marginTop: 3,
    color: COLORS.secondary,
    fontSize: 13,
  },
  headerMark: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.lightGreen,
  },
  headerMarkText: {
    color: COLORS.green,
    fontSize: 13,
    fontWeight: '800',
  },
  identityCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  planDestinationCard: {
    padding: 15,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  planDestinationDescription: {
    marginTop: 5,
    color: COLORS.secondary,
    fontSize: 14,
    lineHeight: 18,
  },
  planDestinationOptions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
  },
  planDestinationOption: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  planDestinationOptionSelected: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.lightGreen,
  },
  planDestinationOptionText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: '700',
  },
  planDestinationOptionTextSelected: { color: COLORS.green },
  planDestinationHint: {
    marginTop: 8,
    color: COLORS.secondary,
    fontSize: 14,
    lineHeight: 18,
  },
  avatar: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.lightGreen,
  },
  avatarImage: {
    width: 58,
    height: 58,
    borderRadius: 12,
  },
  avatarText: {
    color: COLORS.green,
    fontSize: 20,
    fontWeight: '800',
  },
  identityDetails: {
    flex: 1,
    marginLeft: 13,
  },
  name: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  email: {
    marginTop: 3,
    color: COLORS.secondary,
    fontSize: 12,
  },
  memberBadge: {
    alignSelf: 'flex-start',
    marginTop: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: COLORS.lightGreen,
  },
  memberBadgeText: {
    color: COLORS.green,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  identityChevron: {
    marginLeft: 8,
    color: COLORS.muted,
    fontSize: 25,
  },
  calorieCard: {
    marginTop: 14,
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calorieCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eyebrow: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  calorieValue: {
    marginTop: 6,
    color: COLORS.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },
  calorieUnit: {
    fontSize: 16,
    fontWeight: '600',
  },
  goalBadge: {
    maxWidth: 132,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: COLORS.lightGreen,
  },
  goalBadgeText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  calorieCaption: {
    marginTop: 11,
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHint: {
    color: COLORS.secondary,
    fontSize: 11,
  },
  bodyCard: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  measurements: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 15,
  },
  measurement: {
    flex: 1,
    alignItems: 'center',
  },
  measurementLabel: {
    color: COLORS.secondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  measurementValue: {
    marginTop: 6,
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '800',
  },
  measurementUnit: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '500',
  },
  measurementDivider: {
    width: StyleSheet.hairlineWidth,
    height: 39,
    backgroundColor: COLORS.border,
  },
  bmiInfo: {
    minHeight: 45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  bmiInfoLabel: {
    color: COLORS.secondary,
    fontSize: 12,
  },
  bmiBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: COLORS.lightGreen,
  },
  bmiBadgeText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '700',
  },
  detailRow: {
    minHeight: 45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  detailRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    flex: 1,
    color: COLORS.secondary,
    fontSize: 12,
  },
  detailValue: {
    flexShrink: 1,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  macroCard: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  macroMarker: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  macroMarkerText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '800',
  },
  macroLabel: {
    color: COLORS.secondary,
    fontSize: 10,
  },
  macroValue: {
    marginTop: 8,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  detailsCard: {
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyCard: {
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 25,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.lightGreen,
  },
  emptyIconText: {
    color: COLORS.green,
    fontSize: 25,
    fontWeight: '500',
  },
  emptyTitle: {
    marginTop: 12,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDescription: {
    marginTop: 6,
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  editButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.green,
  },
  walkingButton: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 11,
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: COLORS.green,
  },
  walkingButtonCopy: {
    flex: 1,
  },
  walkingButtonTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  walkingButtonSubtitle: {
    marginTop: 4,
    color: '#E1F1E8',
    fontSize: 11,
    lineHeight: 16,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  editButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  editButtonArrow: {
    marginLeft: 8,
    color: COLORS.white,
    fontSize: 21,
    lineHeight: 22,
  },
  footerNote: {
    marginTop: 12,
    color: COLORS.secondary,
    fontSize: 10,
    textAlign: 'center',
  },
  logOutButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1C9C6',
    backgroundColor: COLORS.white,
  },
  logOutButtonText: {
    color: '#B42318',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default Profile;
