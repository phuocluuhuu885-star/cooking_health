import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSelector } from 'react-redux';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { fetchCurrentHousehold } from '../../utils/householdApi';
import {
  createHouseholdChatSocket,
  type ChatSocket,
  type HouseholdMealReminder,
} from '../../utils/householdChatSocket';
import { setSyncUser } from '../../utils/syncUtils';
import type { MealPeriod } from '../../utils/types/meal';
import { createStateSetter } from '../../utils/stateUtils';

type MealReminderResult = {
  success: boolean;
  message?: string;
};

type HouseholdMealReminderContextValue = {
  sendMealReminder: (
    householdId: string,
    mealPeriod: MealPeriod,
  ) => Promise<MealReminderResult>;
  activeReminder: HouseholdMealReminder | null;
};

const HouseholdMealReminderContext =
  createContext<HouseholdMealReminderContextValue | null>(null);

const useHouseholdMealReminder = () => {
  const context = useContext(HouseholdMealReminderContext);
  if (!context) {
    throw new Error(
      'useHouseholdMealReminder must be used within HouseholdMealReminderProvider',
    );
  }
  return context;
};

export const useSendHouseholdMealReminder = () => {
  const { sendMealReminder, activeReminder } = useHouseholdMealReminder();
  return {
    sendMealReminder,
    isReminderActive: (householdId: string) =>
      activeReminder?.householdId === householdId,
  };
};

const HouseholdMealReminderProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const user = useSelector(selectUserInfo);
  const [state, setState] = useState<{
    activeReminder: HouseholdMealReminder | null;
    acknowledging: boolean;
    acknowledgementError: string;
  }>({
    activeReminder: null,
    acknowledging: false,
    acknowledgementError: '',
  });
  const { activeReminder, acknowledging, acknowledgementError } = state;
  const setActiveReminder = useMemo(
    () => createStateSetter(setState, 'activeReminder'),
    [setState],
  );
  const setAcknowledging = useMemo(
    () => createStateSetter(setState, 'acknowledging'),
    [setState],
  );
  const setAcknowledgementError = useMemo(
    () => createStateSetter(setState, 'acknowledgementError'),
    [setState],
  );
  const refs = useRef<{
    socket: ChatSocket | null;
    householdId: string | null;
    activeReminder: HouseholdMealReminder | null;
  }>({
    socket: null,
    householdId: null,
    activeReminder: null,
  });

  useEffect(() => {
    if (!user?.accessToken) {
      refs.current.householdId = null;
      setActiveReminder(null);
      refs.current.activeReminder = null;
      return undefined;
    }

    let active = true;
    const effectRefs = refs.current;
    setActiveReminder(null);
    effectRefs.activeReminder = null;
    setAcknowledging(false);
    setAcknowledgementError('');
    setSyncUser(user);
    const socket = createHouseholdChatSocket(user.accessToken);
    effectRefs.socket = socket;

    const subscribeToHousehold = () => {
      const householdId = effectRefs.householdId;
      if (!householdId) return;
      socket.emit('meal:reminder:subscribe', { householdId }, response => {
        if (!response.success) {
          console.warn('Could not subscribe to household meal reminders', response.message);
        }
      });
    };
    const handleReminder = (reminder: HouseholdMealReminder) => {
      if (reminder.householdId !== effectRefs.householdId) return;
      setAcknowledgementError('');
      setAcknowledging(false);
      if (effectRefs.activeReminder?.reminderId === reminder.reminderId) return;
      effectRefs.activeReminder = reminder;
      setActiveReminder(reminder);
    };
    const handleReminderState = ({
      householdId,
      activeReminder: reminder,
    }: {
      householdId: string;
      activeReminder: HouseholdMealReminder | null;
    }) => {
      if (householdId !== effectRefs.householdId) return;
      if (reminder) {
        handleReminder(reminder);
        return;
      }
      effectRefs.activeReminder = null;
      setActiveReminder(null);
      setAcknowledgementError('');
      setAcknowledging(false);
    };
    const handleDismiss = ({
      householdId,
      reminderId,
    }: {
      householdId: string;
      reminderId: string;
    }) => {
      if (
        householdId === effectRefs.householdId &&
        reminderId === effectRefs.activeReminder?.reminderId
      ) {
        effectRefs.activeReminder = null;
        setActiveReminder(null);
        setAcknowledgementError('');
        setAcknowledging(false);
      }
    };

    socket.on('connect', subscribeToHousehold);
    socket.on('meal:reminder:started', handleReminder);
    socket.on('meal:reminder:state', handleReminderState);
    socket.on('meal:reminder:dismissed', handleDismiss);
    socket.connect();

    fetchCurrentHousehold(user)
      .then(response => {
        if (!active) return;
        if (!response.success || !response.data) {
          effectRefs.householdId = null;
          if (!response.success) {
            console.warn(
              'Could not load household for meal reminders',
              response.message,
            );
          }
          return;
        }
        effectRefs.householdId = response.data.id;
        if (socket.connected) subscribeToHousehold();
      })
      .catch(error => {
        console.error('Failed to load household for meal reminders', error);
      });

    return () => {
      active = false;
      effectRefs.householdId = null;
      effectRefs.activeReminder = null;
      socket.off('connect', subscribeToHousehold);
      socket.off('meal:reminder:started', handleReminder);
      socket.off('meal:reminder:state', handleReminderState);
      socket.off('meal:reminder:dismissed', handleDismiss);
      socket.disconnect();
      if (effectRefs.socket === socket) effectRefs.socket = null;
      Vibration.cancel();
    };
  }, [
    setAcknowledgementError,
    setAcknowledging,
    setActiveReminder,
    user,
  ]);

  useEffect(() => {
    if (!activeReminder?.reminderId) {
      Vibration.cancel();
      return undefined;
    }
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 800, 450], true);
      return () => Vibration.cancel();
    }
    Vibration.vibrate();
    const timer = setInterval(() => Vibration.vibrate(), 1500);
    return () => {
      clearInterval(timer);
      Vibration.cancel();
    };
  }, [activeReminder?.reminderId]);

  const sendMealReminder = useCallback(
    (householdId: string, mealPeriod: MealPeriod) =>
      new Promise<MealReminderResult>(resolve => {
        const socket = refs.current.socket;
        if (
          !socket?.connected ||
          householdId !== refs.current.householdId
        ) {
          resolve({
            success: false,
            message: 'Chưa kết nối được với gia đình. Vui lòng thử lại.',
          });
          return;
        }
        socket.timeout(10000).emit(
          'meal:reminder:start',
          { householdId, mealPeriod },
          (timeoutError, response) => {
            if (timeoutError) {
              resolve({
                success: false,
                message: 'Gửi lời nhắc quá thời gian chờ. Vui lòng thử lại.',
              });
              return;
            }
            resolve(response ?? {
              success: false,
              message: 'Không nhận được xác nhận từ máy chủ.',
            });
          },
        );
      }),
    [],
  );

  const acknowledgeReminder = useCallback(() => {
    const socket = refs.current.socket;
    const reminder = activeReminder;
    if (!socket?.connected || !reminder || acknowledging) return;
    setAcknowledging(true);
    setAcknowledgementError('');
    socket.timeout(10000).emit(
      'meal:reminder:acknowledge',
      {
        householdId: reminder.householdId,
        reminderId: reminder.reminderId,
      },
      (timeoutError, response) => {
        if (timeoutError) {
          setAcknowledging(false);
          setAcknowledgementError(
            'Chưa kết nối được để xác nhận. Lời nhắc vẫn đang hoạt động.',
          );
          return;
        }
        if (!response?.success) {
          setAcknowledging(false);
          setAcknowledgementError(
            response?.message ?? 'Không thể xác nhận lời nhắc.',
          );
        }
      },
    );
  }, [
    activeReminder,
    acknowledging,
    setAcknowledgementError,
    setAcknowledging,
  ]);

  return (
    <HouseholdMealReminderContext.Provider
      value={{ sendMealReminder, activeReminder }}
    >
      {children}
      <Modal
        animationType="fade"
        onRequestClose={() => undefined}
        transparent
        visible={Boolean(activeReminder)}
      >
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <LinearGradient
              colors={['#FFFFFF', '#EAF6EE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.eyebrow}>NHẮC NHỞ GIA ĐÌNH</Text>
            <Text style={styles.title}>
              {activeReminder?.title ?? 'Đã tới giờ ăn'}
            </Text>
            <Text style={styles.body}>{activeReminder?.body}</Text>
            {acknowledgementError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {acknowledgementError}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={acknowledging}
              onPress={acknowledgeReminder}
              style={[
                styles.confirmButton,
                acknowledging && styles.confirmButtonDisabled,
              ]}
            >
              {acknowledging ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmText}>Đồng ý</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </HouseholdMealReminderContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(14, 30, 22, 0.55)',
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
    alignItems: 'center',
    padding: 24,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DDEBE1',
    backgroundColor: '#FFFFFF',
  },
  eyebrow: {
    color: '#168653',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    marginTop: 12,
    color: '#172B23',
    fontSize: 23,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    marginTop: 10,
    color: '#4E6157',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  error: {
    marginTop: 12,
    color: '#B42318',
    fontSize: 13,
    textAlign: 'center',
  },
  confirmButton: {
    minWidth: 150,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: '#168653',
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default HouseholdMealReminderProvider;
