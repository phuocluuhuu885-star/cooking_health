import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = {
  hasHousehold: boolean;
  onPress: () => void;
};

function getButtonStyle({ pressed }: { pressed: boolean }) {
  return [styles.button, pressed && styles.pressed];
}

const HouseholdHomeButton = ({ hasHousehold, onPress }: Props) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={
      hasHousehold ? 'Mở gia đình của bạn' : 'Tạo hoặc tham gia gia đình'
    }
    accessibilityHint="Mở không gian gia đình và các tính năng dùng chung"
    onPress={onPress}
    style={getButtonStyle}
  >
    <Svg width={23} height={23} viewBox="0 0 24 24">
      <Circle
        cx={12}
        cy={7.5}
        r={3}
        fill="none"
        stroke="#168653"
        strokeWidth={1.7}
      />
      <Circle
        cx={5.5}
        cy={9}
        r={2.2}
        fill="none"
        stroke="#168653"
        strokeWidth={1.6}
      />
      <Circle
        cx={18.5}
        cy={9}
        r={2.2}
        fill="none"
        stroke="#168653"
        strokeWidth={1.6}
      />
      <Path
        d="M6.5 19v-1.2a5.5 5.5 0 0 1 11 0V19H6.5ZM1.8 18v-.8a3.7 3.7 0 0 1 5.1-3.4M22.2 18v-.8a3.7 3.7 0 0 0-5.1-3.4"
        fill="none"
        stroke="#168653"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.7}
      />
    </Svg>
  </Pressable>
);

export default HouseholdHomeButton;

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#D9E9DE',
    backgroundColor: '#E7F4EC',
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
});
