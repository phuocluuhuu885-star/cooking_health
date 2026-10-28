import { memo, useCallback } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors } from '../../abase/constant';
import { useSelector } from 'react-redux';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { navigate } from '../../utils/navigation';
import ScreenKeys from '../../utils/screenKey';

const FamilyCodeCard = memo(() => {
  const user = useSelector(selectUserInfo);
  const onPress = useCallback(() => {
    if (!user?.accessToken) {
      Alert.alert('Cần đăng nhập', 'Đăng nhập để tạo hoặc tham gia gia đình.');
      return;
    }
    navigate(ScreenKeys.FAMILY);
  }, [user?.accessToken]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.familyCard}
      onPress={onPress}
    >
      <LinearGradient
        colors={['#F1FAF3', '#FFFFFF']}
        pointerEvents="none"
        style={styles.familyGradient}
      />
      <View style={styles.familyIcon}>
        <Text style={styles.familyIconText}>⌂</Text>
      </View>

      <View style={styles.familyContent}>
        <Text style={styles.familyTitle}>Gia đình của bạn</Text>

        <Text style={styles.familyDescription}>
          Tạo hoặc tham gia thực đơn chung với người thân
        </Text>
      </View>

      <View style={styles.familyRight}>
        <Text style={styles.familyAction}>Mở</Text>

        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  familyCard: {
    marginTop: 18,
    minHeight: 68,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.Gray.g300,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  familyGradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 12,
  },

  familyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,

    backgroundColor: '#E3FAF2',

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 10,
  },

  familyIconText: {
    fontSize: 20,
    color: colors.Green.g400,
  },

  familyContent: {
    flex: 1,
    paddingRight: 8,
  },

  familyTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.BaseBlack,
  },

  familyDescription: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
    color: colors.Gray.g700,
  },

  familyRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  familyAction: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.Green.g400,
  },
  arrow: {
    marginLeft: 3,
    fontSize: 22,
    lineHeight: 24,
    color: colors.Green.g400,
  },
});

export default FamilyCodeCard;
