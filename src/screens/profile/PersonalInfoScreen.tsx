import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '../../reduxs/store';
import {
  selectUserInfo,
  updateAvatar as updateAvatarState,
  logOutUser,
  updatePersonalInfo as updatePersonalInfoState,
} from '../../reduxs/reduces/user';
import { getInitials } from '../../utils/stringUtils';
import {
  getAvatarUri,
  pickCompressedAvatar,
} from '../../utils/avatarImageUtils';
import { goBack, navigate, resetTo } from '../../utils/navigation';
import ScreenKeys from '../../utils/screenKey';
import { setSyncUser } from '../../utils/syncUtils';
import {
  changePassword,
  deleteUserAccount,
  updatePersonalInfo,
  updateUserAvatar,
} from '../../utils/userApi';
import { createStateSetter } from '../../utils/stateUtils';

type PersonalInfoFormState = {
  fullName: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  savingProfile: boolean;
  savingAvatar: boolean;
  changingPassword: boolean;
  deletingAccount: boolean;
  deleteAccountVisible: boolean;
  deleteAccountPassword: string;
};

const PersonalInfoScreen = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useSelector(selectUserInfo);
  const [state, setState] = useState<PersonalInfoFormState>({
    fullName: user?.fullName ?? '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    savingProfile: false,
    savingAvatar: false,
    changingPassword: false,
    deletingAccount: false,
    deleteAccountVisible: false,
    deleteAccountPassword: '',
  });
  const setFullName = useMemo(
    () => createStateSetter(setState, 'fullName'),
    [setState],
  );
  const setCurrentPassword = useMemo(
    () => createStateSetter(setState, 'currentPassword'),
    [setState],
  );
  const setNewPassword = useMemo(
    () => createStateSetter(setState, 'newPassword'),
    [setState],
  );
  const setConfirmPassword = useMemo(
    () => createStateSetter(setState, 'confirmPassword'),
    [setState],
  );
  const setSavingProfile = useMemo(
    () => createStateSetter(setState, 'savingProfile'),
    [setState],
  );
  const setChangingPassword = useMemo(
    () => createStateSetter(setState, 'changingPassword'),
    [setState],
  );
  const setSavingAvatar = useMemo(
    () => createStateSetter(setState, 'savingAvatar'),
    [setState],
  );
  const setDeletingAccount = useMemo(
    () => createStateSetter(setState, 'deletingAccount'),
    [setState],
  );
  const setDeleteAccountVisible = useMemo(
    () => createStateSetter(setState, 'deleteAccountVisible'),
    [setState],
  );
  const setDeleteAccountPassword = useMemo(
    () => createStateSetter(setState, 'deleteAccountPassword'),
    [setState],
  );

  const selectAvatar = async () => {
    if (!user?.accessToken) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để đổi ảnh đại diện.');
      return;
    }

    setSavingAvatar(true);
    try {
      const selectedAvatar = await pickCompressedAvatar();
      if (!selectedAvatar) return;

      const response = await updateUserAvatar(user, selectedAvatar);
      if (!response.success || !response.data?.user) {
        Alert.alert(
          'Không thể cập nhật ảnh',
          response.message || 'Vui lòng thử lại.',
        );
        return;
      }
      dispatch(updateAvatarState({ avatar: response.data.user.avatar }));
      Alert.alert('Đã cập nhật', 'Ảnh đại diện của bạn đã được cập nhật.');
    } catch (error) {
      Alert.alert(
        'Không thể cập nhật ảnh',
        error instanceof Error ? error.message : 'Vui lòng thử lại sau.',
      );
    } finally {
      setSavingAvatar(false);
    }
  };

  const savePersonalInfo = async () => {
    if (!user?.accessToken) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để cập nhật thông tin.');
      return;
    }
    const fullName = state.fullName.trim();
    if (fullName.length < 2 || fullName.length > 80) {
      Alert.alert('Họ tên chưa hợp lệ', 'Họ tên cần từ 2 đến 80 ký tự.');
      return;
    }
    if (fullName === user.fullName) {
      Alert.alert('Thông tin đã cập nhật', 'Họ tên hiện tại không thay đổi.');
      return;
    }

    setSavingProfile(true);
    try {
      const response = await updatePersonalInfo(user, fullName);
      if (!response.success || !response.data?.user) {
        Alert.alert(
          'Không thể cập nhật thông tin',
          response.message || 'Vui lòng thử lại.',
        );
        return;
      }
      dispatch(
        updatePersonalInfoState({
          fullName: response.data.user.fullName,
        }),
      );
      Alert.alert('Đã cập nhật', 'Họ tên của bạn đã được cập nhật.');
    } catch (error) {
      Alert.alert(
        'Không thể cập nhật thông tin',
        error instanceof Error ? error.message : 'Vui lòng thử lại sau.',
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const submitPasswordChange = async () => {
    if (!user?.accessToken) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để đổi mật khẩu.');
      return;
    }
    if (!state.currentPassword) {
      Alert.alert('Thiếu thông tin', 'Nhập mật khẩu hiện tại.');
      return;
    }
    if (state.newPassword.length < 6) {
      Alert.alert('Mật khẩu chưa hợp lệ', 'Mật khẩu mới cần ít nhất 6 ký tự.');
      return;
    }
    if (state.newPassword !== state.confirmPassword) {
      Alert.alert('Mật khẩu không khớp', 'Hãy nhập lại mật khẩu xác nhận.');
      return;
    }

    setChangingPassword(true);
    try {
      const response = await changePassword(
        user,
        state.currentPassword,
        state.newPassword,
      );
      if (!response.success) {
        Alert.alert(
          'Không thể đổi mật khẩu',
          response.message || 'Vui lòng kiểm tra mật khẩu hiện tại.',
        );
        return;
      }
      setState(previous => ({
        ...previous,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      Alert.alert('Đã đổi mật khẩu', 'Mật khẩu mới đã được lưu.');
    } catch (error) {
      Alert.alert(
        'Không thể đổi mật khẩu',
        error instanceof Error ? error.message : 'Vui lòng thử lại sau.',
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const submitAccountDeletion = async () => {
    if (!user?.accessToken) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập lại để xóa tài khoản.');
      return;
    }
    if (!state.deleteAccountPassword) {
      Alert.alert('Thiếu mật khẩu', 'Nhập mật khẩu để xác nhận xóa tài khoản.');
      return;
    }

    setDeletingAccount(true);
    try {
      const response = await deleteUserAccount(
        user,
        state.deleteAccountPassword,
      );
      if (!response.success) {
        Alert.alert(
          'Không thể xóa tài khoản',
          response.message || 'Vui lòng thử lại.',
        );
        return;
      }

      dispatch(logOutUser());
      setSyncUser(null);
      resetTo(ScreenKeys.LOGIN);
      Alert.alert(
        'Đã xóa tài khoản',
        response.warning ||
          response.message ||
          'Dữ liệu tài khoản đã được xóa.',
      );
    } catch (error) {
      Alert.alert(
        'Không thể xóa tài khoản',
        error instanceof Error ? error.message : 'Vui lòng thử lại sau.',
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  const confirmAccountDeletion = () => {
    Alert.alert(
      'Xóa tài khoản vĩnh viễn?',
      'Hồ sơ, dữ liệu sức khỏe, lịch sử đi bộ và thực đơn gắn với tài khoản sẽ bị xóa. Thao tác này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Tiếp tục',
          style: 'destructive',
          onPress: () => setDeleteAccountVisible(true),
        },
      ],
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại hồ sơ cá nhân"
          onPress={goBack}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View>
          <Text style={styles.eyebrow}>TÀI KHOẢN</Text>
          <Text style={styles.title}>Thông tin cá nhân</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardArea}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 28 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient colors={['#FFFFFF', '#F3FAF5']} style={styles.card}>
            <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
            <Text style={styles.description}>
              Cập nhật ảnh đại diện và tên hiển thị trong tài khoản MealCraft.
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chọn ảnh đại diện"
              disabled={state.savingAvatar}
              onPress={selectAvatar}
              style={styles.avatarPicker}
            >
              <View style={styles.avatarPreview}>
                {user?.avatar ? (
                  <Image
                    source={{ uri: getAvatarUri(user.avatar) }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarInitials}>
                    {getInitials(user?.fullName ?? '') || 'M'}
                  </Text>
                )}
                <View style={styles.cameraBadge}>
                  <Text style={styles.cameraBadgeText}>✎</Text>
                </View>
              </View>
              <View style={styles.avatarPickerCopy}>
                <Text style={styles.avatarPickerTitle}>
                  {state.savingAvatar ? 'Đang tải ảnh…' : 'Đổi ảnh đại diện'}
                </Text>
                <Text style={styles.hint}>Ảnh được nén, tối đa 512 KB.</Text>
              </View>
              {state.savingAvatar ? (
                <ActivityIndicator color={COLORS.green} />
              ) : null}
            </Pressable>

            <Text style={styles.label}>Họ và tên</Text>
            <TextInput
              accessibilityLabel="Họ và tên"
              autoCapitalize="words"
              maxLength={80}
              onChangeText={setFullName}
              placeholder="Nhập họ và tên"
              placeholderTextColor={COLORS.muted}
              value={state.fullName}
              style={styles.input}
            />

            <Text style={[styles.label, styles.emailLabel]}>Email</Text>
            <TextInput
              accessibilityLabel="Email, không thể chỉnh sửa"
              editable={false}
              value={user?.email ?? ''}
              style={[styles.input, styles.disabledInput]}
            />
            <Text style={styles.hint}>Email không thể thay đổi.</Text>

            <Pressable
              accessibilityRole="button"
              disabled={
                state.savingProfile ||
                state.savingAvatar ||
                state.changingPassword
              }
              onPress={savePersonalInfo}
              style={[
                styles.primaryButton,
                (state.savingProfile ||
                  state.savingAvatar ||
                  state.changingPassword) &&
                  styles.disabledButton,
              ]}
            >
              {state.savingProfile ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Lưu thông tin</Text>
              )}
            </Pressable>
          </LinearGradient>

          <LinearGradient colors={['#FFFFFF', '#F3FAF5']} style={styles.card}>
            <Text style={styles.sectionTitle}>Đổi mật khẩu</Text>
            <Text style={styles.description}>
              Nhập mật khẩu hiện tại để xác nhận thay đổi.
            </Text>

            <PasswordField
              label="Mật khẩu hiện tại"
              value={state.currentPassword}
              onChangeText={setCurrentPassword}
            />
            <PasswordField
              label="Mật khẩu mới"
              value={state.newPassword}
              onChangeText={setNewPassword}
            />
            <PasswordField
              label="Xác nhận mật khẩu mới"
              value={state.confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <Text style={styles.hint}>Mật khẩu mới cần ít nhất 6 ký tự.</Text>

            <Pressable
              accessibilityRole="button"
              disabled={
                state.changingPassword ||
                state.savingProfile ||
                state.savingAvatar
              }
              onPress={submitPasswordChange}
              style={[
                styles.primaryButton,
                (state.changingPassword ||
                  state.savingProfile ||
                  state.savingAvatar) &&
                  styles.disabledButton,
              ]}
            >
              {state.changingPassword ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Cập nhật mật khẩu</Text>
              )}
            </Pressable>
          </LinearGradient>

          <View style={styles.deleteAccountCard}>
            <Text style={styles.deleteAccountTitle}>Xóa tài khoản</Text>
            <Text style={styles.description}>
              Xóa vĩnh viễn tài khoản và dữ liệu sức khỏe, hồ sơ, lịch sử đi bộ
              liên quan. Tin nhắn gia đình đã gửi có thể được giữ lại ở dạng ẩn
              danh.
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={
                state.deletingAccount ||
                state.changingPassword ||
                state.savingProfile ||
                state.savingAvatar
              }
              onPress={confirmAccountDeletion}
              style={styles.deleteAccountButton}
            >
              <Text style={styles.deleteAccountButtonText}>
                Xóa tài khoản vĩnh viễn
              </Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              navigate(ScreenKeys.PRIVACY_POLICY, { mode: 'view' }, true)
            }
            style={styles.privacyLink}
          >
            <Text style={styles.privacyLinkText}>
              Xem Chính sách quyền riêng tư và Điều khoản
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        onRequestClose={() => setDeleteAccountVisible(false)}
        transparent
        visible={state.deleteAccountVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.deleteAccountModal}>
            <Text style={styles.sectionTitle}>Xác nhận danh tính</Text>
            <Text style={styles.description}>
              Nhập mật khẩu hiện tại để tiếp tục xóa tài khoản.
            </Text>
            <PasswordField
              label="Mật khẩu hiện tại"
              value={state.deleteAccountPassword}
              onChangeText={setDeleteAccountPassword}
            />
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                disabled={state.deletingAccount}
                onPress={() => {
                  setDeleteAccountVisible(false);
                  setDeleteAccountPassword('');
                }}
                style={styles.cancelDeleteButton}
              >
                <Text style={styles.cancelDeleteText}>Hủy</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={state.deletingAccount}
                onPress={submitAccountDeletion}
                style={styles.confirmDeleteButton}
              >
                {state.deletingAccount ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.confirmDeleteText}>Xóa tài khoản</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const PasswordField = ({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) => (
  <>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      accessibilityLabel={label}
      autoCapitalize="none"
      autoCorrect={false}
      onChangeText={onChangeText}
      secureTextEntry
      value={value}
      style={styles.input}
    />
  </>
);

const COLORS = {
  background: '#F5F7F5',
  white: '#FFFFFF',
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  border: '#E5EBE7',
  muted: '#98A49D',
  danger: '#B42318',
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  keyboardArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },
  backText: { marginTop: -4, color: COLORS.text, fontSize: 28 },
  eyebrow: {
    color: COLORS.green,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: { marginTop: 2, color: COLORS.text, fontSize: 20, fontWeight: '800' },
  content: { padding: 16, gap: 14 },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  description: {
    marginTop: 5,
    marginBottom: 16,
    color: COLORS.secondary,
    fontSize: 13,
    lineHeight: 19,
  },
  avatarPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarPreview: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 38,
    backgroundColor: '#E7F4EC',
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatarInitials: {
    color: COLORS.green,
    fontSize: 24,
    fontWeight: '800',
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -1,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    borderRadius: 13,
    backgroundColor: COLORS.green,
  },
  cameraBadgeText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  avatarPickerCopy: { flex: 1, marginLeft: 14 },
  avatarPickerTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  label: {
    marginBottom: 7,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  emailLabel: { marginTop: 14 },
  input: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    color: COLORS.text,
    fontSize: 14,
  },
  disabledInput: { backgroundColor: '#EFF3F0', color: COLORS.secondary },
  hint: {
    marginTop: 6,
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 17,
  },
  primaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: COLORS.green,
  },
  disabledButton: { opacity: 0.6 },
  deleteAccountCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1C7C4',
    borderRadius: 16,
    backgroundColor: '#FFF8F7',
  },
  deleteAccountTitle: {
    color: COLORS.danger,
    fontSize: 17,
    fontWeight: '800',
  },
  deleteAccountButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 12,
  },
  deleteAccountButtonText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  deleteAccountModal: {
    padding: 20,
    borderRadius: 18,
    backgroundColor: COLORS.white,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  cancelDeleteButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  cancelDeleteText: {
    color: COLORS.secondary,
    fontSize: 13,
    fontWeight: '700',
  },
  confirmDeleteButton: {
    minHeight: 44,
    minWidth: 130,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: COLORS.danger,
  },
  confirmDeleteText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  privacyLink: { alignItems: 'center', paddingVertical: 8 },
  privacyLinkText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  primaryButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
});

export default PersonalInfoScreen;
