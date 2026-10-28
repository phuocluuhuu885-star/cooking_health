import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const COLORS = {
  text: '#1C242C',
  secondary: '#7A858E',
  green: '#2FA878',
  lightGreen: '#E8F7F0',
  white: '#FFFFFF',
};

interface ProfileMenuItemProps {
  icon: string;
  title: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
}

const ProfileMenuItem = memo(
  ({
    icon,
    title,
    value,
    onPress,
    showArrow = true,
  }: ProfileMenuItemProps) => {
    return (
      <Pressable style={styles.container} onPress={onPress}>
        <View style={styles.icon}>
          <View style={{width:18,height:18, backgroundColor:'red'}} />
        </View>

        <Text style={styles.title}>{title}</Text>

        {value && <Text style={styles.value}>{value}</Text>}

        {showArrow && (
         <View style={{width:18,height:18, backgroundColor:'red'}} />
        )}
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    minHeight: 39,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: COLORS.white,
  },
  icon: {
    width: 27,
    height: 27,
    borderRadius: 12,
    backgroundColor: COLORS.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  value: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.secondary,
  },
});

export default ProfileMenuItem;