import React, { memo } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

const COLORS = {
  text: '#1C242C',
  green: '#2FA878',
  lightGreen: '#E8F7F0',
  white: '#FFFFFF',
};

interface ProfileSwitchItemProps {
  icon: string;
  title: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

const ProfileSwitchItem = memo(
  ({ title, value, onChange }: ProfileSwitchItemProps) => {
    return (
      <View style={styles.container}>
        <View style={styles.icon}>
        <View style={{width:18,height:18, backgroundColor:'red'}} />
        </View>

        <Text style={styles.title}>{title}</Text>

        <Switch
          value={value}
          onValueChange={onChange}  
          trackColor={{ false: '#D9DEE2', true: COLORS.green }}
          thumbColor={COLORS.white}
          ios_backgroundColor="#D9DEE2"
          style={styles.switch}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    minHeight: 39,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
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
    fontSize: 8,
    fontWeight: '500',
    color: COLORS.text,
  },
  switch: {
    transform: [{ scaleX: 0.72 }, { scaleY: 0.72 }],
  },
});

export default ProfileSwitchItem;