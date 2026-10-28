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
    const selectPersonal = useCallback(() => {
      onSelect('PERSONAL');
    }, [onSelect]);
    const selectHousehold = useCallback(() => {
      onSelect('HOUSEHOLD');
    }, [onSelect]);

    return (
      <View style={styles.container}>
        <Text style={styles.label}>Chọn hành động</Text>
        <View style={styles.options}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              selected: selectedDestination === 'PERSONAL',
              disabled,
            }}
            disabled={disabled}
            onPress={selectPersonal}
            style={[
              styles.option,
              selectedDestination === 'PERSONAL' && styles.selectedOption,
              disabled && styles.disabled,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                selectedDestination === 'PERSONAL' && styles.selectedText,
              ]}
            >
              Thực đơn cá nhân
            </Text>
          </Pressable>
          {householdAvailable ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                selected: selectedDestination === 'HOUSEHOLD',
                disabled,
              }}
              disabled={disabled}
              onPress={selectHousehold}
              style={[
                styles.option,
                selectedDestination === 'HOUSEHOLD' && styles.selectedOption,
                disabled && styles.disabled,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  selectedDestination === 'HOUSEHOLD' && styles.selectedText,
                ]}
              >
                Đề xuất cho gia đình
              </Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.description}>
          {selectedDestination === 'HOUSEHOLD'
            ? 'Món sẽ được gửi để các thành viên gia đình bình chọn.'
            : 'Món chỉ được lưu trong thực đơn riêng của bạn.'}
        </Text>
      </View>
    );
  },
);

export default MealPlanDestinationSelector;

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    color: '#34404B',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
  },
  description: {
    color: '#66756D',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 6,
  },
  options: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5EBE7',
    backgroundColor: '#F2F5F3',
  },
  selectedOption: {
    borderColor: '#168653',
    backgroundColor: '#E7F4EC',
  },
  disabled: {
    opacity: 0.6,
  },
  optionText: {
    color: '#66756D',
    fontSize: 12,
    fontWeight: '700',
  },
  selectedText: {
    color: '#168653',
  },
});
