import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { HomeMealPeriodButtonProps } from '../../utils/types';

const HomeMealPeriodButton = memo(
  ({
    period,
    itemCount,
    completed,
    selected,
    onSelect,
  }: HomeMealPeriodButtonProps) => {
    const handlePress = useCallback(() => {
      onSelect(period.id);
    }, [onSelect, period.id]);

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${period.label}, ${
          completed
            ? 'đã xác nhận'
            : itemCount > 0
            ? `${itemCount} món`
            : 'chưa có món'
        }`}
        accessibilityState={{ selected }}
        onPress={handlePress}
        style={[styles.option, selected && styles.selectedOption]}
      >
        <LinearGradient
          colors={
            selected ? ['#168653', '#0F7447'] : ['#FFFFFF', '#F2F8F4']
          }
          style={styles.optionGradient}
        >
          <Text style={[styles.label, selected && styles.selectedLabel]}>
            {period.label}
          </Text>
          <Text style={[styles.summary, selected && styles.selectedLabel]}>
            {completed
              ? 'Đã xác nhận'
              : itemCount > 0
              ? `${itemCount} món`
              : 'Chưa có món'}
          </Text>
        </LinearGradient>
      </Pressable>
    );
  },
);

export default HomeMealPeriodButton;

const styles = StyleSheet.create({
  option: {
    flex: 1,
    minHeight: 58,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5EBE7',
  },
  selectedOption: {
    borderColor: '#168653',
  },
  optionGradient: {
    flex: 1,
    minHeight: 58,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  label: {
    color: '#66756D',
    fontSize: 14,
    fontWeight: '700',
  },
  summary: {
    marginTop: 4,
    color: '#66756D',
    fontSize: 14,
  },
  selectedLabel: {
    color: '#FFFFFF',
  },
});
