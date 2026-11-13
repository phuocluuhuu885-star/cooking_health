import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type HouseholdScopeSwitchProps = {
  enabled: boolean;
  householdAvailable: boolean;
  personalLabel: string;
  householdLabel: string;
  variant?: 'toggle' | 'swap';
  swapTitle?: string | null;
  swapPersonalLabel?: string;
  swapHouseholdLabel?: string;
  description?: string;
  disabled?: boolean;
  onToggle: () => void;
};

const HouseholdScopeSwitch = memo(
  ({
    enabled,
    householdAvailable,
    personalLabel,
    householdLabel,
    variant = 'toggle',
    swapTitle,
    swapPersonalLabel,
    swapHouseholdLabel,
    description,
    disabled = false,
    onToggle,
  }: HouseholdScopeSwitchProps) => {
    const handleToggle = useCallback(() => {
      onToggle();
    }, [onToggle]);
    const getSwapButtonStyle = useCallback(
      ({ pressed }: { pressed: boolean }) => [
        styles.swapButton,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ],
      [disabled],
    );

    if (!householdAvailable && variant !== 'swap') return null;

    if (variant === 'swap') {
      const currentLabel = enabled ? householdLabel : personalLabel;
      const nextLabel = enabled
        ? swapPersonalLabel ?? personalLabel
        : swapHouseholdLabel ?? householdLabel;

      return (
        <View style={styles.swapContainer}>
          {swapTitle === null ? null : (
            <Text style={styles.title}>{swapTitle ?? 'Thêm món cho thực đơn'}</Text>
          )}
          {householdAvailable ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Chuyển sang ${nextLabel}`}
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={handleToggle}
              style={getSwapButtonStyle}
            >
              <Text style={styles.swapIcon}>⇄</Text>
              <Text style={styles.swapLabel}>{nextLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <View style={styles.copy}>
          <Text style={styles.title}>
            {enabled ? householdLabel : personalLabel}
          </Text>
          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel={
            enabled
              ? `Đang dùng ${householdLabel}`
              : `Chuyển sang ${householdLabel}`
          }
          accessibilityState={{ checked: enabled, disabled }}
          disabled={disabled}
          onPress={handleToggle}
          style={[styles.track, enabled && styles.trackEnabled, disabled && styles.disabled]}
        >
          <View style={[styles.thumb, enabled && styles.thumbEnabled]} />
        </Pressable>
      </View>
    );
  },
);

export default HouseholdScopeSwitch;

const styles = StyleSheet.create({
  container: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5EBE7',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  swapContainer: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  copy: { flex: 1, gap: 3 },
  title: { color: '#172B23', fontSize: 16, fontWeight: '700' },
  description: { color: '#66756D', fontSize: 10, lineHeight: 15 },
  swapButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#E7F4EC',
  },
  swapIcon: { color: '#168653', fontSize: 18, fontWeight: '700' },
  swapLabel: { color: '#168653', fontSize: 12, fontWeight: '700' },
  track: {
    width: 48,
    height: 28,
    justifyContent: 'center',
    padding: 3,
    borderRadius: 14,
    backgroundColor: '#D5DDD8',
  },
  trackEnabled: { backgroundColor: '#168653' },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  thumbEnabled: { alignSelf: 'flex-end' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.75 },
});
