import axios from 'axios';
import configs from '../abase/constant/config';
import type {
  HouseholdChatMessage,
  HouseholdChatMessagesResponse,
} from './types';

const getEndpoint = (path: string) =>
  `${configs.baseUrl.replace(/\/+$/, '')}/api/household/chat/${path}`;

const getHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (
    axios.isAxiosError<{ message?: string }>(error) &&
    error.response?.data?.message
  ) {
    return error.response.data.message;
  }
  return fallback;
};

export const fetchHouseholdChatMessages = async (
  token: string,
  options: { before?: string; beforeId?: string; limit?: number } = {},
): Promise<NonNullable<HouseholdChatMessagesResponse['data']>> => {
  try {
    const response = await axios.get<HouseholdChatMessagesResponse>(
      getEndpoint('messages'),
      {
        headers: getHeaders(token),
        params: options,
      },
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Không thể tải tin nhắn.');
    }
    return response.data.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, 'Không thể kết nối để tải tin nhắn.'),
    );
  }
};

export const fetchHouseholdChatUnreadCount = async (
  token: string,
): Promise<number> => {
  try {
    const response = await axios.get<{
      success: boolean;
      message?: string;
      data?: { unreadCount: number };
    }>(getEndpoint('unread-count'), { headers: getHeaders(token) });
    if (!response.data.success || !response.data.data) {
      throw new Error(
        response.data.message || 'Không thể tải số tin chưa đọc.',
      );
    }
    return response.data.data.unreadCount;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, 'Không thể tải số tin chưa đọc.'),
    );
  }
};

export const markHouseholdChatRead = async (token: string): Promise<void> => {
  try {
    const response = await axios.put<{
      success: boolean;
      message?: string;
    }>(getEndpoint('read'), {}, { headers: getHeaders(token) });
    if (!response.data.success) {
      throw new Error(response.data.message || 'Không thể cập nhật đã đọc.');
    }
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, 'Không thể cập nhật trạng thái đã đọc.'),
    );
  }
};

export type { HouseholdChatMessage };
