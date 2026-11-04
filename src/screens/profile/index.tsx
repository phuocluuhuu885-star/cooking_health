import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from '../../components/LinearGradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { logOutUser, selectUserInfo } from '../../reduxs/reduces/user';
import { useAppDispatch } from '../../reduxs/store';
import ScreenKeys from '../../utils/screenKey';
import { navigate, resetTo } from '../../utils/navigation';
import { getInitials } from '../../utils/stringUtils';
import { getAvatarUri } from '../../utils/avatarImageUtils';
import { setSyncUser } from '../../utils/syncUtils';
import {
  hasAiRecommendationConsent,
  saveAiRecommendationConsent,
} from '../../utils/aiRecommendationConsent';
import { deleteUserAccount } from '../../utils/userApi';
import HealthProfile from './healthProfile';

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

const ACCOUNT_OPTIONS = [
  {
    id: 'BASIC',
    title: 'Thông tin cơ bản',
    description: 'Cập nhật tên hiển thị và ảnh đại diện',
    icon: 'profile',
  },
  {
    id: 'PASSWORD',
    title: 'Đổi mật khẩu',
    description: 'Bảo vệ tài khoản bằng mật khẩu mới',
    icon: 'lock',
  },
  {
    id: 'PRIVACY',
    title: 'Chính sách & quyền riêng tư',
    description: 'Tìm hiểu cách HealthAndCook sử dụng dữ liệu',
    icon: 'shield',
  },
  {
    id: 'GEMINI',
    title: 'Chia sẻ dữ liệu với Gemini',
    description: 'Quản lý sự đồng ý dùng dữ liệu cho gợi ý AI',
    icon: 'sparkle',
  },
  {
    id: 'DELETE',
    title: 'Xóa tài khoản',
    description: 'Xóa tài khoản và dữ liệu liên quan vĩnh viễn',
    icon: 'delete',
  },
] as const;

const ProfileOptionIcon = ({
  name,
  danger = false,
}: {
  name: string;
  danger?: boolean;
}) => {
  const color = danger ? COLORS.danger : COLORS.green;
  return (
    <View style={[styles.optionIcon, danger && styles.deleteOptionIcon]}>
      <Svg width={22} height={22} viewBox="0 0 24 24">
        {name === 'profile' ? (
          <>
            <Circle
              cx={12}
              cy={8}
              r={3.2}
              fill="none"
              stroke={color}
              strokeWidth={1.8}
            />
            <Path
              d="M5.5 20a6.5 6.5 0 0 1 13 0"
              fill="none"
              stroke={color}
              strokeLinecap="round"
              strokeWidth={1.8}
            />
          </>
        ) : null}
        {name === 'lock' ? (
          <>
            <Path
              d="M6 10h12v10H6zM9 10V7a3 3 0 0 1 6 0v3"
              fill="none"
              stroke={color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
            />
            <Circle cx={12} cy={15} r={1} fill={color} />
          </>
        ) : null}
        {name === 'shield' ? (
          <Path
            d="M12 3 19 6v5c0 4.7-3 8-7 10-4-2-7-5.3-7-10V6l7-3Zm-3 9 2 2 4-4"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
          />
        ) : null}
        {name === 'sparkle' ? (
          <>
            <Path
              d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"
              fill="none"
              stroke={color}
              strokeLinejoin="round"
              strokeWidth={1.7}
            />
            <Path
              d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z"
              fill="none"
              stroke={color}
              strokeLinejoin="round"
              strokeWidth={1.4}
            />
          </>
        ) : null}
        {name === 'delete' ? (
          <>
            <Path
              d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m3 3v7m6-7v7"
              fill="none"
              stroke={color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
            />
          </>
        ) : null}
        {name === 'health' ? (
          <Path
            d="M20.5 8.8c0 4.2-8.5 10-8.5 10s-8.5-5.8-8.5-10A4.3 4.3 0 0 1 12 6.4a4.3 4.3 0 0 1 8.5 2.4ZM7 12h3l1.2-2.2 2.1 4.4 1.2-2.2H18"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.6}
          />
        ) : null}
        {name === 'money' ? (
          <Path
            d="M12 3v18m4-14H9.8a3.3 3.3 0 0 0 0 6.6h4.4a3.3 3.3 0 0 1 0 6.6H7"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
          />
        ) : null}
        {name === 'report' ? (
          <>
            <Path
              d="M4 19h16M6 16V9m6 7V5m6 11v-4"
              fill="none"
              stroke={color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
            />
            <Circle cx={6} cy={7} r={1.5} fill={color} />
            <Circle cx={18} cy={10} r={1.5} fill={color} />
          </>
        ) : null}
        {name === 'logout' ? (
          <Path
            d="M10 4H5v16h5m4-4 4-4-4-4m4 4H9"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.9}
          />
        ) : null}
      </Svg>
    </View>
  );
};

const Profile = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const user = useSelector(selectUserInfo);
  const [healthProfileVisible, setHealthProfileVisible] = useState(false);
  const [deleteAccountVisible, setDeleteAccountVisible] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [geminiConsentGranted, setGeminiConsentGranted] = useState(() =>
    Boolean(user?.id && hasAiRecommendationConsent(user.id)),
  );
  const fullName = user?.fullName?.trim() || 'Thành viên HealthAndCook';

  useFocusEffect(
    useCallback(() => {
      setGeminiConsentGranted(
        Boolean(user?.id && hasAiRecommendationConsent(user.id)),
      );
    }, [user?.id]),
  );

  const handleAccountOption = useCallback(
    (optionId: (typeof ACCOUNT_OPTIONS)[number]['id']) => {
      if (optionId === 'BASIC' || optionId === 'PASSWORD') {
        navigate(ScreenKeys.PERSONAL_INFO, { section: optionId });
        return;
      }
      if (optionId === 'PRIVACY') {
        navigate(ScreenKeys.PRIVACY_POLICY, { mode: 'view' });
        return;
      }
      if (optionId === 'DELETE') {
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
        return;
      }

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
        'HealthAndCook sẽ ngừng gửi dữ liệu dinh dưỡng cho Gemini trên thiết bị này. Gợi ý AI đã tải sẽ bị xóa khỏi màn hình.',
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
    },
    [geminiConsentGranted, user],
  );
  const submitAccountDeletion = useCallback(async () => {
    if (!user?.accessToken) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập lại để xóa tài khoản.');
      return;
    }
    if (!deleteAccountPassword) {
      Alert.alert('Thiếu mật khẩu', 'Nhập mật khẩu để xác nhận xóa tài khoản.');
      return;
    }

    setDeletingAccount(true);
    try {
      const response = await deleteUserAccount(user, deleteAccountPassword);
      if (!response.success) {
        Alert.alert(
          'Không thể xóa tài khoản',
          response.message || 'Vui lòng thử lại.',
        );
        return;
      }
      setDeleteAccountVisible(false);
      setDeleteAccountPassword('');
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
  }, [deleteAccountPassword, dispatch, user]);

  const closeDeleteAccountModal = useCallback(() => {
    if (!deletingAccount) {
      setDeleteAccountVisible(false);
      setDeleteAccountPassword('');
    }
  }, [deletingAccount]);

  const confirmLogOut = useCallback(() => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: () => {
            setSyncUser(null);
            dispatch(logOutUser());
            resetTo(ScreenKeys.HOMESCREEN);
          },
        },
      ],
    );
  }, [dispatch]);

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#168653', '#2CA36D', '#BEEAD2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroBackground, { height: insets.top + 270 }]}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 112 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.heroHeader,
            { paddingTop: insets.top + 18, height: insets.top + 210 },
          ]}
        >
          <Text style={styles.heroEyebrow}>HealthAndCook</Text>
          <Text style={styles.pageTitle}>Tài khoản</Text>
          <Text style={styles.pageSubtitle}>
            Quản lý thông tin và tùy chọn cá nhân
          </Text>
          <View pointerEvents="none" style={styles.heroDecoration}>
            <ProfileOptionIcon name="profile" />
          </View>
        </View>

        <View style={styles.surface}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở thông tin cá nhân"
            onPress={() =>
              navigate(ScreenKeys.PERSONAL_INFO, { section: 'BASIC' })
            }
            style={({ pressed }) => pressed && styles.pressed}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F6FCF8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.identityCard}
            >
              <View style={styles.avatarRing}>
                <View style={styles.avatar}>
                  {user?.avatar ? (
                    <Image
                      source={{ uri: getAvatarUri(user.avatar) }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Text style={styles.avatarText}>
                      {getInitials(fullName) || 'M'}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.identityDetails}>
                <Text style={styles.name} numberOfLines={1}>
                  {fullName}
                </Text>
                <Text style={styles.email} numberOfLines={1}>
                  {user?.email || 'Chưa có email'}
                </Text>
              </View>
              <Text style={styles.editPill}>Sửa</Text>
            </LinearGradient>
          </Pressable>

          <Text style={styles.sectionHeading}>Sức khỏe</Text>
          <View style={styles.optionsCard}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setHealthProfileVisible(true)}
              style={({ pressed }) => [
                styles.optionRow,
                pressed && styles.optionPressed,
              ]}
            >
              <ProfileOptionIcon name="health" />
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>Hồ sơ sức khỏe</Text>
                <Text style={styles.optionDescription}>
                  {user?.healthProfile
                    ? 'Cập nhật thông tin và mục tiêu sức khỏe'
                    : 'Thiết lập thông tin để cá nhân hóa trải nghiệm'}
                </Text>
              </View>
              <Text style={styles.optionChevron}>›</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionHeading}>Chi tiêu</Text>
          <View style={styles.optionsCard}>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigate(ScreenKeys.EXPENSES)}
              style={({ pressed }) => [
                styles.optionRow,
                pressed && styles.optionPressed,
              ]}
            >
              <ProfileOptionIcon name="money" />
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>Quản lý chi tiêu</Text>
                <Text style={styles.optionDescription}>
                  Theo dõi khoản chi và đặt ngân sách cho bữa ăn
                </Text>
              </View>
              <Text style={styles.optionChevron}>›</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigate(ScreenKeys.EXPENSE_REPORT)}
              style={({ pressed }) => [
                styles.optionRow,
                styles.optionRowDivider,
                pressed && styles.optionPressed,
              ]}
            >
              <ProfileOptionIcon name="report" />
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>Báo cáo thu chi</Text>
                <Text style={styles.optionDescription}>
                  Xem biểu đồ chi tiêu theo danh mục từng tháng
                </Text>
              </View>
              <Text style={styles.optionChevron}>›</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionHeading}>Tài khoản & quyền riêng tư</Text>
          <View style={styles.optionsCard}>
            {ACCOUNT_OPTIONS.map((option, index) => {
              const description =
                option.id === 'GEMINI'
                  ? geminiConsentGranted
                    ? 'Đang bật · chạm để thu hồi đồng ý'
                    : 'Chưa bật đồng ý chia sẻ trên thiết bị này'
                  : option.description;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.title}. ${description}`}
                  onPress={() => handleAccountOption(option.id)}
                  style={({ pressed }) => [
                    styles.optionRow,
                    index < ACCOUNT_OPTIONS.length - 1 &&
                      styles.optionRowDivider,
                    pressed && styles.optionPressed,
                  ]}
                >
                  <ProfileOptionIcon
                    name={option.icon}
                    danger={option.id === 'DELETE'}
                  />
                  <View style={styles.optionCopy}>
                    <Text
                      style={[
                        styles.optionTitle,
                        option.id === 'DELETE' && styles.deleteOptionTitle,
                      ]}
                    >
                      {option.title}
                    </Text>
                    <Text style={styles.optionDescription}>{description}</Text>
                  </View>
                  <Text
                    style={[
                      styles.optionChevron,
                      option.id === 'DELETE' && styles.deleteOptionTitle,
                    ]}
                  >
                    ›
                  </Text>
                </Pressable>
              );
            })}

            {user?.accessToken ? (
              <Pressable
                accessibilityRole="button"
                onPress={confirmLogOut}
                style={({ pressed }) => [
                  styles.optionRow,
                  styles.logoutRow,
                  pressed && styles.optionPressed,
                ]}
              >
                <ProfileOptionIcon name="logout" />
                <View style={styles.optionCopy}>
                  <Text style={styles.optionTitle}>Đăng xuất</Text>
                  <Text style={styles.optionDescription}>
                    Đăng xuất khỏi tài khoản HealthAndCook
                  </Text>
                </View>
                <Text style={styles.optionChevron}>›</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.versionText}>HealthAndCook</Text>
        </View>
      </ScrollView>

      <HealthProfile
        visible={healthProfileVisible}
        onClose={() => setHealthProfileVisible(false)}
      />
      <Modal
        animationType="fade"
        onRequestClose={closeDeleteAccountModal}
        transparent
        visible={deleteAccountVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.deleteAccountModal}>
            <Text style={styles.modalTitle}>Xác nhận danh tính</Text>
            <Text style={styles.modalDescription}>
              Nhập mật khẩu hiện tại để tiếp tục xóa tài khoản.
            </Text>
            <TextInput
              accessibilityLabel="Mật khẩu hiện tại"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!deletingAccount}
              onChangeText={setDeleteAccountPassword}
              placeholder="Mật khẩu hiện tại"
              placeholderTextColor="#A5B1AA"
              secureTextEntry
              style={styles.passwordInput}
              value={deleteAccountPassword}
            />
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                disabled={deletingAccount}
                onPress={closeDeleteAccountModal}
                style={styles.cancelDeleteButton}
              >
                <Text style={styles.cancelDeleteText}>Hủy</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={deletingAccount}
                onPress={submitAccountDeletion}
                style={[
                  styles.confirmDeleteButton,
                  deletingAccount && styles.disabledButton,
                ]}
              >
                <Text style={styles.confirmDeleteText}>
                  {deletingAccount ? 'Đang xóa…' : 'Xóa tài khoản'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Profile;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  heroBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  content: {
    paddingBottom: 24,
  },
  heroHeader: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: 24,
  },
  pageTitle: {
    marginTop: 5,
    color: COLORS.white,
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    marginTop: 4,
    color: '#E8F7EE',
    fontSize: 13,
  },
  heroEyebrow: {
    color: '#D5F1E0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  heroDecoration: {
    position: 'absolute',
    right: 26,
    top: 54,
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.16)',
    transform: [{ rotate: '-8deg' }],
  },
  surface: {
    minHeight: 560,
    marginTop: -24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FBFEFC',
  },
  identityCard: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: '#1C6A46',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  avatarRing: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 34,
    backgroundColor: '#E5F6EC',
  },
  avatar: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 27,
    backgroundColor: '#62C586',
  },
  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '800',
  },
  identityDetails: {
    flex: 1,
    minWidth: 0,
  },
  identityLabel: {
    marginBottom: 4,
    color: '#82968B',
    fontSize: 11,
  },
  name: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  email: {
    marginTop: 4,
    color: COLORS.secondary,
    fontSize: 12,
  },
  editPill: {
    overflow: 'hidden',
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#E8F7EE',
  },
  sectionHeading: {
    marginTop: 21,
    marginBottom: 10,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  optionsCard: {
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: COLORS.white,
    shadowColor: '#1C6A46',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.055,
    shadowRadius: 13,
    elevation: 2,
  },
  optionRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 15,
    paddingVertical: 11,
  },
  optionRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8EFEB',
  },
  optionPressed: {
    opacity: 0.72,
  },
  optionIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#E7F7ED',
  },
  optionCopy: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    color: '#263A31',
    fontSize: 13,
    fontWeight: '700',
  },
  optionDescription: {
    marginTop: 4,
    color: '#879A90',
    fontSize: 11,
    lineHeight: 15,
  },
  optionChevron: {
    color: '#718C7E',
    fontSize: 26,
    lineHeight: 28,
  },
  deleteOptionIcon: {
    backgroundColor: '#FDEEEE',
  },
  deleteOptionTitle: {
    color: COLORS.danger,
  },
  logoutRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8EFEB',
  },
  versionText: {
    marginTop: 28,
    color: '#8CA096',
    fontSize: 11,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(17, 35, 27, 0.48)',
  },
  deleteAccountModal: {
    width: '100%',
    padding: 20,
    borderRadius: 18,
    backgroundColor: COLORS.white,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  modalDescription: {
    marginTop: 7,
    color: COLORS.secondary,
    fontSize: 13,
    lineHeight: 19,
  },
  passwordInput: {
    minHeight: 48,
    marginTop: 16,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    color: COLORS.text,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  cancelDeleteButton: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
  },
  cancelDeleteText: {
    color: COLORS.secondary,
    fontSize: 13,
    fontWeight: '700',
  },
  confirmDeleteButton: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: COLORS.danger,
  },
  confirmDeleteText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.82,
  },
});
