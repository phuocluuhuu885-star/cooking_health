import React, { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goBack } from '../../utils/navigation';

type ScreenHeaderProps = {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  backAccessibilityLabel?: string;
  onBack?: () => void;
  showBackButton?: boolean;
  rightAction?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const COLORS = {
  text: '#172B23',
  secondary: '#66756D',
  green: '#168653',
  white: '#FFFFFF',
};

const ScreenHeader = ({
  title,
  eyebrow,
  subtitle,
  backAccessibilityLabel = 'Quay lại',
  onBack = goBack,
  showBackButton = true,
  rightAction,
  style,
}: ScreenHeaderProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }, style]}>
      {showBackButton ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backAccessibilityLabel}
          onPress={onBack}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
      ) : null}
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightAction}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 8,
    borderBottomWidth:1,
    paddingHorizontal: 16,
    borderBottomColor: 'rgba(0,0,0,0.07)',
  },
  backButton: {
    width: 40,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  backText: {
    marginTop: -4,
    color: COLORS.green,
    fontSize: 34,
    lineHeight: 38,
    textAlign: 'center',
  },
  copy: {
    flex: 1,
  },
  eyebrow: {
    color: COLORS.green,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    marginTop: 2,
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 3,
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 15,
  },
});

export default ScreenHeader;
