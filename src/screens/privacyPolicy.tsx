import React, { useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { selectUserInfo } from '../reduxs/reduces/user';
import {
  hasAcceptedPrivacyPolicy,
  savePrivacyPolicyConsent,
} from '../utils/privacyConsent';
import { goBack, onSetNavigation, resetTo } from '../utils/navigation';
import ScreenKeys from '../utils/screenKey';
import type { RootStackParamList } from '../utils/types/navigation';
import type { StackScreenProps } from '@react-navigation/stack';

type Props = StackScreenProps<
  RootStackParamList,
  typeof ScreenKeys.PRIVACY_POLICY
>;

const PolicySection = ({
  title,
  children,
}: {
  title: string;
  children: string;
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.sectionBody}>{children}</Text>
  </View>
);

const PrivacyPolicyScreen = ({ route }: Props) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const user = useSelector(selectUserInfo);
  const viewOnly = route.params?.mode === 'view';
  const [accepted, setAccepted] = useState(false);
  const [alreadyAccepted] = useState(hasAcceptedPrivacyPolicy() && !viewOnly);

  useEffect(() => {
    onSetNavigation(navigation);
    if (!viewOnly && hasAcceptedPrivacyPolicy()) {
      resetTo(user?.accessToken ? ScreenKeys.HOMESCREEN : ScreenKeys.LOGIN);
    }
  }, [navigation, user?.accessToken, viewOnly]);

  useEffect(() => {
    if (viewOnly) return undefined;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true,
    );
    return () => subscription.remove();
  }, [viewOnly]);

  const footerStyle = useMemo(
    () => ({ paddingBottom: Math.max(insets.bottom, 14) }),
    [insets.bottom],
  );

  const continueToApp = () => {
    if (!accepted) return;
    savePrivacyPolicyConsent();
    resetTo(user?.accessToken ? ScreenKeys.HOMESCREEN : ScreenKeys.LOGIN);
  };

  if (alreadyAccepted) {
    return <View style={styles.screen} />;
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {viewOnly ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng chính sách quyền riêng tư"
            onPress={goBack}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>‹</Text>
          </Pressable>
        ) : null}
        <View style={styles.brand}>
          <Text style={styles.brandMark}>MC</Text>
          <View>
            <Text style={styles.brandName}>MealCraft</Text>
            <Text style={styles.brandSubtitle}>
              QUYỀN RIÊNG TƯ & ĐIỀU KHOẢN
            </Text>
          </View>
        </View>

        <Text style={styles.title}>
          {viewOnly
            ? 'Chính sách quyền riêng tư'
            : 'Thông tin trước khi sử dụng'}
        </Text>
        <Text style={styles.intro}>
          Vui lòng đọc cách MealCraft sử dụng dữ liệu và quyền trên thiết bị.
          Bạn cần đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư
          trước khi đăng nhập hoặc tạo tài khoản.
        </Text>

        <LinearGradient colors={['#FFFFFF', '#F3FAF5']} style={styles.card}>
          <PolicySection
            title="1. Dữ liệu chúng tôi xử lý"
            children="Thông tin tài khoản gồm email, tên, mật khẩu đã mã hóa và ảnh đại diện nếu bạn chọn tải lên. Dữ liệu sức khỏe gồm tuổi, giới tính, chiều cao, cân nặng, mức độ vận động, mục tiêu và các chỉ số dinh dưỡng được tính từ thông tin đó. Dữ liệu sử dụng gồm thực đơn, món đã ăn, đánh giá, lịch sử đi bộ (bước, thời lượng, quãng đường và calo ước tính), nội dung chat và hoạt động gia đình bạn tham gia. Ứng dụng cũng gửi mã thiết bị cài đặt cùng hệ điều hành/phiên bản ứng dụng để vận hành và hỗ trợ xử lý lỗi."
          />
          <PolicySection
            title="2. Mục đích sử dụng"
            children="Dữ liệu được dùng để đăng nhập, đồng bộ tài khoản, cá nhân hóa thực đơn và thống kê sức khỏe, ghi nhận buổi đi bộ khi bạn chủ động bắt đầu, hiển thị tính năng gia đình, bảo vệ dịch vụ và xử lý sự cố. Chỉ số dinh dưỡng và vận động là ước tính hỗ trợ tham khảo, không phải chẩn đoán hay tư vấn y tế."
          />
          <PolicySection
            title="3. Quyền truy cập thiết bị"
            children="Vị trí được yêu cầu khi bạn sử dụng tính năng đi bộ để đo quãng đường, có thể tiếp tục trong nền khi buổi đi bộ đang chạy. Quyền nhận dạng hoạt động/chuyển động được dùng để đếm bước. Thư viện ảnh chỉ được truy cập khi bạn chủ động chọn ảnh đại diện; ảnh được thu nhỏ/nén trước khi tải lên. Thông báo và rung được dùng cho thông báo của ứng dụng, bao gồm nhắc ăn gia đình. Bạn có thể từ chối hoặc thu hồi quyền trong Cài đặt thiết bị; tính năng cần quyền đó có thể không hoạt động đầy đủ."
          />
          <PolicySection
            title="4. Chia sẻ và lưu trữ"
            children="Dữ liệu tài khoản và sức khỏe được lưu trên máy chủ MealCraft để cung cấp dịch vụ. Thông tin, thực đơn, nội dung chat hoặc hoạt động bạn gửi trong không gian gia đình có thể được thành viên của gia đình đó nhìn thấy. Không nhập thông tin sức khỏe nhạy cảm vào nội dung chat nếu bạn không muốn chia sẻ với các thành viên. Ảnh đại diện được lưu trên máy chủ ứng dụng. Không bán dữ liệu sức khỏe cá nhân."
          />
          <PolicySection
            title="5. Lưu giữ, truy cập và chỉnh sửa dữ liệu"
            children="Bạn có thể xem và cập nhật tên, ảnh đại diện trong mục Thông tin cá nhân; xem và cập nhật dữ liệu sức khỏe trong Hồ sơ sức khỏe. Bạn có thể xóa tài khoản ngay trong ứng dụng. Với yêu cầu truy cập bản sao dữ liệu hoặc yêu cầu khác, hãy liên hệ đơn vị vận hành qua thông tin hỗ trợ chính thức của MealCraft. Việc lưu giữ dữ liệu tuân theo pháp luật áp dụng."
          />
          <PolicySection
            title="6. Xóa tài khoản và dữ liệu"
            children="Bạn có thể xóa vĩnh viễn tài khoản trong mục Thông tin cá nhân sau khi xác nhận bằng mật khẩu. Hồ sơ, dữ liệu sức khỏe, lịch sử đi bộ, thực đơn cá nhân, đánh giá và ảnh đại diện gắn với tài khoản sẽ bị xóa. Món/đề xuất do bạn tạo và bình chọn gắn với tài khoản trong không gian gia đình cũng có thể bị xóa. Tin nhắn chat đã gửi có thể được giữ lại nhưng gỡ liên kết với tài khoản của bạn. Việc xóa tài khoản không thể hoàn tác."
          />
          <PolicySection
            title="7. Điều khoản sử dụng"
            children="Bạn đồng ý cung cấp thông tin chính xác, tự bảo vệ thông tin đăng nhập và chỉ sử dụng ứng dụng hợp pháp. Bạn có thể ngừng sử dụng hoặc xóa tài khoản bất cứ lúc nào. Việc tiếp tục sử dụng tính năng cần quyền thiết bị phụ thuộc vào quyền bạn cấp trong cài đặt hệ điều hành."
          />
        </LinearGradient>

        <Text style={styles.version}>Cập nhật: 28/10/2026</Text>
      </ScrollView>

      {viewOnly ? (
        <View style={[styles.footer, footerStyle]}>
          <Pressable
            accessibilityRole="button"
            onPress={goBack}
            style={styles.continueButton}
          >
            <Text style={styles.continueText}>Đóng</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.footer, footerStyle]}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
            onPress={() => setAccepted(value => !value)}
            style={styles.consentRow}
          >
            <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
              {accepted ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.consentText}>
              Tôi đã đọc và đồng ý với Điều khoản sử dụng, Chính sách quyền
              riêng tư và việc xử lý dữ liệu sức khỏe theo nội dung trên.
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !accepted }}
            disabled={!accepted}
            onPress={continueToApp}
            style={[styles.continueButton, !accepted && styles.disabledButton]}
          >
            <Text style={styles.continueText}>Đồng ý và tiếp tục</Text>
          </Pressable>
          <Text style={styles.footerHint}>
            Nếu không đồng ý, bạn sẽ không thể đăng nhập hoặc sử dụng ứng dụng.
          </Text>
        </View>
      )}
    </View>
  );
};

export default PrivacyPolicyScreen;

const COLORS = {
  background: '#F5F7F5',
  white: '#FFFFFF',
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  border: '#E5EBE7',
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 18, paddingBottom: 16 },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  brandMark: {
    width: 44,
    height: 44,
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: COLORS.green,
    color: COLORS.white,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 16,
    fontWeight: '900',
  },
  brandName: { color: COLORS.text, fontSize: 18, fontWeight: '900' },
  brandSubtitle: {
    marginTop: 3,
    color: COLORS.green,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: { color: COLORS.text, fontSize: 25, fontWeight: '900' },
  intro: {
    marginTop: 8,
    marginBottom: 18,
    color: COLORS.secondary,
    fontSize: 14,
    lineHeight: 21,
  },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
  },
  section: { marginBottom: 18 },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 5,
  },
  sectionBody: { color: COLORS.secondary, fontSize: 12, lineHeight: 18 },
  version: {
    marginTop: 12,
    marginBottom: 8,
    color: COLORS.secondary,
    fontSize: 11,
    textAlign: 'right',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 8,
  },
  closeButtonText: { color: COLORS.green, fontSize: 34, lineHeight: 38 },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 23,
    height: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    borderRadius: 6,
  },
  checkboxChecked: { borderColor: COLORS.green, backgroundColor: COLORS.green },
  checkmark: { color: COLORS.white, fontSize: 15, fontWeight: '900' },
  consentText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 17,
  },
  continueButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderRadius: 13,
    backgroundColor: COLORS.green,
  },
  disabledButton: { opacity: 0.45 },
  continueText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  footerHint: {
    marginTop: 8,
    color: COLORS.secondary,
    fontSize: 10,
    textAlign: 'center',
  },
});
