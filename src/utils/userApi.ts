import apiConst from '../abase/constant/apiConst';
import type { UserInfo } from '../type/user';
import { setSyncUser, syncApi } from './syncUtils';

export type PersonalInfoResponse = {
  success: boolean;
  message?: string;
  data?: {
    user: Pick<UserInfo, 'id' | 'email' | 'fullName' | 'avatar'>;
  };
};

export type ChangePasswordResponse = {
  success: boolean;
  message?: string;
};

export type DeleteAccountResponse = {
  success: boolean;
  message?: string;
  warning?: string;
};

export type AvatarResponse = {
  success: boolean;
  message?: string;
  data?: {
    user: Pick<UserInfo, 'id' | 'email' | 'fullName' | 'avatar'>;
  };
};

export const updatePersonalInfo = async (
  user: UserInfo,
  fullName: string,
): Promise<PersonalInfoResponse> => {
  setSyncUser(user);
  return (await syncApi(apiConst.updatePersonalInfo, {
    fullName,
  })) as PersonalInfoResponse;
};

export const changePassword = async (
  user: UserInfo,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResponse> => {
  setSyncUser(user);
  return (await syncApi(apiConst.changePassword, {
    currentPassword,
    newPassword,
  })) as ChangePasswordResponse;
};

export const deleteUserAccount = async (
  user: UserInfo,
  password: string,
): Promise<DeleteAccountResponse> => {
  setSyncUser(user);
  return (await syncApi(apiConst.deleteAccount, {
    password,
  })) as DeleteAccountResponse;
};

export const updateUserAvatar = async (
  user: UserInfo,
  imageBase64: string,
): Promise<AvatarResponse> => {
  setSyncUser(user);
  return (await syncApi(apiConst.updateAvatar, {
    imageBase64,
  })) as AvatarResponse;
};
