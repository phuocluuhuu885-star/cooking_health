import React, { useCallback, useMemo, useState } from 'react';
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
import LinearGradient from '../../components/LinearGradient';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../component/ScreenHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import type { StackScreenProps } from '@react-navigation/stack';
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
import { navigate, resetTo } from '../../utils/navigation';
import ScreenKeys from '../../utils/screenKey';
import { setSyncUser } from '../../utils/syncUtils';
import {
  hasAiRecommendationConsent,
  saveAiRecommendationConsent,
} from '../../utils/aiRecommendationConsent';
import {
  changePassword,
  deleteUserAccount,
  updatePersonalInfo,
  updateUserAvatar,
} from '../../utils/userApi';
import { createStateSetter } from '../../utils/stateUtils';
import type { RootStackParamList } from '../../utils/types/navigation';

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

type AccountOption = 'BASIC' | 'PASSWORD' | 'DELETE' | 'PRIVACY' | 'GEMINI';
type PersonalInfoScreenProps = StackScreenProps<
  RootStackParamList,
  typeof ScreenKeys.PERSONAL_INFO
>;

const ACCOUNT_OPTIONS: Array<{
  id: AccountOption;
  title: string;
  description: string;
}> = [
  {
    id: 'BASIC',
    title: 'Cập nhật thông tin cơ bản',
    description: 'Ảnh đại diện và tên hiển thị',
  },
  {
    id: 'PASSWORD',
    title: 'Đổi mật khẩu',
    description: 'Cập nhật mật khẩu đăng nhập',
  },
  {
    id: 'DELETE',
    title: 'Xóa tài khoản',
    description: 'Xóa vĩnh viễn tài khoản và dữ liệu liên quan',
  },
  {
    id: 'PRIVACY',
    title: 'Chính sách và quyền riêng tư',
    description: 'Xem chính sách quyền riêng tư và điều khoản',
  },
  {
    id: 'GEMINI',
    title: 'Thu hồi đồng ý chia sẻ với Gemini',
    description: 'Quản lý sự đồng ý dùng dữ liệu dinh dưỡng cho gợi ý AI',
  },
];

const AccountOptionRow = ({
  option,
  description,
  onPress,
}: {
  option: (typeof ACCOUNT_OPTIONS)[number];
  description: string;
  onPress: (option: (typeof ACCOUNT_OPTIONS)[number]) => void;
}) => {
  const handlePress = useCallback(() => {
    onPress(option);
  }, [onPress, option]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      style={styles.optionRow}
    >
      <View style={styles.optionCopy}>
        <Text
          style={[
            styles.optionTitle,
            option.id === 'DELETE' && styles.optionDanger,
          ]}
        >
          {option.title}
        </Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
      <Text style={styles.optionChevron}>›</Text>
    </Pressable>
  );
};

const PersonalInfoScreen = ({ route }: PersonalInfoScreenProps) => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useSelector(selectUserInfo);
  const section = route.params?.section;
  const [geminiConsentGranted, setGeminiConsentGranted] = useState(() =>
    Boolean(user?.id && hasAiRecommendationConsent(user.id)),
  );
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
  useFocusEffect(
    useCallback(() => {
      setGeminiConsentGranted(
        Boolean(user?.id && hasAiRecommendationConsent(user.id)),
      );
    }, [user?.id]),
  );
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
  const closeDeleteAccountModal = useCallback(() => {
    setDeleteAccountVisible(false);
  }, [setDeleteAccountVisible]);
  const cancelAccountDeletion = useCallback(() => {
    setDeleteAccountVisible(false);
    setDeleteAccountPassword('');
  }, [setDeleteAccountPassword, setDeleteAccountVisible]);
  const renderAccountOption = (option: (typeof ACCOUNT_OPTIONS)[number]) => (
    <AccountOptionRow
      key={option.id}
      option={option}
      description={
        option.id === 'GEMINI'
          ? geminiConsentGranted
            ? 'Đang bật — chạm để thu hồi'
            : 'Chưa bật — chạm để xem trạng thái'
          : option.description
      }
      onPress={onHandleOptionPress}
    />
  );

  const selectAvatar = useCallback(async () => {
    if (!user?.accessToken) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để đổi ảnh đại diện.');
      return;
    }

    setSavingAvatar(true);
    try {
      const selectedAvatar = await pickCompressedAvatar();
      if (!selectedAvatar) return;

      const response = await updateUserAvatar(user, selectedAvatar);
      const savedAvatar = response.data?.user?.avatar;
      if (
        !response.success ||
        typeof savedAvatar !== 'string' ||
        savedAvatar.trim().length === 0
      ) {
        Alert.alert(
          'Không thể cập nhật ảnh',
          response.message ||
            'Máy chủ chưa trả về đường dẫn ảnh đã lưu. Vui lòng thử lại hoặc liên hệ hỗ trợ.',
        );
        return;
      }
      dispatch(updateAvatarState({ avatar: savedAvatar }));
      Alert.alert('Đã cập nhật', 'Ảnh đại diện của bạn đã được cập nhật.');
    } catch (error) {
      Alert.alert(
        'Không thể cập nhật ảnh',
        error instanceof Error ? error.message : 'Vui lòng thử lại sau.',
      );
    } finally {
      setSavingAvatar(false);
    }
  }, [dispatch, setSavingAvatar, user]);

  const savePersonalInfo = useCallback(async () => {
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
  }, [dispatch, setSavingProfile, state.fullName, user]);

  const submitPasswordChange = useCallback(async () => {
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
  }, [
    setChangingPassword,
    setState,
    state.confirmPassword,
    state.currentPassword,
    state.newPassword,
    user,
  ]);

  const submitAccountDeletion = useCallback(async () => {
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
  }, [dispatch, setDeletingAccount, state.deleteAccountPassword, user]);

  const confirmAccountDeletion = useCallback(() => {
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
  }, [setDeleteAccountVisible]);

  const revokeGeminiConsent = useCallback(() => {
    if (!user?.id) return;
    if (!geminiConsentGranted) {
      Alert.alert(
        'Chưa bật đồng ý chia sẻ',
        'Hiện không có đồng ý chia sẻ với Gemini đang bật trên thiết bị này.',
      );
      return;
    }
    Alert.alert(
      'Thu hồi đồng ý dùng gợi ý AI?',
      'Ứng dụng sẽ ngừng gửi dữ liệu dinh dưỡng cho Gemini trên thiết bị này. Gợi ý AI đã tải sẽ bị xóa khỏi màn hình.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Thu hồi',
          style: 'destructive',
          onPress: () => {
            saveAiRecommendationConsent(user.id, false);
            setGeminiConsentGranted(false);
          },
        },
      ],
    );
  }, [geminiConsentGranted, setGeminiConsentGranted, user?.id]);

  const onHandleOptionPress = useCallback((option: (typeof ACCOUNT_OPTIONS)[number]) => {
    if (option.id === 'BASIC' || option.id === 'PASSWORD') {
      navigate(ScreenKeys.PERSONAL_INFO, { section: option.id }, true);
      return;
    }
    if (option.id === 'DELETE') {
      confirmAccountDeletion();
      return;
    }
    if (option.id === 'GEMINI') {
      revokeGeminiConsent();
      return;
    }
    if (option.id === 'PRIVACY') {
      navigate(ScreenKeys.PRIVACY_POLICY, { mode: 'view' }, true);
    }
  }, [confirmAccountDeletion, revokeGeminiConsent]);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        eyebrow="TÀI KHOẢN"
        title={
          section === 'BASIC'
            ? 'Thông tin cơ bản'
            : section === 'PASSWORD'
            ? 'Đổi mật khẩu'
            : 'Thông tin cá nhân'
        }
        backAccessibilityLabel="Quay lại hồ sơ cá nhân"
      />
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
          {!section ? (
            <LinearGradient colors={['#FFFFFF', '#F3FAF5']} style={styles.card}>
              <Text style={styles.sectionTitle}>Tùy chọn tài khoản</Text>
              <Text style={styles.description}>
                Chọn nội dung bạn muốn quản lý.
              </Text>
              <View style={styles.optionsList}>
                {ACCOUNT_OPTIONS.map(renderAccountOption)}
              </View>
            </LinearGradient>
          ) : null}

          {section === 'BASIC' ? (
            <View style={styles.formContent}>
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
            </View>
          ) : null}

          {section === 'PASSWORD' ? (
            <View style={styles.formContent}>
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
                  <Text style={styles.primaryButtonText}>
                    Cập nhật mật khẩu
                  </Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        onRequestClose={closeDeleteAccountModal}
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
                onPress={cancelAccountDeletion}
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
  formContent: {
    paddingHorizontal: 2,
  },
  optionsList: {
    gap: 8,
  },
  optionRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  optionCopy: {
    flex: 1,
    paddingRight: 8,
  },
  optionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  optionDanger: {
    color: COLORS.danger,
  },
  optionDescription: {
    marginTop: 3,
    color: COLORS.secondary,
    fontSize: 12,
    lineHeight: 17,
  },
  optionChevron: {
    color: COLORS.green,
    fontSize: 22,
    fontWeight: '700',
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
    borderRadius: 8,
    backgroundColor: COLORS.green,
  },
  disabledButton: { opacity: 0.6 },
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
    borderRadius: 8,
    backgroundColor: COLORS.danger,
  },
  confirmDeleteText: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  primaryButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
});

export default PersonalInfoScreen;
