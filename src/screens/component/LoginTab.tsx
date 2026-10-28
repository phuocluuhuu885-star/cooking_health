import { memo, useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

type LoginTabsProps = {
  isLogin: boolean;
  onChange: (value: boolean) => void;
};

const LoginTabs = memo(({ isLogin, onChange }: LoginTabsProps) => {
  const onLoginPress = useCallback(() => {
    onChange(true);
  }, [onChange]);

  const onRegisterPress = useCallback(() => {
    onChange(false);
  }, [onChange]);

  return (
    <LinearGradient
      colors={['#FFFFFF', '#EAF6EE']}
      style={styles.tabsContainer}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.tab}
        onPress={onLoginPress}
      >
        {isLogin ? (
          <LinearGradient
            colors={['#2FA878', '#168653']}
            pointerEvents="none"
            style={styles.activeTabGradient}
          />
        ) : null}
        <Text style={[styles.tabText, isLogin && styles.activeTabText]}>
          Đăng nhập
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.tab}
        onPress={onRegisterPress}
      >
        {!isLogin ? (
          <LinearGradient
            colors={['#2FA878', '#168653']}
            pointerEvents="none"
            style={styles.activeTabGradient}
          />
        ) : null}
        <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>
          Đăng ký
        </Text>
      </TouchableOpacity>
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  tabsContainer: {
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    padding: 4,
    marginBottom: 14,
  },

  tab: {
    position: 'relative',
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  activeTabGradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 12,
  },

  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#66756D',
  },

  activeTabText: {
    color: 'white',
    fontWeight: '700',
  },
});

export default LoginTabs;
