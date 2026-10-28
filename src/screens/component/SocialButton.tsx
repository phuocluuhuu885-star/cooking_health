import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors } from '../../abase/constant';

type SocialButtonProps = {
  title: string;
  onPress: () => void;
};

const SocialButton = memo(({ title, onPress }: SocialButtonProps) => {
  return (
    <TouchableOpacity style={styles.socialButton} onPress={onPress}>
      <Text style={styles.socialText}>{title}</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  socialButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E1E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },

  socialText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.BaseBlack,
  },
});
export default SocialButton;
