import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type Props = {
  unreadCount: number;
  onPress: () => void;
};

const HouseholdNotificationButton = ({ unreadCount, onPress }: Props) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={
      unreadCount > 0
        ? `Mở thông báo gia đình, ${unreadCount} thông báo chưa đọc`
        : 'Mở thông báo gia đình'
    }
    accessibilityHint="Mở danh sách thông báo về bình chọn và thực đơn"
    onPress={onPress}
    style={styles.button}
  >
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"
        fill="none"
        stroke="#168653"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </Svg>
    {unreadCount > 0 ? (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </Text>
      </View>
    ) : null}
  </Pressable>
);

export default HouseholdNotificationButton;

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E9DE',
    backgroundColor: '#E7F4EC',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -5,
    minWidth: 19,
    height: 19,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    backgroundColor: '#C7382F',
  },
  badgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
});
