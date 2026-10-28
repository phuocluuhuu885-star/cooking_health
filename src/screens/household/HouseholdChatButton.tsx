import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type Props = {
  unreadCount: number;
  onPress: () => void;
};

const HouseholdChatButton = ({ unreadCount, onPress }: Props) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={
      unreadCount > 0
        ? `Mở tin nhắn gia đình, ${unreadCount} tin chưa đọc`
        : 'Mở tin nhắn gia đình'
    }
    accessibilityHint="Mở cuộc trò chuyện của gia đình"
    onPress={onPress}
    style={styles.button}
  >
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M5.5 5.75h13A2.75 2.75 0 0 1 21.25 8.5v6A2.75 2.75 0 0 1 18.5 17.25H10l-5.25 3v-3.4A2.75 2.75 0 0 1 2.75 14.1V8.5A2.75 2.75 0 0 1 5.5 5.75Z"
        fill="none"
        stroke="#168653"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
      <Path
        d="M7.5 10h9M7.5 13h6"
        fill="none"
        stroke="#168653"
        strokeLinecap="round"
        strokeWidth={1.6}
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

export default HouseholdChatButton;

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
