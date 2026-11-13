import axios from 'axios';
import configs from '../abase/constant/config';

const getEndpoint = () =>
  `${configs.baseUrl.replace(/\/+$/, '')}/api/auth/push-tokens`;

const getHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

const pendingRegistrations = new Map<string, Promise<void>>();
export type PushPlatform = 'ANDROID' | 'IOS';

const ensureSuccess = (response: { success: boolean; message?: string }) => {
  if (!response.success) {
    throw new Error(
      response.message || 'Không thể cập nhật thiết bị nhận thông báo.',
    );
  }
};

export const registerPushToken = async (
  accessToken: string,
  token: string,
  platform: PushPlatform,
): Promise<void> => {
  const registration = axios
    .post<{ success: boolean; message?: string }>(
      getEndpoint(),
      { token, platform },
      { headers: getHeaders(accessToken) },
    )
    .then(response => ensureSuccess(response.data));
  pendingRegistrations.set(token, registration);
  try {
    await registration;
  } finally {
    if (pendingRegistrations.get(token) === registration) {
      pendingRegistrations.delete(token);
    }
  }
};

export const unregisterPushToken = async (
  accessToken: string,
  token: string,
  platform: PushPlatform,
): Promise<void> => {
  await pendingRegistrations.get(token)?.catch(() => undefined);
  const response = await axios.delete<{ success: boolean; message?: string }>(
    getEndpoint(),
    { data: { token, platform }, headers: getHeaders(accessToken) },
  );
  ensureSuccess(response.data);
};
