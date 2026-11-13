import { Platform } from 'react-native';
import type { RemoteMessage } from '@react-native-firebase/messaging';

type NotifeeModule = typeof import('@notifee/react-native');
type FirebaseMessagingModule = typeof import('@react-native-firebase/messaging');

const loadNotifee = () =>
  require('@notifee/react-native') as NotifeeModule;
const loadFirebaseMessaging = () =>
  require('@react-native-firebase/messaging') as FirebaseMessagingModule;

const ANDROID_CHANNEL_ID = 'mealcraft_general';
const ANDROID_CHANNEL_NAME = 'Thông báo MealCraft';

const ensureAndroidNotificationChannel = () => {
  const { AndroidImportance, default: notifee } = loadNotifee();
  return notifee.createChannel({
    id: ANDROID_CHANNEL_ID,
    name: ANDROID_CHANNEL_NAME,
    importance: AndroidImportance.DEFAULT,
  });
};

const showRemoteNotification = async (message: RemoteMessage) => {
  if (Platform.OS !== 'android') return;

  const { default: notifee } = loadNotifee();
  const dataTitle = message.data?.title;
  const dataBody = message.data?.body;
  const title =
    message.notification?.title ??
    (typeof dataTitle === 'string' ? dataTitle : 'Thông báo MealCraft');
  const body =
    message.notification?.body ??
    (typeof dataBody === 'string' ? dataBody : undefined);

  if (!body) return;

  await notifee.displayNotification({
    title,
    body,
    data: message.data,
    android: {
      channelId: await ensureAndroidNotificationChannel(),
      smallIcon: 'ic_notification',
      pressAction: { id: 'default' },
    },
  });
};

export const registerForPushNotifications = async () => {
  if (Platform.OS !== 'android') {
    return null;
  }

  const { AuthorizationStatus, default: notifee } = loadNotifee();
  const { getMessaging, getToken } = loadFirebaseMessaging();
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
  if (Platform.OS !== 'android') {
    return () => {};
  }

  const { EventType, default: notifee } = loadNotifee();
  const {
    getInitialNotification,
    getMessaging,
    onMessage,
    onNotificationOpenedApp,
    onTokenRefresh,
  } = loadFirebaseMessaging();
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
  if (Platform.OS !== 'android') return;

  const { getMessaging, setBackgroundMessageHandler } =
    loadFirebaseMessaging();
  setBackgroundMessageHandler(getMessaging(), async message => {
    if (message.notification) return;
    await showRemoteNotification(message);
  });
};
