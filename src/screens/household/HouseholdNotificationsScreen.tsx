import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { goBack, navigate } from '../../utils/navigation';
import ScreenKeys from '../../utils/screenKey';
import {
  fetchHouseholdNotifications,
  markAllHouseholdNotificationsRead,
  markHouseholdNotificationRead,
} from '../../utils/householdNotificationApi';
import type { HouseholdNotification } from '../../utils/types';
import { createStateSetter } from '../../utils/stateUtils';
import { formatHouseholdNotificationDate } from '../../utils/householdScreenUtils';

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

const HouseholdNotificationsScreen = () => {
  const insets = useSafeAreaInsets();
  const user = useSelector(selectUserInfo);
  const [state, setState] = useState<{
    notifications: HouseholdNotification[];
    unreadCount: number;
    loading: boolean;
    saving: boolean;
    error: string;
  }>({
    notifications: [],
    unreadCount: 0,
    loading: true,
    saving: false,
    error: '',
  });
  const { notifications, unreadCount, loading, saving, error } = state;
  const setNotifications = useMemo(
    () => createStateSetter(setState, 'notifications'),
    [setState],
  );
  const setUnreadCount = useMemo(
    () => createStateSetter(setState, 'unreadCount'),
    [setState],
  );
  const setLoading = useMemo(
    () => createStateSetter(setState, 'loading'),
    [setState],
  );
  const setSaving = useMemo(
    () => createStateSetter(setState, 'saving'),
    [setState],
  );
  const setError = useMemo(
    () => createStateSetter(setState, 'error'),
    [setState],
  );

  const loadNotifications = useCallback(async () => {
    if (!user?.accessToken) {
      setLoading(false);
      setNotifications([]);
      setUnreadCount(0);
      setError('Vui lòng đăng nhập để xem thông báo.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetchHouseholdNotifications(user.accessToken);
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
    } catch (loadError) {
      console.error('Failed to load household notifications', loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Không thể tải thông báo gia đình.',
      );
    } finally {
      setLoading(false);
    }
  }, [
    setError,
    setLoading,
    setNotifications,
    setUnreadCount,
    user?.accessToken,
  ]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications]),
  );

  const openNotification = useCallback(
    async (notification: HouseholdNotification) => {
      if (!user?.accessToken) {
        return;
      }
      setSaving(true);
      setError('');
      try {
        if (!notification.readAt) {
          await markHouseholdNotificationRead(
            user.accessToken,
            notification.id,
          );
          setNotifications(previous =>
            previous.map(item =>
              item.id === notification.id
                ? { ...item, readAt: new Date().toISOString() }
                : item,
            ),
          );
          setUnreadCount(count => Math.max(0, count - 1));
        }
        navigate(ScreenKeys.FAMILY, {
          ...(notification.data.date ? { date: notification.data.date } : {}),
          ...(notification.data.mealPeriod
            ? { mealPeriod: notification.data.mealPeriod }
            : {}),
        });
      } catch (openError) {
        console.error('Failed to open household notification', openError);
        setError(
          openError instanceof Error
            ? openError.message
            : 'Không thể mở thông báo.',
        );
      } finally {
        setSaving(false);
      }
    },
    [
      setError,
      setNotifications,
      setSaving,
      setUnreadCount,
      user?.accessToken,
    ],
  );

  const markAllRead = useCallback(async () => {
    if (!user?.accessToken || unreadCount === 0) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      await markAllHouseholdNotificationsRead(user.accessToken);
      const readAt = new Date().toISOString();
      setNotifications(previous =>
        previous.map(item => (item.readAt ? item : { ...item, readAt })),
      );
      setUnreadCount(0);
    } catch (markError) {
      console.error(
        'Failed to mark all household notifications as read',
        markError,
      );
      setError(
        markError instanceof Error
          ? markError.message
          : 'Không thể cập nhật thông báo.',
      );
    } finally {
      setSaving(false);
    }
  }, [
    setError,
    setNotifications,
    setSaving,
    setUnreadCount,
    unreadCount,
    user?.accessToken,
  ]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          onPress={goBack}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Thông báo</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={saving || unreadCount === 0}
          onPress={markAllRead}
          style={styles.readAllButton}
        >
          <Text
            style={[
              styles.readAllText,
              (saving || unreadCount === 0) && styles.disabledText,
            ]}
          >
            Đọc tất cả
          </Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={loadNotifications}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={COLORS.green} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyCard}>
              <LinearGradient
                colors={['#FFFFFF', '#F3FAF5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.emptyTitle}>Chưa có thông báo</Text>
              <Text style={styles.emptyDescription}>
                Khi có món mới, kết quả bình chọn hoặc cập nhật thực đơn gia
                đình, thông báo sẽ xuất hiện tại đây.
              </Text>
            </View>
          ) : (
            notifications.map(notification => (
              <Pressable
                key={notification.id}
                accessibilityRole="button"
                accessibilityState={{ selected: !notification.readAt }}
                disabled={saving}
                onPress={() => openNotification(notification)}
                style={({ pressed }) => [
                  styles.notificationCard,
                  !notification.readAt && styles.unreadCard,
                  pressed && styles.pressed,
                ]}
              >
                <LinearGradient
                  colors={
                    notification.readAt
                      ? ['#FFFFFF', '#F3FAF5']
                      : ['#FFFFFF', '#EAF6EE']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.notificationTop}>
                  <View
                    style={[
                      styles.notificationMarker,
                      !notification.readAt && styles.unreadMarker,
                    ]}
                  >
                    <Text style={styles.notificationMarkerText}>
                      {notification.type === 'POLL_CLOSED' ? '✓' : '•'}
                    </Text>
                  </View>
                  <View style={styles.notificationCopy}>
                    <View style={styles.titleRow}>
                      <Text style={styles.notificationTitle}>
                        {notification.title}
                      </Text>
                      {!notification.readAt ? (
                        <View style={styles.unreadDot} />
                      ) : null}
                    </View>
                    <Text style={styles.notificationBody}>
                      {notification.body}
                    </Text>
                    <Text style={styles.timestamp}>
                      {formatHouseholdNotificationDate(notification.createdAt)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

export default HouseholdNotificationsScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },
  backText: {
    color: COLORS.green,
    fontSize: 32,
    lineHeight: 34,
  },
  headerText: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 3,
    color: COLORS.secondary,
    fontSize: 11,
  },
  readAllButton: {
    paddingVertical: 8,
    paddingLeft: 8,
  },
  readAllText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '700',
  },
  disabledText: {
    color: '#A5B1AA',
  },
  errorBox: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEF3F2',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  retryText: {
    color: COLORS.green,
    fontWeight: '700',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  notificationCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  unreadCard: {
    borderColor: '#CFE5D7',
  },
  pressed: {
    opacity: 0.78,
  },
  notificationTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  notificationMarker: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#EEF2EF',
  },
  unreadMarker: {
    backgroundColor: COLORS.lightGreen,
  },
  notificationMarkerText: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: '800',
  },
  notificationCopy: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  notificationTitle: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.green,
  },
  notificationBody: {
    marginTop: 5,
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  timestamp: {
    marginTop: 8,
    color: '#8B9790',
    fontSize: 10,
  },
  emptyCard: {
    alignItems: 'center',
    marginTop: 32,
    paddingHorizontal: 24,
    paddingVertical: 26,
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  emptyDescription: {
    marginTop: 8,
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
