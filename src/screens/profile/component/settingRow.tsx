import { memo } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import Text from '../../../abase/component/text';
import { colors } from '../../../abase/constant';

type SettingRowProps = {
  icon: any;
  title: string;
  value?: string;
  showArrow?: boolean;
  onPress?: () => void;
  isLast?: boolean;
};

const SettingRow = memo(
  ({
    icon,
    title,
    value,
    showArrow = true,
    onPress,
    isLast = false,
  }: SettingRowProps) => {
    return (
      <TouchableOpacity
        style={[styles.settingRow, !isLast && styles.settingRowBorder]}
        onPress={onPress}
      >
        <View style={styles.settingIcon}>
          <Image
            source={icon}
            style={{ width: 24, height: 24 }}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.settingTitle}>{title}</Text>
        {value && (
          <Text style={styles.settingValue} numberOfLines={1}>
            {value}
          </Text>
        )}
        {showArrow ? <Text style={styles.arrow}>›</Text> : null}
      </TouchableOpacity>
    );
  },
);

export default SettingRow;

const styles = StyleSheet.create({
  settingRow: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  settingRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.Gray.g200,
  },

  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.Green.g400,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  settingIconText: {
    fontSize: 15,
    color: colors.Gray.g300,
    fontWeight: '600',
  },

  settingTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',

    color: 'black',
  },

  settingValue: {
    maxWidth: 100,
    fontSize: 14,
    lineHeight: 14,
    color: colors.Gray.g400,
    textAlign: 'right',
  },

  arrow: {
    fontSize: 24,
    fontWeight: '400',
    color: colors.Gray.g400,
  },
});
