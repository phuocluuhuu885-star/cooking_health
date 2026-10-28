import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { UserInfo, UserState } from '../../type/user';
import type { GlobalState } from '../../type/global';

const initialState: UserState = {
  loginUserInfo: null,
};

export const UserSlice = createSlice({
  name: 'UserProfile',
  initialState,
  reducers: {
    setUserInfo: (state, action: PayloadAction<UserInfo>) => {
      state.loginUserInfo = action.payload;
    },
    updateHealthProfile: (
      state,
      action: PayloadAction<UserInfo['healthProfile']>,
    ) => {
      if (!state.loginUserInfo) {
        return;
      }
      state.loginUserInfo.healthProfile = action.payload;
    },
    updatePersonalInfo: (
      state,
      action: PayloadAction<Pick<UserInfo, 'fullName'>>,
    ) => {
      if (!state.loginUserInfo) {
        return;
      }
      state.loginUserInfo.fullName = action.payload.fullName;
    },
    updateAvatar: (state, action: PayloadAction<Pick<UserInfo, 'avatar'>>) => {
      if (!state.loginUserInfo) {
        return;
      }
      state.loginUserInfo.avatar = action.payload.avatar;
    },

    logOutUser: state => {
      state.loginUserInfo = null;
    },
  },
});

export const selectAccessToken = (state: GlobalState) =>
  state.user.loginUserInfo?.accessToken;

export const {
  setUserInfo,
  updateHealthProfile,
  updatePersonalInfo,
  updateAvatar,
  logOutUser,
} = UserSlice.actions;

export const selectUserInfo = (state: GlobalState) => state.user.loginUserInfo;

export default UserSlice.reducer;
