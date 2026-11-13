import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { useSelector } from 'react-redux';
import { selectUserInfo } from '../../reduxs/reduces/user';
import ScreenKeys from '../../utils/screenKey';
import { navigateWhenReady } from '../../utils/navigation';
import {
  registerForPushNotifications,
  subscribeToPushNotifications,
} from '../../utils/pushNotifications';
import {
  registerPushToken,
  type PushPlatform,
} from '../../utils/pushNotificationApi';

const PushNotificationTokenContext = createContext<string | null>(null);
const TOKEN_SYNC_RETRY_DELAYS_MS = [5000, 15000, 60000];

export const usePushNotificationToken = () =>
  useContext(PushNotificationTokenContext);

const PushNotificationProvider = ({ children }: { children: ReactNode }) => {
  const user = useSelector(selectUserInfo);
  const [token, setToken] = useState<string | null>(null);
  const openNotifications = useCallback(() => {
    navigateWhenReady(ScreenKeys.NOTIFICATIONS);
  }, []);

  useEffect(() => {
    const accessToken = user?.accessToken;
    if (Platform.OS !== 'android') {
      setToken(null);
      return undefined;
    }
    if (!accessToken) {
      setToken(null);
      return undefined;
    }

    const authenticatedAccessToken: string = accessToken;
    const platform: PushPlatform = 'ANDROID';
    let active = true;
    const retryTimers = new Set<ReturnType<typeof setTimeout>>();
    const registerTokenWithBackend = async (
      nextToken: string,
      retryIndex = 0,
    ) => {
      if (!active) return;
      setToken(nextToken);
      try {
        await registerPushToken(authenticatedAccessToken, nextToken, platform);
      } catch (error) {
        console.error('Failed to sync push notification token', error);
        const retryDelay = TOKEN_SYNC_RETRY_DELAYS_MS[retryIndex];
        if (active && retryDelay !== undefined) {
          const timer = setTimeout(() => {
            retryTimers.delete(timer);
            registerTokenWithBackend(nextToken, retryIndex + 1);
          }, retryDelay);
          retryTimers.add(timer);
        }
      }
    };
    const unsubscribe = subscribeToPushNotifications({
      onToken: registerTokenWithBackend,
      onOpenNotification: openNotifications,
    });

    const register = async () => {
      try {
        const nextToken = await registerForPushNotifications();
        if (nextToken) {
          await registerTokenWithBackend(nextToken);
        }
      } catch (error) {
        console.error('Failed to register for push notifications', error);
      }
    };
    register();

    return () => {
      active = false;
      unsubscribe();
      retryTimers.forEach(clearTimeout);
      retryTimers.clear();
    };
  }, [openNotifications, user?.accessToken]);

  return (
    <PushNotificationTokenContext.Provider value={token}>
      {children}
    </PushNotificationTokenContext.Provider>
  );
};

export default PushNotificationProvider;
