import React from 'react';
import { Pressable, Text } from 'react-native';
import styles from './styles';

type Props = {
  label: string;
  disabled: boolean;
  onPress: () => void;
};

const ActionButton = ({ label, disabled, onPress }: Props) => (
  <Pressable
    accessibilityRole="button"
    disabled={disabled}
    onPress={onPress}
    style={[styles.primaryButton, disabled && styles.disabledButton]}
  >
    <Text style={styles.primaryButtonText}>{label}</Text>
  </Pressable>
);

export default ActionButton;
