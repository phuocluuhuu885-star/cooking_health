import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from '../../components/LinearGradient';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import ScreenHeader from '../component/ScreenHeader';
import { navigate } from '../../utils/navigation';
import ScreenKeys from '../../utils/screenKey';
import apiConst from '../../abase/constant/apiConst';
import {
  cacheCurrentHousehold,
  cacheHouseholdMealPlan,
  invalidateCachedConsumptionReports,
  invalidateCachedHouseholdMealPlan,
  selectCurrentHousehold,
} from '../../reduxs/reduces/appData';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { useAppDispatch } from '../../reduxs/store';
import { syncApi, setSyncUser } from '../../utils/syncUtils';
import {
  fetchCurrentHousehold,
  fetchHouseholdMealPlan,
  updateHouseholdMealPollDeadline,
  updateHouseholdMealVoting,
  voteForHouseholdMeal,
} from '../../utils/householdApi';
import { fetchHouseholdChatUnreadCount } from '../../utils/householdChatApi';
import type {
  MealPeriod,
  HouseholdPlannedMeal,
  HouseholdMember,
  HouseholdInvitationResponse,
  HouseholdResponse,
  HouseholdScreenState,
  RecipeDetailResponse,
} from '../../utils/types';
import type { GlobalState } from '../../type/global';
import type { RootStackParamList } from '../../utils/types/navigation';
import { completeMealPeriod } from '../../utils/mealPlanApi';
import { aggregateMealIngredients } from '../../utils/homeUtils';
import HomeIngredientSummaryModal from '../home/homeIngredientSummaryModal';
import HouseholdChatButton from './HouseholdChatButton';
import HouseholdPollScheduleModal from './HouseholdPollScheduleModal';
import HouseholdShoppingListModal from './HouseholdShoppingListModal';
import HouseholdSettingsModal from './components/HouseholdSettingsModal';
import { useSendHouseholdMealReminder } from './HouseholdMealReminderProvider';
import {
  getMealReminderWindowLabel,
  isMealReminderAllowed,
} from '../../utils/mealReminderUtils';
import { createStateSetter } from '../../utils/stateUtils';
import { formatEstimatedPrice } from '../../utils/priceUtils';
import ActionButton from './components/ActionButton';
import HouseholdMealPeriodCard from './components/HouseholdMealPeriodCard';
import HouseholdMealPollCard from './components/HouseholdMealPollCard';
import HouseholdMemberRow from './components/HouseholdMemberRow';
import HouseholdPlannedMealRow from './components/HouseholdPlannedMealRow';
import { COLORS } from './components/styles';
import {
  formatHouseholdDeadlineDateTime,
  getCurrentMealPeriod,
  getFinalizedMeals,
  getHouseholdDateKey,
  getMealPeriodSummary,
} from '../../utils/householdScreenUtils';

const HouseholdScreen = ({ embedded = false }: { embedded?: boolean }) => {
  const route =
    useRoute<RouteProp<RootStackParamList, typeof ScreenKeys.FAMILY>>();
  const notificationDate = route.params?.date;
  const notificationMealPeriod = route.params?.mealPeriod;
  const insets = useSafeAreaInsets();
  const scrollContentInsets = useMemo(
    () => ({
      paddingTop: 0,
      paddingBottom: embedded ? 16 : insets.bottom + 40,
    }),
    [embedded, insets.bottom],
  );
  const dispatch = useAppDispatch();
  const user = useSelector(selectUserInfo);
  const household = useSelector((state: GlobalState) =>
    selectCurrentHousehold(state),
  );
  const [state, setState] = useState<HouseholdScreenState>({
    loading: true,
    mealPlanLoading: false,
    saving: false,
    error: '',
    mealPlanError: '',
    date: getHouseholdDateKey(),
    mealPlan: null,
    completingPeriod: null,
    householdName: '',
    invitationCode: '',
    invitationExpiresAt: '',
    membersExpanded: false,
    selectedMealPeriod: getCurrentMealPeriod(),
    votingOptionKey: '',
    chatUnreadCount: 0,
    pollDeadlineVisible: false,
    pollDeadlineSaving: false,
    pollVotingSaving: false,
    shoppingListVisible: false,
    currentTime: new Date(),
    sendingMealReminder: false,
    ingredientSummary: {
      visible: false,
      selectedMeals: [],
      ingredients: [],
      loading: false,
      error: '',
    },
  });
  const [householdSettingsVisible, setHouseholdSettingsVisible] = useState(false);
  const {
    membersExpanded,
    selectedMealPeriod,
    votingOptionKey,
    chatUnreadCount,
    pollDeadlineVisible,
    pollDeadlineSaving,
    pollVotingSaving,
    shoppingListVisible,
    currentTime,
    sendingMealReminder,
    ingredientSummary,
  } = state;
  const setMembersExpanded = useMemo(
    () => createStateSetter(setState, 'membersExpanded'),
    [setState],
  );
  const setSelectedMealPeriod = useMemo(
    () => createStateSetter(setState, 'selectedMealPeriod'),
    [setState],
  );
  const setVotingOptionKey = useMemo(
    () => createStateSetter(setState, 'votingOptionKey'),
    [setState],
  );
  const setChatUnreadCount = useMemo(
    () => createStateSetter(setState, 'chatUnreadCount'),
    [setState],
  );
  const setPollDeadlineVisible = useMemo(
    () => createStateSetter(setState, 'pollDeadlineVisible'),
    [setState],
  );
  const setPollDeadlineSaving = useMemo(
    () => createStateSetter(setState, 'pollDeadlineSaving'),
    [setState],
  );
  const setPollVotingSaving = useMemo(
    () => createStateSetter(setState, 'pollVotingSaving'),
    [setState],
  );
  const setShoppingListVisible = useMemo(
    () => createStateSetter(setState, 'shoppingListVisible'),
    [setState],
  );
  const setCurrentTime = useMemo(
    () => createStateSetter(setState, 'currentTime'),
    [setState],
  );
  const setSendingMealReminder = useMemo(
    () => createStateSetter(setState, 'sendingMealReminder'),
    [setState],
  );
  const { sendMealReminder, isReminderActive } = useSendHouseholdMealReminder();
  const setIngredientSummary = useMemo(
    () => createStateSetter(setState, 'ingredientSummary'),
    [setState],
  );
  const requestRefs = useRef({
    householdLoad: 0,
    ingredientLoad: 0,
  });

  const loadHousehold = useCallback(
    async (silentRefresh = false, dateOverride?: string) => {
      const currentRequest = ++requestRefs.current.householdLoad;
      if (!user?.accessToken) {
        setState(previous => ({
          ...previous,
          loading: false,
          error: 'Vui lòng đăng nhập để sử dụng tính năng gia đình.',
        }));
        return;
      }
      const date = dateOverride ?? getHouseholdDateKey();
      setState(previous => ({
        ...previous,
        loading: silentRefresh ? previous.loading : true,
        mealPlanLoading: silentRefresh ? previous.mealPlanLoading : true,
        error: '',
        mealPlanError: '',
        date,
      }));
      try {
        const response = await fetchCurrentHousehold(user);
        if (currentRequest !== requestRefs.current.householdLoad) {
          return;
        }
        if (!response?.success || response.data === undefined) {
          setState(previous => ({
            ...previous,
            loading: false,
            saving: false,
            error: response?.message || 'Không thể tải thông tin gia đình.',
          }));
          return;
        }
        dispatch(
          cacheCurrentHousehold({ userId: user.id, household: response.data }),
        );
        if (!response.data) {
          setState(previous => ({
            ...previous,
            loading: false,
            mealPlanLoading: false,
            mealPlan: null,
            saving: false,
            error: '',
          }));
          return;
        }
        const mealPlanResponse = await fetchHouseholdMealPlan(user, date);
        if (currentRequest !== requestRefs.current.householdLoad) {
          return;
        }
        if (mealPlanResponse?.success && mealPlanResponse.data) {
          dispatch(
            cacheHouseholdMealPlan({
              userId: user.id,
              householdId: response.data.id,
              date: mealPlanResponse.data.date,
              mealPlan: mealPlanResponse.data,
            }),
          );
        }
        setState(previous => ({
          ...previous,
          loading: false,
          mealPlanLoading: false,
          mealPlan:
            mealPlanResponse?.success && mealPlanResponse.data
              ? mealPlanResponse.data
              : null,
          mealPlanError:
            mealPlanResponse?.success && mealPlanResponse.data
              ? ''
              : mealPlanResponse?.message ||
                'Không thể tải thực đơn chung hôm nay.',
          saving: false,
          error: '',
        }));
      } catch {
        if (currentRequest === requestRefs.current.householdLoad) {
          setState(previous => ({
            ...previous,
            loading: false,
            mealPlanLoading: false,
            saving: false,
            error: 'Không thể kết nối để tải thông tin gia đình.',
          }));
        }
      }
    },
    [dispatch, user],
  );

  useFocusEffect(
    useCallback(() => {
      loadHousehold(false, notificationDate);
      if (notificationMealPeriod) {
        setSelectedMealPeriod(notificationMealPeriod);
      }
      const interval = setInterval(() => {
        loadHousehold(true, notificationDate);
      }, 15_000);
      return () => {
        clearInterval(interval);
        requestRefs.current.householdLoad += 1;
      };
    }, [
      loadHousehold,
      notificationDate,
      notificationMealPeriod,
      setSelectedMealPeriod,
    ]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!user?.accessToken || !household?.id) {
        setChatUnreadCount(0);
        return undefined;
      }
      let active = true;
      const refreshUnreadCount = async () => {
        try {
          const count = await fetchHouseholdChatUnreadCount(user.accessToken);
          if (active) {
            setChatUnreadCount(count);
          }
        } catch (error) {
          console.error('Failed to refresh household chat unread count', error);
        }
      };
      refreshUnreadCount();
      const interval = setInterval(() => {
        refreshUnreadCount();
      }, 30_000);
      return () => {
        active = false;
        clearInterval(interval);
      };
    }, [household?.id, setChatUnreadCount, user?.accessToken]),
  );

  const handleRetryHousehold = useCallback(() => {
    loadHousehold();
  }, [loadHousehold]);

  const toggleMembersExpanded = useCallback(() => {
    setMembersExpanded(expanded => !expanded);
  }, [setMembersExpanded]);

  const handleVote = useCallback(
    async (mealPeriod: MealPeriod, mealId: string, agrees: boolean) => {
      if (!user?.accessToken || !household) {
        return;
      }
      setVotingOptionKey(`${mealPeriod}:${mealId}`);
      try {
        const response = await voteForHouseholdMeal(user, {
          mealId,
          date: state.date,
          mealPeriod,
          agrees,
        });
        if (!response.success) {
          Alert.alert(
            'Không thể ghi phiếu',
            response.message || 'Vui lòng thử lại.',
          );
          return;
        }
        dispatch(
          invalidateCachedHouseholdMealPlan({
            userId: user.id,
            householdId: household.id,
            date: state.date,
          }),
        );
        await loadHousehold(true);
      } catch {
        Alert.alert('Không thể ghi phiếu', 'Vui lòng thử lại sau.');
      } finally {
        setVotingOptionKey('');
      }
    },
    [dispatch, household, loadHousehold, setVotingOptionKey, state.date, user],
  );

  const selectedPoll = state.mealPlan?.meals[selectedMealPeriod].poll ?? null;
  const isVoting = Boolean(
    household?.mealVotingEnabled && selectedPoll && !selectedPoll.closedAt,
  );
  const selectedMealPlan = state.mealPlan?.meals[selectedMealPeriod] ?? null;
  const defaultPollCloseTime =
    selectedMealPeriod === 'LUNCH'
      ? household?.lunchPollCloseTime ?? '11:00'
      : household?.dinnerPollCloseTime ?? '17:00';
  const displayedPollCloseTime =
    selectedPoll && !selectedPoll.closedAt
      ? formatHouseholdDeadlineDateTime(selectedPoll.closesAt).time
      : defaultPollCloseTime;
  const reminderAllowed = isMealReminderAllowed(
    selectedMealPeriod,
    currentTime,
  );
  const reminderIsActive = household ? isReminderActive(household.id) : false;
  const handleSendMealReminder = useCallback(async () => {
    if (
      !household ||
      !reminderAllowed ||
      selectedMealPlan?.isCompleted ||
      reminderIsActive ||
      sendingMealReminder
    ) {
      return;
    }
    setSendingMealReminder(true);
    try {
      const response = await sendMealReminder(household.id, selectedMealPeriod);
      if (!response.success) {
        Alert.alert(
          'Không thể gửi lời nhắc',
          response.message || 'Vui lòng thử lại sau.',
        );
      }
    } catch (error) {
      console.error('Failed to send household meal reminder', error);
      Alert.alert(
        'Không thể gửi lời nhắc',
        'Đã xảy ra lỗi khi gửi. Vui lòng thử lại sau.',
      );
    } finally {
      setSendingMealReminder(false);
    }
  }, [
    household,
    reminderAllowed,
    reminderIsActive,
    selectedMealPeriod,
    selectedMealPlan?.isCompleted,
    sendMealReminder,
    setSendingMealReminder,
    sendingMealReminder,
  ]);
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => clearInterval(timer);
  }, [setCurrentTime]);
  const shoppingListDisabled = Boolean(selectedMealPlan?.isLocked);
  const handleOpenPollDeadline = useCallback(() => {
    setPollDeadlineVisible(true);
  }, [setPollDeadlineVisible]);
  const handleSetMealVotingEnabled = useCallback(
    async (enabled: boolean) => {
      if (!user?.accessToken || !household || pollVotingSaving) {
        return;
      }
      setPollVotingSaving(true);
      try {
        const response = await updateHouseholdMealVoting(user, enabled);
        if (!response.success || !response.data) {
          Alert.alert(
            'Không thể cập nhật bình chọn',
            response.message ||
              response.ErrorMessage ||
              'Máy chủ không trả về kết quả cập nhật. Vui lòng thử lại.',
          );
          return;
        }
        dispatch(
          cacheCurrentHousehold({
            userId: user.id,
            household: {
              ...household,
              mealVotingEnabled: response.data.mealVotingEnabled,
            },
          }),
        );
        dispatch(
          invalidateCachedHouseholdMealPlan({
            userId: user.id,
            householdId: household.id,
            date: state.date,
          }),
        );
        if (!enabled) {
          setPollDeadlineVisible(false);
        }
        await loadHousehold(true);
      } catch (error) {
        console.error('Failed to update household meal voting', error);
        Alert.alert(
          'Không thể cập nhật bình chọn',
          error instanceof Error && error.message
            ? error.message
            : 'Không thể kết nối đến máy chủ. Vui lòng thử lại.',
        );
      } finally {
        setPollVotingSaving(false);
      }
    },
    [
      dispatch,
      household,
      loadHousehold,
      pollVotingSaving,
      setPollDeadlineVisible,
      setPollVotingSaving,
      state.date,
      user,
    ],
  );
  const handleSetPollDeadline = useCallback(
    async (closesAt: string) => {
      if (!user?.accessToken || !household) {
        return;
      }
      setPollDeadlineSaving(true);
      try {
        const response = await updateHouseholdMealPollDeadline(user, {
          date: state.date,
          mealPeriod: selectedMealPeriod,
          closesAt,
        });
        if (!response?.success) {
          Alert.alert(
            'Không thể cập nhật thời hạn',
            response?.message || 'Vui lòng thử lại.',
          );
          return;
        }
        dispatch(
          invalidateCachedHouseholdMealPlan({
            userId: user.id,
            householdId: household.id,
            date: state.date,
          }),
        );
        setPollDeadlineVisible(false);
        await loadHousehold(true);
        Alert.alert(
          response.data?.currentPollUpdated
            ? 'Đã cập nhật giờ đóng bình chọn'
            : 'Đã lưu giờ mặc định',
          response.data?.currentPollUpdated
            ? 'Giờ này áp dụng cho bình chọn hiện tại và làm giờ mặc định cho các ngày sau.'
            : 'Giờ này sẽ là mặc định cho các ngày tiếp theo.',
        );
      } catch {
        Alert.alert(
          'Không thể cập nhật thời hạn',
          'Vui lòng kiểm tra kết nối và thử lại.',
        );
      } finally {
        setPollDeadlineSaving(false);
      }
    },
    [
      dispatch,
      household,
      loadHousehold,
      selectedMealPeriod,
      setPollDeadlineSaving,
      setPollDeadlineVisible,
      state.date,
      user,
    ],
  );
  const householdNutrition = useMemo(
    () =>
      (['LUNCH', 'DINNER'] as const).reduce(
        (total, period) => {
          const plan = state.mealPlan?.meals[period];
          if (!plan) {
            return total;
          }
          return {
            calories: total.calories + plan.nutritionSummary.calories,
            proteinG: total.proteinG + plan.nutritionSummary.proteinG,
            carbsG: total.carbsG + plan.nutritionSummary.carbsG,
            fatG: total.fatG + plan.nutritionSummary.fatG,
            unavailable: total.unavailable + plan.unavailableNutritionItems,
            estimatedPrice: {
              minVnd:
                total.estimatedPrice.minVnd +
                (plan.estimatedPrice?.minVnd ?? 0),
              maxVnd:
                total.estimatedPrice.maxVnd +
                (plan.estimatedPrice?.maxVnd ?? 0),
            },
          };
        },
        {
          calories: 0,
          proteinG: 0,
          carbsG: 0,
          fatG: 0,
          unavailable: 0,
          estimatedPrice: { minVnd: 0, maxVnd: 0 },
        },
      ),
    [state.mealPlan],
  );
  const acceptedPollOptions = useMemo(
    () =>
      selectedPoll?.closedAt
        ? selectedPoll.options.filter(option => option.outcome === 'ACCEPTED')
        : [],
    [selectedPoll],
  );

  const loadAcceptedIngredients = useCallback(async () => {
    if (!user?.accessToken || acceptedPollOptions.length === 0) {
      return;
    }
    const currentRequestId = ++requestRefs.current.ingredientLoad;
    const selectedMeals = acceptedPollOptions.map(option => ({
      id: option.mealId,
      name: option.meal.name,
      servings: option.servings,
    }));
    setIngredientSummary(previous => ({
      ...previous,
      visible: true,
      selectedMeals,
      ingredients: [],
      loading: true,
      error: '',
    }));
    setSyncUser(user);
    try {
      const details = await Promise.all(
        acceptedPollOptions.map(async option => {
          const response = (await syncApi(apiConst.getMealDetail, {
            id: option.mealId,
            servings: option.servings,
          })) as RecipeDetailResponse;
          if (!response?.success || !response.data) {
            throw new Error(
              response?.message ||
                response?.ErrorMessage ||
                `Không thể tải nguyên liệu của món ${option.meal.name}.`,
            );
          }
          return response.data;
        }),
      );
      if (currentRequestId !== requestRefs.current.ingredientLoad) {
        return;
      }
      setIngredientSummary(previous => ({
        ...previous,
        ingredients: aggregateMealIngredients(details),
        loading: false,
      }));
    } catch (error) {
      if (currentRequestId !== requestRefs.current.ingredientLoad) {
        return;
      }
      setIngredientSummary(previous => ({
        ...previous,
        ingredients: [],
        loading: false,
        error:
          error instanceof Error && error.message
            ? error.message
            : 'Không thể tổng hợp nguyên liệu. Vui lòng thử lại.',
      }));
    }
  }, [acceptedPollOptions, setIngredientSummary, user]);

  const closeIngredientSummary = useCallback(() => {
    requestRefs.current.ingredientLoad += 1;
    setIngredientSummary(previous => ({
      ...previous,
      visible: false,
      loading: false,
    }));
  }, [setIngredientSummary]);

  const createHousehold = useCallback(async () => {
    const name = state.householdName.trim();
    if (!name) {
      setState(previous => ({
        ...previous,
        error: 'Vui lòng nhập tên gia đình.',
      }));
      return;
    }
    if (!user?.accessToken) {
      return;
    }
    setSyncUser(user);
    setState(previous => ({ ...previous, saving: true, error: '' }));
    try {
      const response = (await syncApi(apiConst.createHousehold, {
        name,
      })) as HouseholdResponse;
      if (!response?.success || !response.data) {
        setState(previous => ({
          ...previous,
          saving: false,
          error: response?.message || 'Không thể tạo gia đình.',
        }));
        return;
      }
      dispatch(
        cacheCurrentHousehold({ userId: user.id, household: response.data }),
      );
      setState(previous => ({
        ...previous,
        saving: false,
        householdName: '',
        error: '',
      }));
      loadHousehold();
    } catch {
      setState(previous => ({
        ...previous,
        saving: false,
        error: 'Không thể kết nối để tạo gia đình.',
      }));
    }
  }, [dispatch, loadHousehold, state.householdName, user]);

  const joinHousehold = useCallback(async () => {
    const code = state.invitationCode.trim().toUpperCase();
    if (!code) {
      setState(previous => ({
        ...previous,
        error: 'Vui lòng nhập mã mời.',
      }));
      return;
    }
    if (!user?.accessToken) {
      return;
    }
    setSyncUser(user);
    setState(previous => ({ ...previous, saving: true, error: '' }));
    try {
      const response = await syncApi(apiConst.joinHousehold, {
        code,
      });
      if (!response?.success || !response.data) {
        setState(previous => ({
          ...previous,
          saving: false,
          error: response?.message || 'Không thể tham gia gia đình.',
        }));
        return;
      }
      dispatch(
        cacheCurrentHousehold({ userId: user.id, household: response.data }),
      );
      setState(previous => ({
        ...previous,
        saving: false,
        invitationCode: '',
        error: '',
      }));
      loadHousehold();
    } catch {
      setState(previous => ({
        ...previous,
        saving: false,
        error: 'Không thể kết nối để tham gia gia đình.',
      }));
    }
  }, [dispatch, loadHousehold, state.invitationCode, user]);

  const createInvitation = useCallback(async () => {
    if (!household || !user?.accessToken) {
      return;
    }
    setSyncUser(user);
    setState(previous => ({ ...previous, saving: true, error: '' }));
    try {
      const response = (await syncApi(apiConst.createHouseholdInvitation, {
        id: household.id,
      })) as HouseholdInvitationResponse;
      if (!response?.success || !response.data) {
        setState(previous => ({
          ...previous,
          saving: false,
          error: response?.message || 'Không thể tạo mã mời.',
        }));
        return;
      }
      setState(previous => ({
        ...previous,
        saving: false,
        invitationCode: response.data?.code ?? '',
        invitationExpiresAt: response.data?.expiresAt ?? '',
        error: '',
      }));
    } catch {
      setState(previous => ({
        ...previous,
        saving: false,
        error: 'Không thể kết nối để tạo mã mời.',
      }));
    }
  }, [household, user]);

  const removeMember = useCallback(
    (memberId: string, memberName: string) => {
      if (!household || !user?.accessToken) {
        return;
      }
      Alert.alert(
        'Xóa thành viên',
        `Bạn có chắc muốn xóa ${memberName} khỏi gia đình?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa',
            style: 'destructive',
            onPress: async () => {
              setSyncUser(user);
              setState(previous => ({
                ...previous,
                saving: true,
                error: '',
              }));
              try {
                const response = (await syncApi(
                  apiConst.removeHouseholdMember,
                  { id: household.id, memberId },
                )) as { success: boolean; message?: string };
                if (!response?.success) {
                  setState(previous => ({
                    ...previous,
                    saving: false,
                    error: response?.message || 'Không thể xóa thành viên.',
                  }));
                  return;
                }
                await loadHousehold();
              } catch {
                setState(previous => ({
                  ...previous,
                  saving: false,
                  error: 'Không thể kết nối để xóa thành viên.',
                }));
              }
            },
          },
        ],
      );
    },
    [household, loadHousehold, user],
  );

  const leaveHousehold = useCallback(() => {
    if (!user?.accessToken) {
      return;
    }
    Alert.alert(
      'Rời gia đình',
      'Bạn sẽ không còn xem hoặc cập nhật thực đơn chung.',
      [
        { text: 'Ở lại', style: 'cancel' },
        {
          text: 'Rời gia đình',
          style: 'destructive',
          onPress: async () => {
            setSyncUser(user);
            setState(previous => ({ ...previous, saving: true, error: '' }));
            try {
              const response = (await syncApi(apiConst.leaveHousehold)) as {
                success: boolean;
                message?: string;
              };
              if (!response?.success) {
                setState(previous => ({
                  ...previous,
                  saving: false,
                  error: response?.message || 'Không thể rời gia đình.',
                }));
                return;
              }
              dispatch(
                cacheCurrentHousehold({ userId: user.id, household: null }),
              );
              setState(previous => ({
                ...previous,
                saving: false,
                invitationExpiresAt: '',
                error: '',
              }));
            } catch {
              setState(previous => ({
                ...previous,
                saving: false,
                error: 'Không thể kết nối để rời gia đình.',
              }));
            }
          },
        },
      ],
    );
  }, [dispatch, user]);

  const handleHouseholdNameChange = useCallback((householdName: string) => {
    setState(previous => ({ ...previous, householdName, error: '' }));
  }, []);

  const handleInvitationCodeChange = useCallback((invitationCode: string) => {
    setState(previous => ({ ...previous, invitationCode, error: '' }));
  }, []);

  const handleRemoveMember = useCallback(
    (memberId: string, memberName: string) => {
      removeMember(memberId, memberName);
    },
    [removeMember],
  );

  const renderMember = useCallback(
    (member: HouseholdMember) => (
      <HouseholdMemberRow
        key={member.userId}
        canRemove={
          household?.currentRole === 'ADMIN' &&
          member.userId !== household.currentMemberId
        }
        member={member}
        onRemove={handleRemoveMember}
      />
    ),
    [handleRemoveMember, household],
  );

  const renderLunchMeal = useCallback(
    (meal: HouseholdPlannedMeal) => (
      <HouseholdPlannedMealRow key={meal.id} meal={meal} />
    ),
    [],
  );

  const renderDinnerMeal = useCallback(
    (meal: HouseholdPlannedMeal) => (
      <HouseholdPlannedMealRow key={meal.id} meal={meal} />
    ),
    [],
  );

  const handleRetryMealPlan = useCallback(() => {
    loadHousehold();
  }, [loadHousehold]);

  const handleConfirmCompleteHouseholdMeal = useCallback(
    async (mealPeriod: MealPeriod) => {
      if (!user?.accessToken || !household) {
        return;
      }
      setState(previous => ({ ...previous, completingPeriod: mealPeriod }));
      try {
        const response = await completeMealPeriod(user, 'HOUSEHOLD', {
          date: state.date,
          mealPeriod,
        });
        if (!response.success) {
          Alert.alert(
            'Không thể hoàn thành bữa ăn',
            response.message || 'Vui lòng thử lại.',
          );
          return;
        }
        dispatch(invalidateCachedConsumptionReports({ userId: user.id }));
        dispatch(
          invalidateCachedHouseholdMealPlan({
            userId: user.id,
            householdId: household.id,
            date: state.date,
          }),
        );
        await loadHousehold();
      } catch {
        Alert.alert('Không thể hoàn thành bữa ăn', 'Vui lòng thử lại sau.');
      } finally {
        setState(previous => ({ ...previous, completingPeriod: null }));
      }
    },
    [dispatch, household, loadHousehold, state.date, user],
  );

  const handleCompleteLunch = useCallback(() => {
    const plan = state.mealPlan?.meals.LUNCH;
    if (!plan || getFinalizedMeals(plan.items, plan.poll).length === 0) {
      return;
    }
    Alert.alert(
      'Xác nhận đã ăn bữa trưa?',
      'Toàn bộ món trong bữa trưa sẽ được lưu vào báo cáo dinh dưỡng của bạn. Không thể hoàn tác.',
      [
        { text: 'Chưa ăn', style: 'cancel' },
        {
          text: 'Đã ăn',
          onPress: () => handleConfirmCompleteHouseholdMeal('LUNCH'),
        },
      ],
    );
  }, [handleConfirmCompleteHouseholdMeal, state.mealPlan]);

  const handleCompleteDinner = useCallback(() => {
    const plan = state.mealPlan?.meals.DINNER;
    if (!plan || getFinalizedMeals(plan.items, plan.poll).length === 0) {
      return;
    }
    Alert.alert(
      'Xác nhận đã ăn bữa tối?',
      'Toàn bộ món trong bữa tối sẽ được lưu vào báo cáo dinh dưỡng của bạn. Không thể hoàn tác.',
      [
        { text: 'Chưa ăn', style: 'cancel' },
        {
          text: 'Đã ăn',
          onPress: () => handleConfirmCompleteHouseholdMeal('DINNER'),
        },
      ],
    );
  }, [handleConfirmCompleteHouseholdMeal, state.mealPlan]);

  return (
    <View style={[styles.screen, embedded && styles.embeddedScreen]}>
      <ScrollView
        contentContainerStyle={[styles.content, scrollContentInsets]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!embedded ? (
          <ScreenHeader
            title="Gia đình"
            subtitle="Thực đơn chung cho gia đình của bạn."
            style={styles.sharedHeader}
            rightAction={
              household ? (
                <View style={styles.headerActions}>
                  <HouseholdChatButton
                    unreadCount={chatUnreadCount}
                    onPress={() =>
                      navigate(ScreenKeys.HOUSEHOLD_CHAT, {
                        householdId: household.id,
                        householdName: household.name,
                      })
                    }
                  />
                </View>
              ) : null
            }
          />
        ) : null}

        {state.loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.green} />
          </View>
        ) : household ? (
          <>
            <View style={styles.householdCard}>
              <LinearGradient
                colors={['#FFFFFF', '#EAF6EE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.householdHeading}>
                <Text numberOfLines={1} style={styles.householdName}>
                  {household.name}
                </Text>
                {household.currentRole === 'ADMIN' ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setHouseholdSettingsVisible(true)}
                    style={styles.householdSettingsButton}
                  >
                    <Text style={styles.householdSettingsButtonText}>
                      Cài đặt
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.memberCount}>
                {household.members.length} thành viên ·{' '}
                {household.currentRole === 'ADMIN'
                  ? 'Quản trị viên'
                  : 'Thành viên'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  shoppingListDisabled
                    ? 'Danh sách đi chợ không khả dụng vì bữa ăn đã hoàn thành'
                    : `Mở danh sách đi chợ cho ${
                        selectedMealPeriod === 'LUNCH' ? 'bữa trưa' : 'bữa tối'
                      }`
                }
                accessibilityState={{ disabled: shoppingListDisabled }}
                disabled={shoppingListDisabled}
                onPress={() => setShoppingListVisible(true)}
                style={[
                  styles.shoppingListButton,
                  shoppingListDisabled && styles.shoppingListButtonDisabled,
                ]}
              >
                <Text style={styles.shoppingListButtonText}>
                  Danh sách đi chợ ·{' '}
                  {selectedMealPeriod === 'LUNCH' ? 'Bữa trưa' : 'Bữa tối'}
                </Text>
                <Text style={styles.shoppingListButtonArrow}>›</Text>
              </Pressable>
            </View>

            {household.currentRole === 'ADMIN' ? (
              <View style={styles.inviteCard}>
                <LinearGradient
                  colors={['#FFFFFF', '#F3FAF5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.sectionTitle}>Mời người thân</Text>
                <Text style={styles.helper}>
                  Mã mời có hiệu lực 7 ngày và tối đa 20 lượt tham gia.
                </Text>
                <ActionButton
                  label={state.saving ? 'Đang tạo mã...' : 'Tạo mã mời'}
                  disabled={state.saving}
                  onPress={createInvitation}
                />
                {state.invitationCode ? (
                  <View style={styles.codeBox}>
                    <LinearGradient
                      colors={['#FFFFFF', '#EAF6EE']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={styles.codeLabel}>MÃ MỜI</Text>
                    <Text selectable style={styles.code}>
                      {state.invitationCode}
                    </Text>
                    <Text style={styles.helper}>
                      Hết hạn:{' '}
                      {new Date(state.invitationExpiresAt).toLocaleString()}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <View style={styles.membersCard}>
              <LinearGradient
                colors={['#FFFFFF', '#F3FAF5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: membersExpanded }}
                onPress={toggleMembersExpanded}
                style={styles.membersHeader}
              >
                <Text style={styles.sectionTitle}>
                  Thành viên ({household.members.length})
                </Text>
                <Text style={styles.membersToggle}>
                  {membersExpanded ? 'Ẩn' : 'Xem'}
                </Text>
              </Pressable>
              {membersExpanded ? household.members.map(renderMember) : null}
            </View>
            {state.mealPlan ? (
              <View style={styles.nutritionCard}>
                <LinearGradient
                  colors={['#FFFFFF', '#F3FAF5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.sectionTitle}>
                  Dinh dưỡng dự kiến trong ngày
                </Text>
                <Text style={styles.nutritionCalories}>
                  {Math.round(householdNutrition.calories)} kcal
                </Text>
                <Text style={styles.helper}>
                  Đạm {householdNutrition.proteinG.toFixed(1)} g · Carb{' '}
                  {householdNutrition.carbsG.toFixed(1)} g · Béo{' '}
                  {householdNutrition.fatG.toFixed(1)} g
                </Text>
                <Text style={styles.nutritionPrice}>
                  Chi phí ước tính:{' '}
                  {formatEstimatedPrice(householdNutrition.estimatedPrice)}
                </Text>
                <Text style={styles.nutritionNote}>
                  Tổng dinh dưỡng của các món đã lên thực đơn cho bữa trưa và
                  bữa tối.
                </Text>
                {householdNutrition.unavailable > 0 ? (
                  <Text style={styles.nutritionNote}>
                    {householdNutrition.unavailable} món chưa tính được dinh
                    dưỡng do thiếu dữ liệu khối lượng.
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.mealPlanCard}>
              <LinearGradient
                colors={['#FFFFFF', '#F3FAF5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.mealPlanHeading}>
                <Text style={styles.sectionTitle}>
                  {isVoting ? 'Bình chọn món' : 'Thực đơn gia đình hôm nay'}
                </Text>
                {household.mealVotingEnabled &&
                (selectedPoll || household.currentRole === 'ADMIN') ? (
                  <View style={styles.pollCloseTime}>
                    <Text style={styles.pollCloseTimeText}>
                      Đóng chọn lúc {displayedPollCloseTime}
                    </Text>
                    {household.currentRole === 'ADMIN' ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Đổi giờ đóng bình chọn"
                        accessibilityState={{ disabled: pollDeadlineSaving }}
                        disabled={pollDeadlineSaving}
                        onPress={handleOpenPollDeadline}
                        style={styles.pollCloseTimeEdit}
                      >
                        <Text style={styles.pollCloseTimeEditText}>✎</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </View>
              {isVoting && selectedPoll ? (
                <View style={styles.votingCountRow}>
                  <Text style={styles.votingCount}>
                    {selectedPoll.options.length
                      ? `${selectedPoll.options.length} món`
                      : 'Chưa đề xuất món'}
                  </Text>
                  <Text style={styles.helper}> · Ngày {state.date}</Text>
                </View>
              ) : null}

              {state.mealPlanLoading ? (
                <ActivityIndicator color={COLORS.green} />
              ) : state.mealPlanError ? (
                <View>
                  <Text style={styles.mealPlanError}>
                    {state.mealPlanError}
                  </Text>
                  <Pressable onPress={handleRetryMealPlan}>
                    <Text style={styles.retry}>Tải lại thực đơn</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View
                    accessibilityRole="tablist"
                    style={styles.mealPeriodTabs}
                  >
                    {(['LUNCH', 'DINNER'] as const).map(period => {
                      const selected = selectedMealPeriod === period;
                      const plan = state.mealPlan?.meals[period];
                      return (
                        <Pressable
                          key={period}
                          accessibilityRole="button"
                          accessibilityLabel={`${
                            period === 'LUNCH' ? 'Bữa trưa' : 'Bữa tối'
                          }, ${getMealPeriodSummary(
                            plan,
                            household.mealVotingEnabled,
                          )}`}
                          accessibilityState={{ selected }}
                          onPress={() => setSelectedMealPeriod(period)}
                          style={[
                            styles.mealPeriodTab,
                            selected && styles.mealPeriodTabSelected,
                          ]}
                        >
                          {selected ? (
                            <LinearGradient
                              colors={['#FFFFFF', '#EAF6EE']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={StyleSheet.absoluteFill}
                            />
                          ) : null}
                          <Text
                            style={[
                              styles.mealPeriodTabTitle,
                              selected && styles.mealPeriodTabTitleSelected,
                            ]}
                          >
                            {period === 'LUNCH' ? 'Bữa trưa' : 'Bữa tối'}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.mealPeriodTabSummary,
                              selected && styles.mealPeriodTabSummarySelected,
                            ]}
                          >
                            {getMealPeriodSummary(
                              plan,
                              household.mealVotingEnabled,
                            )}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {!isVoting ? (
                    <HouseholdMealPeriodCard
                      label={
                        selectedMealPeriod === 'LUNCH' ? 'Bữa trưa' : 'Bữa tối'
                      }
                      items={
                        state.mealPlan?.meals[selectedMealPeriod].items ?? []
                      }
                      nutrition={
                        state.mealPlan?.meals[selectedMealPeriod]
                          .nutritionSummary ?? null
                      }
                      estimatedPrice={
                        state.mealPlan?.meals[selectedMealPeriod].estimatedPrice
                      }
                      unavailableNutritionItems={
                        state.mealPlan?.meals[selectedMealPeriod]
                          .unavailableNutritionItems ?? 0
                      }
                      renderMeal={
                        selectedMealPeriod === 'LUNCH'
                          ? renderLunchMeal
                          : renderDinnerMeal
                      }
                      completed={Boolean(
                        state.mealPlan?.meals[selectedMealPeriod].isCompleted,
                      )}
                      locked={Boolean(
                        state.mealPlan?.meals[selectedMealPeriod].isLocked,
                      )}
                      poll={
                        household.mealVotingEnabled
                          ? state.mealPlan?.meals[selectedMealPeriod].poll ??
                            null
                          : null
                      }
                      completing={state.completingPeriod === selectedMealPeriod}
                      onComplete={
                        selectedMealPeriod === 'LUNCH'
                          ? handleCompleteLunch
                          : handleCompleteDinner
                      }
                    />
                  ) : null}
                  {isVoting && selectedPoll ? (
                    <HouseholdMealPollCard
                      key={`${selectedMealPeriod}:${selectedPoll.closesAt}:open`}
                      poll={selectedPoll}
                      mealPeriod={selectedMealPeriod}
                      votingOptionKey={votingOptionKey}
                      onVote={handleVote}
                      onViewIngredients={loadAcceptedIngredients}
                    />
                  ) : null}
                  {reminderAllowed ? (
                    <View style={styles.mealReminder}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{
                          disabled:
                            reminderIsActive ||
                            Boolean(selectedMealPlan?.isCompleted) ||
                            sendingMealReminder,
                        }}
                        disabled={
                          reminderIsActive ||
                          Boolean(selectedMealPlan?.isCompleted) ||
                          sendingMealReminder
                        }
                        onPress={handleSendMealReminder}
                        style={[
                          styles.mealReminderButton,
                          (reminderIsActive ||
                            Boolean(selectedMealPlan?.isCompleted) ||
                            sendingMealReminder) &&
                            styles.mealReminderButtonDisabled,
                        ]}
                      >
                        {sendingMealReminder ? (
                          <ActivityIndicator color={COLORS.white} />
                        ) : (
                          <Text style={styles.mealReminderButtonText}>
                            {reminderIsActive
                              ? 'Đang chờ xác nhận'
                              : `Nhắc ăn ${
                                  selectedMealPeriod === 'LUNCH'
                                    ? 'bữa trưa'
                                    : 'bữa tối'
                                }`}
                          </Text>
                        )}
                      </Pressable>
                      <Text style={styles.mealReminderHint}>
                        {selectedMealPlan?.isCompleted
                          ? 'Bữa ăn đã hoàn thành.'
                          : reminderIsActive
                          ? 'Lời nhắc sẽ dừng khi có thành viên nhấn Đồng ý.'
                          : `Có thể nhắc trong khung giờ ${getMealReminderWindowLabel(
                              selectedMealPeriod,
                            )} (giờ Việt Nam).`}
                      </Text>
                    </View>
                  ) : null}
                </>
              )}
            </View>
            {household.mealVotingEnabled &&
            (selectedPoll || household.currentRole === 'ADMIN') ? (
              <>
                {selectedPoll?.closedAt ? (
                  <HouseholdMealPollCard
                    key={`${selectedMealPeriod}:${selectedPoll.closesAt}:closed`}
                    poll={selectedPoll}
                    mealPeriod={selectedMealPeriod}
                    votingOptionKey={votingOptionKey}
                    onVote={handleVote}
                    onViewIngredients={loadAcceptedIngredients}
                  />
                ) : null}
                <HouseholdPollScheduleModal
                  visible={pollDeadlineVisible}
                  date={state.date}
                  mealPeriod={selectedMealPeriod}
                  closesAt={
                    !selectedPoll || selectedPoll.closedAt
                      ? null
                      : selectedPoll.closesAt
                  }
                  defaultCloseTime={
                    selectedMealPeriod === 'LUNCH'
                      ? household.lunchPollCloseTime ?? '11:00'
                      : household.dinnerPollCloseTime ?? '17:00'
                  }
                  saving={pollDeadlineSaving}
                  onCancel={() => setPollDeadlineVisible(false)}
                  onConfirm={handleSetPollDeadline}
                />
              </>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={state.saving}
              onPress={leaveHousehold}
              style={styles.leaveButton}
            >
              <Text style={styles.leaveButtonText}>Rời gia đình</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.formCard}>
              <LinearGradient
                colors={['#FFFFFF', '#F3FAF5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.sectionTitle}>Tạo gia đình</Text>
              <Text style={styles.helper}>
                Bạn sẽ trở thành quản trị viên và có thể mời các thành viên.
              </Text>
              <TextInput
                accessibilityLabel="Tên gia đình"
                maxLength={60}
                onChangeText={handleHouseholdNameChange}
                placeholder="Ví dụ: Gia đình An"
                placeholderTextColor={COLORS.secondary}
                style={styles.input}
                value={state.householdName}
              />
              <ActionButton
                label={state.saving ? 'Đang tạo...' : 'Tạo gia đình'}
                disabled={state.saving || !user?.accessToken}
                onPress={createHousehold}
              />
            </View>
            <View style={styles.formCard}>
              <LinearGradient
                colors={['#FFFFFF', '#F3FAF5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.sectionTitle}>Tham gia bằng mã mời</Text>
              <Text style={styles.helper}>
                Nhập mã gồm 12 ký tự do quản trị viên chia sẻ.
              </Text>
              <TextInput
                accessibilityLabel="Mã mời gia đình"
                autoCapitalize="characters"
                maxLength={12}
                onChangeText={handleInvitationCodeChange}
                placeholder="MÃ MỜI"
                placeholderTextColor={COLORS.secondary}
                style={styles.input}
                value={state.invitationCode}
              />
              <ActionButton
                label={state.saving ? 'Đang tham gia...' : 'Tham gia gia đình'}
                disabled={state.saving || !user?.accessToken}
                onPress={joinHousehold}
              />
            </View>
          </>
        )}

        {state.error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{state.error}</Text>
            <Pressable onPress={handleRetryHousehold}>
              <Text style={styles.retry}>Tải lại thông tin gia đình</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
      <HomeIngredientSummaryModal
        visible={ingredientSummary.visible}
        selectedMeals={ingredientSummary.selectedMeals}
        ingredients={ingredientSummary.ingredients}
        loading={ingredientSummary.loading}
        error={ingredientSummary.error}
        onClose={closeIngredientSummary}
        onRetry={loadAcceptedIngredients}
      />
      <HouseholdShoppingListModal
        visible={shoppingListVisible}
        token={user?.accessToken}
        date={state.date}
        mealPeriod={selectedMealPeriod}
        disabled={shoppingListDisabled}
        householdName={household?.name ?? 'Gia đình'}
        onClose={() => setShoppingListVisible(false)}
      />
      {household?.currentRole === 'ADMIN' ? (
        <HouseholdSettingsModal
          visible={householdSettingsVisible}
          mealVotingEnabled={household.mealVotingEnabled}
          saving={pollVotingSaving}
          onClose={() => setHouseholdSettingsVisible(false)}
          onVotingChange={handleSetMealVotingEnabled}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  embeddedScreen: { marginBottom: 0 },
  content: { paddingHorizontal: 18 },
  sharedHeader: { paddingHorizontal: 0 },
  topBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  back: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44 },
  backText: { color: COLORS.green, fontSize: 14, fontWeight: '700' },
  title: { color: COLORS.text, fontSize: 27, fontWeight: '800' },
  subtitle: {
    color: COLORS.secondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
    marginBottom: 20,
  },
  loading: { minHeight: 160, alignItems: 'center', justifyContent: 'center' },
  householdCard: {
    padding: 18,
    borderRadius: 12,
    marginBottom: 14,
    overflow: 'hidden',
  },
  eyebrow: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  householdName: {
    flex: 1,
    minWidth: 0,
    color: COLORS.text,
    fontSize: 23,
    fontWeight: '800',
    marginTop: 8,
  },
  householdHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  householdSettingsButton: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  householdSettingsButtonText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '700',
  },
  memberCount: { color: COLORS.secondary, fontSize: 13, marginTop: 5 },
  shoppingListButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 13,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  shoppingListButtonText: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: '800',
  },
  shoppingListButtonDisabled: {
    opacity: 0.45,
  },
  shoppingListButtonArrow: {
    color: COLORS.green,
    fontSize: 16,
    lineHeight: 20,
  },
  inviteCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },
  membersCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingTop: 0,
    marginBottom: 14,
    overflow: 'hidden',
  },
  nutritionCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },
  nutritionCalories: {
    color: COLORS.green,
    fontSize: 23,
    fontWeight: '800',
    marginTop: 10,
  },
  nutritionPrice: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 7,
  },
  nutritionNote: {
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  membersHeader: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  membersToggle: { color: COLORS.green, fontSize: 13, fontWeight: '800' },
  mealPlanCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },
  votingCount: {
    color: COLORS.secondary,
    fontSize: 12,
  },
  votingCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  mealPeriodTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  mealPeriodTab: {
    flex: 1,
    minHeight: 62,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  mealPeriodTabSelected: {
    borderColor: COLORS.green,
  },
  mealPeriodTabTitle: {
    color: COLORS.secondary,
    fontSize: 13,
    fontWeight: '700',
  },
  mealPeriodTabTitleSelected: { color: COLORS.green },
  mealPeriodTabSummary: {
    color: COLORS.secondary,
    fontSize: 10,
    marginTop: 4,
  },
  mealPeriodTabSummarySelected: { color: COLORS.text },
  mealPlanHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  pollCloseTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pollCloseTimeText: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '600',
  },
  pollCloseTimeEdit: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pollCloseTimeEditText: {
    color: COLORS.green,
    fontSize: 17,
    fontWeight: '700',
  },
  mealReminder: {
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  mealReminderButton: {
    minHeight: 46,
    minWidth: 210,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: COLORS.green,
  },
  mealReminderButtonDisabled: {
    opacity: 0.55,
  },
  mealReminderButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  mealReminderHint: {
    marginTop: 8,
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  mealPlanError: { color: COLORS.danger, fontSize: 12, marginVertical: 8 },
  formCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  helper: {
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    paddingHorizontal: 13,
    marginBottom: 10,
  },
  codeBox: {
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    overflow: 'hidden',
  },
  codeLabel: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  code: {
    color: COLORS.text,
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: 3,
    marginVertical: 4,
  },
  leaveButton: {
    minHeight: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightDanger,
  },
  leaveButtonText: { color: COLORS.danger, fontSize: 13, fontWeight: '800' },
  errorBox: {
    borderRadius: 12,
    backgroundColor: COLORS.lightDanger,
    padding: 12,
    marginTop: 4,
  },
  errorText: { color: COLORS.danger, fontSize: 13, lineHeight: 18 },
  retry: { color: COLORS.green, fontWeight: '800', marginTop: 8 },
});

export default HouseholdScreen;
