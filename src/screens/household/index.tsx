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
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { AppImage } from '../../abase/component';
import { goBack, navigate } from '../../utils/navigation';
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
  voteForHouseholdMeal,
} from '../../utils/householdApi';
import { fetchHouseholdChatUnreadCount } from '../../utils/householdChatApi';
import { fetchHouseholdNotificationUnreadCount } from '../../utils/householdNotificationApi';
import type {
  MealPeriod,
  HouseholdMealPoll,
  HouseholdMealPollOption,
  HouseholdMealPeriodPlan,
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
import HouseholdNotificationButton from './HouseholdNotificationButton';
import HouseholdPollScheduleModal from './HouseholdPollScheduleModal';
import HouseholdShoppingListModal from './HouseholdShoppingListModal';
import { useSendHouseholdMealReminder } from './HouseholdMealReminderProvider';
import {
  getMealReminderWindowLabel,
  isMealReminderAllowed,
} from '../../utils/mealReminderUtils';
import { createStateSetter } from '../../utils/stateUtils';
import {
  formatPollDeadline,
  getCurrentMealPeriod,
  getFinalizedMeals,
  getHouseholdDateKey,
  getMealPeriodSummary,
} from '../../utils/householdScreenUtils';

const COLORS = {
  background: '#F5F7F5',
  white: '#FFFFFF',
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  lightGreen: '#E7F4EC',
  border: '#E5EBE7',
  danger: '#B42318',
  lightDanger: '#FEF3F2',
};

const HouseholdScreen = ({ embedded = false }: { embedded?: boolean }) => {
  const route =
    useRoute<RouteProp<RootStackParamList, typeof ScreenKeys.FAMILY>>();
  const notificationDate = route.params?.date;
  const notificationMealPeriod = route.params?.mealPeriod;
  const insets = useSafeAreaInsets();
  const scrollContentInsets = useMemo(
    () => ({
      paddingTop: embedded ? 0 : insets.top + 14,
      paddingBottom: embedded ? 16 : insets.bottom + 40,
    }),
    [embedded, insets.bottom, insets.top],
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
    notificationUnreadCount: 0,
    pollDeadlineVisible: false,
    pollDeadlineSaving: false,
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
  const {
    membersExpanded,
    selectedMealPeriod,
    votingOptionKey,
    chatUnreadCount,
    notificationUnreadCount,
    pollDeadlineVisible,
    pollDeadlineSaving,
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
  const setNotificationUnreadCount = useMemo(
    () => createStateSetter(setState, 'notificationUnreadCount'),
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
  const { sendMealReminder, isReminderActive } =
    useSendHouseholdMealReminder();
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

  useFocusEffect(
    useCallback(() => {
      if (!user?.accessToken || !household?.id) {
        setNotificationUnreadCount(0);
        return undefined;
      }
      let active = true;
      const refreshUnreadCount = async () => {
        try {
          const count = await fetchHouseholdNotificationUnreadCount(
            user.accessToken,
          );
          if (active) {
            setNotificationUnreadCount(count);
          }
        } catch (error) {
          console.error(
            'Failed to refresh household notification unread count',
            error,
          );
        }
      };
      refreshUnreadCount();
      const interval = setInterval(refreshUnreadCount, 30_000);
      return () => {
        active = false;
        clearInterval(interval);
      };
    }, [household?.id, setNotificationUnreadCount, user?.accessToken]),
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
    [
      dispatch,
      household,
      loadHousehold,
      setVotingOptionKey,
      state.date,
      user,
    ],
  );

  const selectedPoll = state.mealPlan?.meals[selectedMealPeriod].poll ?? null;
  const selectedMealPlan = state.mealPlan?.meals[selectedMealPeriod] ?? null;
  const reminderAllowed = isMealReminderAllowed(
    selectedMealPeriod,
    currentTime,
  );
  const reminderIsActive = household
    ? isReminderActive(household.id)
    : false;
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
      const response = await sendMealReminder(
        household.id,
        selectedMealPeriod,
      );
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
          };
        },
        { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, unavailable: 0 },
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
          <>
            <View style={styles.topBar}>
              <Pressable
                accessibilityRole="button"
                onPress={goBack}
                style={styles.back}
              >
                <Text style={styles.backText}>‹ Quay lại</Text>
              </Pressable>
              {household ? (
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
                  <HouseholdNotificationButton
                    unreadCount={notificationUnreadCount}
                    onPress={() => navigate(ScreenKeys.NOTIFICATIONS)}
                  />
                </View>
              ) : null}
            </View>
            <Text style={styles.title}>Gia đình</Text>
            <Text style={styles.subtitle}>
              Cùng xem và quản lý thực đơn chung với những người thân.
            </Text>
          </>
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
              <Text style={styles.eyebrow}>THỰC ĐƠN CHUNG</Text>
              <Text style={styles.householdName}>{household.name}</Text>
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
                <Text style={styles.nutritionNote}>
                  Tổng dinh dưỡng của các món đã lên thực đơn cho bữa trưa và
                  bữa tối; đây không phải nhật ký món đã ăn.
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
              <Text style={styles.sectionTitle}>Thực đơn gia đình hôm nay</Text>
              <Text style={styles.helper}>
                Ngày {state.date} · Chọn bữa để xem món và bình chọn
              </Text>
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
                          }, ${getMealPeriodSummary(plan)}`}
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
                            {getMealPeriodSummary(plan)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
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
                      state.mealPlan?.meals[selectedMealPeriod].poll ?? null
                    }
                    completing={state.completingPeriod === selectedMealPeriod}
                    onComplete={
                      selectedMealPeriod === 'LUNCH'
                        ? handleCompleteLunch
                        : handleCompleteDinner
                    }
                  />
                  <View style={styles.mealReminder}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{
                        disabled:
                          !reminderAllowed ||
                          reminderIsActive ||
                          Boolean(selectedMealPlan?.isCompleted) ||
                          sendingMealReminder,
                      }}
                      disabled={
                        !reminderAllowed ||
                        reminderIsActive ||
                        Boolean(selectedMealPlan?.isCompleted) ||
                        sendingMealReminder
                      }
                      onPress={handleSendMealReminder}
                      style={[
                        styles.mealReminderButton,
                        (!reminderAllowed ||
                          reminderIsActive ||
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
                            : `Nhắc ăn ày ${selectedMealPeriod === 'LUNCH' ? 'bữa trưa' : 'bữa tối'}`}
                        </Text>
                      )}
                    </Pressable>
                    <Text style={styles.mealReminderHint}>
                      {selectedMealPlan?.isCompleted
                        ? 'Bữa ăn đã hoàn thành.'
                        : reminderIsActive
                          ? 'Lời nhắc sẽ dừng khi có thành viên nhấn Đồng ý.'
                          : reminderAllowed
                            ? `Có thể nhắc trong khung giờ ${getMealReminderWindowLabel(
                                selectedMealPeriod,
                              )} (giờ Việt Nam).`
                            : `Chỉ khả dụng trong khung giờ ${getMealReminderWindowLabel(
                                selectedMealPeriod,
                              )} (giờ Việt Nam).`}
                    </Text>
                  </View>
                </>
              )}
            </View>
            {selectedPoll || household.currentRole === 'ADMIN' ? (
              <>
                <View style={styles.pollDeadlineCard}>
                  <LinearGradient
                    colors={['#FFFFFF', '#F3FAF5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.pollDeadlineCopy}>
                    <Text style={styles.pollDeadlineTitle}>
                      Giờ đóng bình chọn
                    </Text>
                    <Text style={styles.pollDeadlineValue}>
                      {!selectedPoll
                        ? `Giờ mặc định: ${
                            selectedMealPeriod === 'LUNCH'
                              ? household.lunchPollCloseTime ?? '11:00'
                              : household.dinnerPollCloseTime ?? '17:00'
                          }`
                        : selectedPoll.closedAt
                        ? `Đã đóng · hạn ${formatPollDeadline(
                            selectedPoll.closesAt,
                          )}`
                        : `Đóng lúc ${formatPollDeadline(
                            selectedPoll.closesAt,
                          )}`}
                    </Text>
                    <Text style={styles.pollDeadlineHint}>
                      Áp dụng cho tất cả món trong{' '}
                      {selectedMealPeriod === 'LUNCH' ? 'bữa trưa' : 'bữa tối'}.
                      {selectedPoll
                        ? ` Giờ mặc định các ngày sau: ${
                            selectedMealPeriod === 'LUNCH'
                              ? household.lunchPollCloseTime ?? '11:00'
                              : household.dinnerPollCloseTime ?? '17:00'
                          }.`
                        : ' Quản trị viên có thể thiết lập giờ mặc định cho các ngày sau.'}
                    </Text>
                  </View>
                  {household.currentRole === 'ADMIN' ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Chọn ngày và giờ bình chọn, áp dụng giờ mặc định cho những ngày tiếp theo"
                      disabled={pollDeadlineSaving}
                      onPress={() => setPollDeadlineVisible(true)}
                      style={[
                        styles.pollDeadlineButton,
                        pollDeadlineSaving && styles.pollDeadlineButtonDisabled,
                      ]}
                    >
                      <Text style={styles.pollDeadlineButtonText}>
                        {!selectedPoll || selectedPoll.closedAt
                          ? 'Đặt giờ mặc định'
                          : 'Đổi thời hạn'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
                {selectedPoll ? (
                  <HouseholdMealPollCard
                    key={`${selectedMealPeriod}:${selectedPoll.closesAt}`}
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
    </View>
  );
};

const HouseholdPlannedMealRow = ({ meal }: { meal: HouseholdPlannedMeal }) => {
  const handlePress = useCallback(() => {
    navigate(ScreenKeys.RECIPE_DETAIL, { mealId: meal.meal.id });
  }, [meal.meal.id]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Xem chi tiết món ${meal.meal.name}`}
      onPress={handlePress}
      style={styles.mealRow}
    >
      {meal.meal.imageUrl ? (
        <AppImage
          source={{ uri: meal.meal.imageUrl }}
          style={styles.mealImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.mealImage, styles.mealImagePlaceholder]}>
          <Text style={styles.memberInitial}>MC</Text>
        </View>
      )}
      <View style={styles.mealDetails}>
        <Text numberOfLines={1} style={styles.mealName}>
          {meal.meal.name}
        </Text>
        {meal.meal.description ? (
          <Text numberOfLines={2} style={styles.mealDescription}>
            {meal.meal.description}
          </Text>
        ) : null}
        <Text style={styles.mealMeta}>
          {meal.servings} khẩu phần · Thêm bởi{' '}
          {meal.addedBy.fullName?.trim() || 'thành viên'}
        </Text>
      </View>
      <Text style={[styles.mealStatus, meal.isConsumed && styles.mealConsumed]}>
        {meal.isConsumed ? 'Đã ăn' : 'Chưa ăn'}
      </Text>
    </Pressable>
  );
};

const HouseholdMealPeriodCard = ({
  label,
  items,
  nutrition,
  unavailableNutritionItems,
  renderMeal,
  completed,
  locked,
  poll,
  completing,
  onComplete,
}: {
  label: string;
  items: HouseholdMealPeriodPlan['items'];
  nutrition: HouseholdMealPeriodPlan['nutritionSummary'] | null;
  unavailableNutritionItems: number;
  renderMeal: (meal: HouseholdPlannedMeal) => React.ReactNode;
  completed: boolean;
  locked: boolean;
  poll: HouseholdMealPoll | null;
  completing: boolean;
  onComplete: () => void;
}) => {
  const finalizedItems = getFinalizedMeals(items, poll);
  return (
    <View style={styles.mealPeriod}>
      <View style={styles.mealPeriodHeader}>
        <Text style={styles.mealPeriodTitle}>{label}</Text>
        {completed ? (
          <Text style={styles.mealCompletedLabel}>Bạn đã hoàn thành</Text>
        ) : null}
      </View>
      {items.length > 0 ? (
        <View style={styles.periodNutrition}>
          <LinearGradient
            colors={['#FFFFFF', '#EAF6EE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.periodNutritionCalories}>
            {nutrition && nutrition.calories > 0
              ? `${Math.round(nutrition.calories)} kcal dự kiến`
              : 'Chưa có dữ liệu calo'}
          </Text>
          {nutrition && nutrition.calories > 0 ? (
            <Text style={styles.periodNutritionMacros}>
              Đạm {nutrition.proteinG.toFixed(1)} g · Carb{' '}
              {nutrition.carbsG.toFixed(1)} g · Béo {nutrition.fatG.toFixed(1)}{' '}
              g
            </Text>
          ) : null}
          {unavailableNutritionItems > 0 ? (
            <Text style={styles.periodNutritionNote}>
              {unavailableNutritionItems} món thiếu dữ liệu dinh dưỡng.
            </Text>
          ) : null}
        </View>
      ) : null}
      {finalizedItems.length > 0 ? (
        finalizedItems.map(renderMeal)
      ) : poll?.closedAt && poll.options.length > 0 ? (
        <Text style={styles.emptyMeals}>
          Không có món nào được chấp nhận. Hãy đề xuất món khác cho bữa này.
        </Text>
      ) : !poll?.options.length ? (
        <Text style={styles.emptyMeals}>
          Chưa có món trong bữa này. Hãy chọn món từ mục Công thức để cả nhà
          cùng bình chọn.
        </Text>
      ) : null}
      {locked && !completed ? (
        <Text style={styles.lockedMessage}>
          Thực đơn đã được cố định bởi một thành viên. Bạn vẫn có thể xác nhận
          phần ăn của mình.
        </Text>
      ) : null}
      {!completed && finalizedItems.length > 0 && poll && !poll.closedAt ? (
        <Text style={styles.waitingForPoll}>
          Có thể xác nhận đã ăn sau khi bình chọn đóng lúc{' '}
          {formatPollDeadline(poll.closesAt)}.
        </Text>
      ) : null}
      {!completed && finalizedItems.length > 0 && (!poll || poll.closedAt) ? (
        <Pressable
          accessibilityRole="button"
          disabled={completing}
          onPress={onComplete}
          style={[styles.completeButton, completing && styles.disabledButton]}
        >
          {completing ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.completeButtonText}>
              Xác nhận đã ăn bữa này
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
};

const HouseholdMealPollCard = ({
  poll,
  mealPeriod,
  votingOptionKey,
  onVote,
  onViewIngredients,
}: {
  poll: HouseholdMealPoll;
  mealPeriod: MealPeriod;
  votingOptionKey: string;
  onVote: (mealPeriod: MealPeriod, mealId: string, agrees: boolean) => void;
  onViewIngredients: () => void;
}) => {
  const [state, setState] = useState({ expanded: true });
  const { expanded } = state;
  const setExpanded = useMemo(
    () => createStateSetter(setState, 'expanded'),
    [setState],
  );
  const acceptedMeals = poll.options.filter(
    option => option.outcome === 'ACCEPTED',
  );
  const pollStatus = poll.closedAt
    ? `Đã đóng · hạn ${formatPollDeadline(poll.closesAt)}`
    : `Chốt lúc ${formatPollDeadline(poll.closesAt)}`;

  return (
    <View style={styles.pollCard}>
      <LinearGradient
        colors={['#FFFFFF', '#F3FAF5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(current => !current)}
        style={styles.pollHeader}
      >
        <View style={styles.pollHeaderCopy}>
          <Text style={styles.pollTitle}>Bình chọn món · {pollStatus}</Text>
          <Text style={styles.pollHeaderHint}>
            {poll.options.length
              ? `${poll.options.length} món · ${
                  poll.closedAt ? 'Đã có kết quả' : 'Chạm để bình chọn'
                }`
              : 'Chưa có món được đề xuất'}
          </Text>
        </View>
        <Text style={styles.pollToggle}>{expanded ? 'Ẩn' : 'Xem'}</Text>
      </Pressable>
      {expanded ? (
        <>
          <Text style={styles.pollHelper}>
            Chọn đồng ý hoặc không đồng ý cho từng món. Món được giữ khi số
            phiếu đồng ý nhiều hơn tổng phiếu không đồng ý và chưa chọn.
          </Text>
          {poll.options.length ? (
            poll.options.map(option => (
              <HouseholdMealPollOptionRow
                key={option.id}
                option={option}
                mealPeriod={mealPeriod}
                voting={votingOptionKey === `${mealPeriod}:${option.mealId}`}
                onVote={onVote}
              />
            ))
          ) : (
            <Text style={styles.emptyMeals}>Chưa có món nào được đề xuất.</Text>
          )}
          {poll.closedAt && acceptedMeals.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={onViewIngredients}
              style={styles.ingredientSummaryButton}
            >
              <Text style={styles.ingredientSummaryButtonText}>
                Xem nguyên liệu các món được chọn
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
};

const HouseholdMealPollOptionRow = ({
  option,
  mealPeriod,
  voting,
  onVote,
}: {
  option: HouseholdMealPollOption;
  mealPeriod: MealPeriod;
  voting: boolean;
  onVote: (mealPeriod: MealPeriod, mealId: string, agrees: boolean) => void;
}) => {
  const handleAgree = useCallback(() => {
    onVote(mealPeriod, option.mealId, true);
  }, [mealPeriod, onVote, option.mealId]);
  const handleDisagree = useCallback(() => {
    onVote(mealPeriod, option.mealId, false);
  }, [mealPeriod, onVote, option.mealId]);
  const [state, setState] = useState({
    mealDescription: option.meal.description?.trim() ?? '',
  });
  const { mealDescription } = state;
  const setMealDescription = useMemo(
    () => createStateSetter(setState, 'mealDescription'),
    [setState],
  );
  useEffect(() => {
    const existingDescription = option.meal.description?.trim();
    if (existingDescription) {
      setMealDescription(existingDescription);
      return;
    }
    let isCurrentRequest = true;
    syncApi(apiConst.getMealDetail, {
      id: option.mealId,
      servings: 1,
    })
      .then(response => {
        if (!isCurrentRequest) {
          return;
        }
        const mealResponse = response as RecipeDetailResponse;
        setMealDescription(mealResponse?.data?.description?.trim() ?? '');
      })
      .catch(() => {
        if (isCurrentRequest) {
          setMealDescription('');
        }
      });
    return () => {
      isCurrentRequest = false;
    };
  }, [option.meal.description, option.mealId, setMealDescription]);
  const resultLabel =
    option.outcome === 'ACCEPTED'
      ? 'Được giữ trong thực đơn'
      : option.outcome === 'REJECTED'
      ? 'Bị loại khỏi thực đơn'
      : '';

  return (
    <View style={styles.pollOption}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Xem cách nấu món ${option.meal.name}`}
        onPress={() =>
          navigate(ScreenKeys.RECIPE_DETAIL, { mealId: option.mealId })
        }
        style={styles.pollMealDetails}
      >
        {option.meal.imageUrl ? (
          <AppImage
            source={{ uri: option.meal.imageUrl }}
            style={styles.pollMealImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.pollMealImage, styles.mealImagePlaceholder]}>
            <Text style={styles.memberInitial}>MC</Text>
          </View>
        )}
        <View style={styles.pollMealCopy}>
          <Text numberOfLines={2} style={styles.pollMealName}>
            {option.meal.name}
          </Text>
          <Text numberOfLines={3} style={styles.pollMealDescription}>
            {mealDescription || 'Chưa có mô tả cho món ăn này.'}
          </Text>
          <Text style={styles.recipeLink}>Chạm để xem cách nấu</Text>
        </View>
      </Pressable>
      <Text style={styles.pollCounts}>
        Đồng ý {option.agrees} · Không đồng ý {option.disagrees} · Chưa chọn{' '}
        {option.unvoted}
      </Text>
      {!option.outcome ? (
        <Text style={styles.myVote}>
          {option.myVote === null
            ? 'Bạn chưa bình chọn món này'
            : `Bạn đã chọn: ${option.myVote ? 'Đồng ý' : 'Không đồng ý'}`}
        </Text>
      ) : null}
      {resultLabel ? (
        <Text
          style={[
            styles.pollResult,
            option.outcome === 'ACCEPTED' && styles.pollAccepted,
          ]}
        >
          {resultLabel}
        </Text>
      ) : (
        <View style={styles.voteActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Đồng ý với món ${option.meal.name}`}
            accessibilityState={{ selected: option.myVote === true }}
            disabled={voting}
            onPress={handleAgree}
            style={[
              styles.voteButton,
              option.myVote === true && styles.voteAgreeSelected,
              voting && styles.disabledButton,
            ]}
          >
            <Text style={styles.voteButtonText}>Đồng ý</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Không đồng ý với món ${option.meal.name}`}
            accessibilityState={{ selected: option.myVote === false }}
            disabled={voting}
            onPress={handleDisagree}
            style={[
              styles.voteButton,
              option.myVote === false && styles.voteDisagreeSelected,
              voting && styles.disabledButton,
            ]}
          >
            <Text style={styles.voteButtonText}>Không đồng ý</Text>
          </Pressable>
          {voting ? <ActivityIndicator color={COLORS.green} /> : null}
        </View>
      )}
    </View>
  );
};

const HouseholdMemberRow = ({
  member,
  canRemove,
  onRemove,
}: {
  member: HouseholdMember;
  canRemove: boolean;
  onRemove: (memberId: string, memberName: string) => void;
}) => {
  const handleRemove = useCallback(() => {
    onRemove(member.userId, member.user.fullName || member.user.email);
  }, [member, onRemove]);

  return (
    <View style={styles.memberRow}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberInitial}>
          {(member.user.fullName || member.user.email)
            .trim()
            .charAt(0)
            .toLocaleUpperCase()}
        </Text>
      </View>
      <View style={styles.memberDetails}>
        <Text style={styles.memberName}>
          {member.user.fullName?.trim() || member.user.email}
        </Text>
        <Text style={styles.memberRole}>
          {member.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}
        </Text>
      </View>
      {canRemove ? (
        <Pressable accessibilityRole="button" onPress={handleRemove}>
          <Text style={styles.removeText}>Xóa</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const ActionButton = ({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    disabled={disabled}
    onPress={onPress}
    style={[styles.primaryButton, disabled && styles.disabledButton]}
  >
    <Text style={styles.primaryButtonText}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  embeddedScreen: { marginBottom: 0 },
  content: { paddingHorizontal: 18 },
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
    color: COLORS.text,
    fontSize: 23,
    fontWeight: '800',
    marginTop: 8,
  },
  memberCount: { color: COLORS.secondary, fontSize: 13, marginTop: 5 },
  shoppingListButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 13,
    borderRadius: 12,
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
  mealPeriodTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  mealPeriodTab: {
    flex: 1,
    minHeight: 62,
    justifyContent: 'center',
    borderRadius: 12,
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
    borderRadius: 12,
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
  mealPeriod: { marginTop: 8 },
  pollDeadlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  pollDeadlineCopy: {
    flex: 1,
  },
  pollDeadlineTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
  },
  pollDeadlineValue: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  pollDeadlineHint: {
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
  },
  pollDeadlineButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderRadius: 12,
    backgroundColor: COLORS.lightGreen,
  },
  pollDeadlineButtonDisabled: {
    opacity: 0.55,
  },
  pollDeadlineButtonText: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '800',
  },
  pollCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },
  pollHeader: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pollHeaderCopy: {
    flex: 1,
  },
  pollHeaderHint: {
    color: COLORS.secondary,
    fontSize: 10,
    marginTop: 4,
  },
  pollToggle: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '800',
  },
  pollTitle: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  pollHelper: {
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  pollOption: {
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  pollMealDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 3,
  },
  pollMealImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: COLORS.lightGreen,
  },
  pollMealCopy: { flex: 1 },
  pollMealName: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  pollMealDescription: {
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
  },
  recipeLink: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  pollCounts: { color: COLORS.secondary, fontSize: 11, marginTop: 4 },
  myVote: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 5,
  },
  pollResult: {
    color: COLORS.danger,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 5,
  },
  pollAccepted: { color: COLORS.green },
  waitingForPoll: {
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
  voteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  voteButton: {
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.border,
    paddingHorizontal: 10,
  },
  voteAgreeSelected: { backgroundColor: '#CDEBD8' },
  voteDisagreeSelected: { backgroundColor: '#F9DAD7' },
  voteButtonText: { color: COLORS.text, fontSize: 10, fontWeight: '700' },
  ingredientSummaryButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.lightGreen,
  },
  ingredientSummaryButtonText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '800',
  },
  mealPeriodHeader: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealPeriodTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  periodNutrition: {
    padding: 10,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  periodNutritionCalories: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: '800',
  },
  periodNutritionMacros: {
    color: COLORS.secondary,
    fontSize: 11,
    marginTop: 4,
  },
  periodNutritionNote: {
    color: COLORS.secondary,
    fontSize: 10,
    marginTop: 4,
  },
  mealRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  mealImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.lightGreen,
  },
  mealImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  mealDetails: { flex: 1 },
  mealName: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  mealDescription: {
    color: COLORS.secondary,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
  },
  mealMeta: { color: COLORS.secondary, fontSize: 10, marginTop: 4 },
  mealStatus: { color: COLORS.secondary, fontSize: 10, fontWeight: '600' },
  mealConsumed: { color: COLORS.green },
  emptyMeals: { color: COLORS.secondary, fontSize: 12, paddingVertical: 10 },
  mealPlanError: { color: COLORS.danger, fontSize: 12, marginVertical: 8 },
  mealCompletedLabel: { color: COLORS.green, fontSize: 10, fontWeight: '700' },
  lockedMessage: {
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  completeButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: COLORS.green,
  },
  completeButtonText: { color: COLORS.white, fontSize: 11, fontWeight: '800' },
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
    marginTop: 6,
    marginBottom: 12,
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
  primaryButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  disabledButton: { opacity: 0.55 },
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
  memberRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: COLORS.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.lightGreen,
  },
  memberInitial: { color: COLORS.green, fontWeight: '800', fontSize: 16 },
  memberDetails: { flex: 1, marginHorizontal: 11 },
  memberName: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  memberRole: { color: COLORS.secondary, fontSize: 11, marginTop: 3 },
  removeText: { color: COLORS.danger, fontSize: 12, fontWeight: '700' },
  leaveButton: {
    minHeight: 46,
    borderRadius: 12,
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
