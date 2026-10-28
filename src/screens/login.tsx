import React, { memo, useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { resetTo } from '../utils/navigation';
import ScreenKeys from '../utils/screenKey';
import { setSyncUser, syncApi } from '../utils/syncUtils';
import apiConst from '../abase/constant/apiConst';
import { onHideLoading, onShowLoading } from '../components/loading';
import { useAppDispatch } from '../reduxs/store';
import { setUserInfo } from '../reduxs/reduces/user';
import InputComponent from '../abase/component/InputBox';
import LoginTabs from './component/LoginTab';

const LogoSection = memo(() => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.logoContainer,
        {
          paddingTop: insets.top + 16,
        },
      ]}
    >
      <View style={styles.brandRow}>
        <View style={styles.logoIcon}>
          <Text style={styles.logoIconText}>✦</Text>
        </View>
        <View>
          <Text style={styles.logoText}>
            Meal<Text style={styles.logoTextGreen}>Craft</Text>
          </Text>
          <Text style={styles.logoCaption}>Ăn ngon, sống khỏe mỗi ngày</Text>
        </View>
      </View>
      <View style={styles.welcomeCopy}>
        <Text style={styles.welcomeTitle}>Bữa ăn tốt bắt đầu từ đây</Text>
        <Text style={styles.logoDescription}>
          Lên thực đơn dễ dàng, chăm sóc sức khỏe cho cả gia đình.
        </Text>
      </View>
    </View>
  );
});

const Login = () => {
  const dispatch = useAppDispatch();
  const [state, setState] = useState<{
    isLogin: boolean;

    // Login
    loginEmail: string;
    loginPassword: string;
    showLoginPassword: boolean;

    // Register
    fullName: string;
    registerEmail: string;
    phone: string;
    registerPassword: string;
    confirmPassword: string;
    showRegisterPassword: boolean;
    showConfirmPassword: boolean;

    errorMsg: { [key: string]: string };
  }>({
    isLogin: true,

    // Login
    loginEmail: '',
    loginPassword: '',
    showLoginPassword: false,

    // Register
    fullName: '',
    registerEmail: '',
    phone: '',
    registerPassword: '',
    confirmPassword: '',
    showRegisterPassword: false,
    showConfirmPassword: false,
    errorMsg: {},
  });

  const onChangeTab = useCallback((isLogin: boolean) => {
    setState(prev => ({
      ...prev,
      isLogin,
    }));
  }, []);

  const onLoginEmailChange = useCallback((value: string) => {
    setState(prev => ({
      ...prev,
      loginEmail: value,
    }));
  }, []);

  const onLoginPasswordChange = useCallback((value: string) => {
    setState(prev => ({
      ...prev,
      loginPassword: value,
    }));
  }, []);

  const onFullNameChange = useCallback((value: string) => {
    setState(prev => ({
      ...prev,
      fullName: value,
    }));
  }, []);

  const onRegisterEmailChange = useCallback((value: string) => {
    setState(prev => ({
      ...prev,
      registerEmail: value,
    }));
  }, []);

  const onRegisterPasswordChange = useCallback((value: string) => {
    setState(prev => ({
      ...prev,
      registerPassword: value,
    }));
  }, []);

  const onConfirmPasswordChange = useCallback((value: string) => {
    setState(prev => ({
      ...prev,
      confirmPassword: value,
    }));
  }, []);

  const onConfirmRegiter = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLogin: true,
      fullName: '',
      confirmPassword: '',
      registerPassword: '',
      registerEmail: '',
    }));
  }, []);

  const onCancelRegiter = useCallback(() => {
    setState(prev => ({
      ...prev,
      fullName: '',
      confirmPassword: '',
      registerPassword: '',
      registerEmail: '',
    }));
  }, []);

  const onLogin = useCallback(async () => {
    let errorMsg: { [key: string]: string } = {};
    if (!state.loginEmail || state.loginEmail.trim() === '') {
      errorMsg.email = 'Email không được để trống';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.loginEmail.trim())) {
      errorMsg.email = 'Email không đúng định dạng';
    }

    if (!state.loginPassword || state.loginPassword.trim() === '') {
      errorMsg.password = 'Mật khẩu không được để trống';
    } else if (state.loginPassword.length < 6) {
      errorMsg.password = 'Mật khẩu tối thiểu 6 ký tự';
    }
    setState(prev => ({ ...prev, errorMsg: errorMsg }));
    if (Object.keys(errorMsg).length > 0) {
      return;
    }
    try {
      onShowLoading();
      const res = await syncApi(apiConst.login, {
        email: state.loginEmail.trim(),
        password: state.loginPassword,
      });
      if (res?.success && res.data?.user) {
        setState(prev => ({
          ...prev,
          loginEmail: '',
          loginPassword: '',
          errorMsg: {},
        }));
        dispatch(setUserInfo(res.data.user));
        setSyncUser(res.data.user);
        resetTo(ScreenKeys.HOMESCREEN);
      } else {
        Alert.alert(
          'Thông báo',
          res?.message ||
            res?.ErrorMessage ||
            'Có lỗi xảy ra vui lòng thử đăng nhập lại!',
        );
      }
    } catch (error) {
      Alert.alert(
        'Thông báo',
        error instanceof Error
          ? error.message
          : 'Không thể đăng nhập lúc này. Vui lòng thử lại.',
      );
    } finally {
      onHideLoading();
    }
  }, [state.loginEmail, state.loginPassword, dispatch]);

  const onRegister = useCallback(async () => {
    let errorMsg: { [key: string]: string } = {};

    if (!state.fullName || state.fullName.trim() === '') {
      errorMsg.fullName = 'Họ tên không được để trống';
    } else if (state.fullName.trim().length < 2) {
      errorMsg.fullName = 'Họ tên tối thiểu 2 ký tự';
    }

    if (!state.registerEmail || state.registerEmail.trim() === '') {
      errorMsg.registerEmail = 'Email không được để trống';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.registerEmail.trim())) {
      errorMsg.registerEmail = 'Email không đúng định dạng';
    }

    if (!state.registerPassword || state.registerPassword.trim() === '') {
      errorMsg.registerPassword = 'Mật khẩu không được để trống';
    } else if (state.registerPassword.length < 6) {
      errorMsg.registerPassword = 'Mật khẩu tối thiểu 6 ký tự';
    }

    if (!state.confirmPassword || state.confirmPassword.trim() === '') {
      errorMsg.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    } else if (state.confirmPassword !== state.registerPassword) {
      errorMsg.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    setState(prev => ({ ...prev, errorMsg: errorMsg }));
    if (Object.keys(errorMsg).length > 0) {
      return;
    }
    try {
      onShowLoading();
      const res = await syncApi(apiConst.register, {
        email: state.registerEmail.trim(),
        password: state.registerPassword,
        fullName: state.fullName.trim(),
      });
      if (res && res.success) {
        Alert.alert(
          'Thông báo',
          'Đăng ký tài khoản thành công.\nBạn có muốn đăng nhập ngay không?',
          [
            { text: 'Hủy', onPress: onCancelRegiter },
            { text: 'Đồng ý', onPress: onConfirmRegiter },
          ],
        );
        setState(prev => ({
          ...prev,
          registerEmail: '',
          registerPassword: '',
          fullName: '',
          confirmPassword: '',
          errorMsg: {},
        }));
      } else {
        Alert.alert(
          'Thông báo',
          res?.message ||
            res?.ErrorMessage ||
            'Có lỗi xảy ra vui lòng đăng ký lại!',
        );
      }
    } catch (error) {
      Alert.alert(
        'Thông báo',
        error instanceof Error
          ? error.message
          : 'Không thể đăng ký lúc này. Vui lòng thử lại.',
      );
    } finally {
      onHideLoading();
    }
  }, [
    state.fullName,
    state.registerEmail,
    state.registerPassword,
    state.confirmPassword,
    onCancelRegiter,
    onConfirmRegiter,
  ]);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent]}
          keyboardDismissMode={
            Platform.OS === 'ios' ? 'interactive' : 'on-drag'
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <LogoSection />
            <LinearGradient
              colors={['#FFFFFF', '#F0F8F2']}
              style={styles.authPanel}
            >
              <Text style={styles.formEyebrow}>
                {state.isLogin
                  ? 'CHÀO MỪNG BẠN TỚI MEALCRAFT'
                  : 'BẮT ĐẦU HÀNH TRÌNH'}
              </Text>
              <Text style={styles.formTitle}>
                {state.isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}
              </Text>
              <Text style={styles.formSubtitle}>
                {state.isLogin
                  ? 'Tiếp tục lên kế hoạch cho những bữa ăn ngon.'
                  : 'Tạo tài khoản để cá nhân hóa bữa ăn của bạn.'}
              </Text>
              <LoginTabs isLogin={state.isLogin} onChange={onChangeTab} />
              {state.isLogin ? (
                <View style={styles.loginCard}>
                  <InputComponent
                    title="Email"
                    variant="auth"
                    isRequire={true}
                    value={state.loginEmail}
                    inputKey="email"
                    keyboardType="email-address"
                    onTextChange={onLoginEmailChange}
                    errMsg={state.errorMsg.email}
                  />

                  <InputComponent
                    title="Mật khẩu"
                    variant="auth"
                    isRequire={true}
                    value={state.loginPassword}
                    inputKey="password"
                    onTextChange={onLoginPasswordChange}
                    errMsg={state.errorMsg.password}
                  />
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.loginButton}
                    onPress={onLogin}
                  >
                    <Text style={styles.loginButtonText}>Đăng nhập</Text>
                    <Text style={styles.loginButtonArrow}>→</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.loginCard}>
                  <InputComponent
                    title="Họ và tên"
                    variant="auth"
                    isRequire={true}
                    value={state.fullName}
                    inputKey="fullName"
                    onTextChange={onFullNameChange}
                    errMsg={state.errorMsg.fullName}
                  />
                  <InputComponent
                    title="Email"
                    variant="auth"
                    isRequire={true}
                    value={state.registerEmail}
                    inputKey="email"
                    keyboardType="email-address"
                    onTextChange={onRegisterEmailChange}
                    errMsg={state.errorMsg.registerEmail}
                  />
                  <InputComponent
                    title="Mật khẩu"
                    variant="auth"
                    isRequire={true}
                    value={state.registerPassword}
                    inputKey="password"
                    onTextChange={onRegisterPasswordChange}
                    errMsg={state.errorMsg.registerPassword}
                  />
                  <InputComponent
                    title="Xác nhận mật khẩu"
                    variant="auth"
                    isRequire={true}
                    value={state.confirmPassword}
                    inputKey="password"
                    onTextChange={onConfirmPasswordChange}
                    errMsg={state.errorMsg.confirmPassword}
                  />
                  <TouchableOpacity
                    style={styles.loginButton}
                    onPress={onRegister}
                  >
                    <Text style={styles.loginButtonText}>Tạo tài khoản</Text>
                    <Text style={styles.loginButtonArrow}>→</Text>
                  </TouchableOpacity>
                </View>
              )}
            </LinearGradient>
            <Text style={styles.privacyNote}>
              Thực đơn, công thức và dinh dưỡng — gọn gàng trong một nơi.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default Login;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: '#F3F7F4',
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },

  content: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },

  logoContainer: {
    minHeight: 204,
    justifyContent: 'space-between',
    marginHorizontal: -20,
    marginBottom: -30,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 52,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#145D3E',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoIconText: {
    color: '#D8F2C5',
    fontSize: 16,
    fontWeight: '700',
  },

  logoText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  logoTextGreen: {
    color: '#C8E7A5',
  },
  logoCaption: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    fontWeight: '500',
  },
  welcomeCopy: {
    marginTop: 20,
  },
  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  logoDescription: {
    maxWidth: 300,
    marginTop: 6,
    fontSize: 14,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.78)',
  },

  authPanel: {
    zIndex: 1,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8EEE9',
    shadowColor: '#183B29',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  formEyebrow: {
    color: '#168653',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  formTitle: {
    marginTop: 5,
    color: '#172B23',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  formSubtitle: {
    marginTop: 4,
    marginBottom: 17,
    color: '#718078',
    fontSize: 14,
    lineHeight: 18,
  },
  loginCard: {
    gap: 14,
  },
  loginButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#168653',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#145D3E',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '800',
  },
  loginButtonArrow: {
    position: 'absolute',
    right: 17,
    color: '#D8F2C5',
    fontSize: 16,
    fontWeight: '500',
  },
  privacyNote: {
    marginTop: 17,
    color: '#86938B',
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
  },
});
