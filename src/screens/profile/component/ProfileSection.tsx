import React, { memo, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const COLORS = {
  text: '#1C242C',
  secondary: '#7A858E',
  white: '#FFFFFF',
};

interface ProfileSectionProps {
  title: string;
  children: ReactNode;
}

const ProfileSection = memo(({ title, children }: ProfileSectionProps) => {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>
      <LinearGradient
        colors={['#FFFFFF', '#F3FAF5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {children}
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 9,
  },
  title: {
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  card: {
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
});

export default ProfileSection;