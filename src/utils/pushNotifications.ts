import { Platform } from 'react-native';
import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  EventType,
} from '@notifee/react-native';
import {
  getMessaging,
  getToken,
  getInitialNotification,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  setBackgroundMessageHandler,
  type RemoteMessage,
} from '@react-native-firebase/messaging';

const ANDROID_CHANNEL_ID = 'mealcraft_general';
const ANDROID_CHANNEL_NAME = 'Thông báo MealCraft';

const ensureAndroidNotificationChannel = () =>
  notifee.createChannel({
    id: ANDROID_CHANNEL_ID,
    name: ANDROID_CHANNEL_NAME,
    importance: AndroidImportance.DEFAULT,
  });

const showRemoteNotification = async (message: RemoteMessage) => {
  const dataTitle = message.data?.title;
  const dataBody = message.data?.body;
  const title =
    message.notification?.title ??
    (typeof dataTitle === 'string' ? dataTitle : 'Thông báo MealCraft');
  const body =
    message.notification?.body ??
    (typeof dataBody === 'string' ? dataBody : undefined);

  if (!body) return;

  const notificationPlatform =
    Platform.OS === 'android'
      ? {
          android: {
            channelId: await ensureAndroidNotificationChannel(),
            smallIcon: 'ic_notification',
            pressAction: { id: 'default' },
          },
        }
      : { ios: { sound: 'default' } };
  await notifee.displayNotification({
    title,
    body,
    data: message.data,
    ...notificationPlatform,
  });
};

export const registerForPushNotifications = async () => {
  if (Platform.OS !== 'android') {
    return null;
  }

  const settings = await notifee.requestPermission();
  if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) {
    return null;
  }

  await ensureAndroidNotificationChannel();
  return getToken(getMessaging());
};

export const subscribeToPushNotifications = ({
  onToken,
  onOpenNotification,
}: {
  onToken: (token: string) => void;
  onOpenNotification: () => void;
}) => {
  const messaging = getMessaging();
  const unsubscribeMessage = onMessage(messaging, message => {
    showRemoteNotification(message).catch(error => {
      console.error('Failed to display foreground push notification', error);
    });
  });
  const unsubscribeOpenedMessage = onNotificationOpenedApp(
    messaging,
    onOpenNotification,
  );
  const unsubscribeToken = onTokenRefresh(messaging, onToken);
  const unsubscribeNotifee = notifee.onForegroundEvent(({ type }) => {
    if (type === EventType.PRESS) onOpenNotification();
  });

  const readInitialRemoteNotification = async () => {
    try {
      const message = await getInitialNotification(messaging);
      if (message) onOpenNotification();
    } catch (error) {
      console.error('Failed to read the initial push notification', error);
    }
  };
  const readInitialLocalNotification = async () => {
    try {
      const notification = await notifee.getInitialNotification();
      if (notification) onOpenNotification();
    } catch (error) {
      console.error('Failed to read the initial local notification', error);
    }
  };
  readInitialRemoteNotification();
  readInitialLocalNotification();

  return () => {
    unsubscribeMessage();
    unsubscribeOpenedMessage();
    unsubscribeToken();
    unsubscribeNotifee();
  };
};

export const configureBackgroundPushNotifications = () => {
  setBackgroundMessageHandler(getMessaging(), async message => {
    if (message.notification) return;
    await showRemoteNotification(message);
  });
};
