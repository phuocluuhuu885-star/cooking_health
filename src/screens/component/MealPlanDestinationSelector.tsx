import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MealPlanDestination } from '../../utils/types';

type MealPlanDestinationSelectorProps = {
  selectedDestination: MealPlanDestination;
  householdAvailable: boolean;
  disabled?: boolean;
  onSelect: (destination: MealPlanDestination) => void;
};

const MealPlanDestinationSelector = memo(
  ({
    selectedDestination,
    householdAvailable,
    disabled = false,
    onSelect,
  }: MealPlanDestinationSelectorProps) => {
    const toggleDestination = useCallback(() => {
      onSelect(selectedDestination === 'PERSONAL' ? 'HOUSEHOLD' : 'PERSONAL');
    }, [onSelect, selectedDestination]);
    const getSwitchButtonStyle = useCallback(
      ({ pressed }: { pressed: boolean }) => [
        styles.switchButton,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ],
      [disabled],
    );

    if (!householdAvailable) return null;

    const isHousehold = selectedDestination === 'HOUSEHOLD';
    const nextLabel = isHousehold ? 'Cá nhân' : 'Gia đình';

    return (
      <View style={styles.container}>
        <Text style={styles.currentLabel}>Thêm món cho thực đơn</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Chuyển sang ${nextLabel}`}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={toggleDestination}
          style={getSwitchButtonStyle}
        >
          <Text style={styles.swapIcon}>⇄</Text>
          <Text style={styles.nextLabel}>{nextLabel}</Text>
        </Pressable>
      </View>
    );
  },
);

export default MealPlanDestinationSelector;

const styles = StyleSheet.create({
  container: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  currentLabel: {
    flex: 1,
    color: '#172B23',
    fontSize: 16,
    fontWeight: '700',
  },
  switchButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#E7F4EC',
  },
  swapIcon: {
    color: '#168653',
    fontSize: 18,
    fontWeight: '700',
  },
  nextLabel: {
    color: '#168653',
    fontSize: 12,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.75,
  },
});
