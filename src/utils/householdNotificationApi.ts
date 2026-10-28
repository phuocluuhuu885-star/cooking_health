import axios from 'axios';
import configs from '../abase/constant/config';
import type {
  HouseholdNotification,
  HouseholdNotificationsResponse,
} from './types';

const getEndpoint = (path = '') =>
  `${configs.baseUrl.replace(/\/+$/, '')}/api/household/notifications${path}`;

const getHeaders = (token: string) => ({
  Authorization: 'Bearer ' + token,
});

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (
    axios.isAxiosError<{ message?: string }>(error) &&
    error.response?.data?.message
  ) {
    return error.response.data.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export const fetchHouseholdNotifications = async (
  token: string,
): Promise<{ notifications: HouseholdNotification[]; unreadCount: number }> => {
  try {
    const response = await axios.get<HouseholdNotificationsResponse>(
      getEndpoint(),
      {
        headers: getHeaders(token),
        params: { limit: 50 },
      },
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(
        response.data.message || 'Không thể tải thông báo gia đình.',
      );
    }
    return response.data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, 'Không thể kết nối để tải thông báo.'),
    );
  }
};

export const fetchHouseholdNotificationUnreadCount = async (
  token: string,
): Promise<number> => {
  try {
    const response = await axios.get<{
      success: boolean;
      message?: string;
      data?: { unreadCount: number };
    }>(getEndpoint('/unread-count'), { headers: getHeaders(token) });
    if (!response.data.success || !response.data.data) {
      throw new Error(
        response.data.message || 'Không thể tải số thông báo chưa đọc.',
      );
    }
    return response.data.data.unreadCount;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, 'Không thể tải số thông báo chưa đọc.'),
    );
  }
};

export const markHouseholdNotificationRead = async (
  token: string,
  notificationId: string,
): Promise<void> => {
  try {
    const response = await axios.put<{ success: boolean; message?: string }>(
      getEndpoint(`/${encodeURIComponent(notificationId)}/read`),
      {},
      { headers: getHeaders(token) },
    );
    if (!response.data.success) {
      throw new Error(
        response.data.message || 'Không thể cập nhật trạng thái thông báo.',
      );
    }
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, 'Không thể cập nhật trạng thái thông báo.'),
    );
  }
};

export const markAllHouseholdNotificationsRead = async (
  token: string,
): Promise<void> => {
  try {
    const response = await axios.put<{ success: boolean; message?: string }>(
      getEndpoint('/read-all'),
      {},
      { headers: getHeaders(token) },
    );
    if (!response.data.success) {
      throw new Error(response.data.message || 'Không thể cập nhật thông báo.');
    }
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Không thể cập nhật thông báo.'));
  }
};
