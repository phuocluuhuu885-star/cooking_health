import { TextInput as RNTextInput, StyleSheet } from 'react-native';
import type {
  TextInputInstance,
  TextInputProps,
  TextStyle,
} from 'react-native';
import { forwardRef } from 'react';
import { colors, getFontFamilyFromWeightAndStyle } from '../constant';

const TextInput = forwardRef<TextInputInstance, TextInputProps>(
  ({ style, ...props }, ref) => {
    const flatStyle = StyleSheet.flatten(style || {}) as TextStyle;
    const { fontFamily, fontWeight, fontStyle, color } = flatStyle;

    const resolvedFontFamily =
      fontFamily ?? getFontFamilyFromWeightAndStyle(fontWeight, fontStyle);
    const textColor = color ?? colors.Gray.g950;

    return (
      <RNTextInput
        ref={ref}
        {...props}
        style={[
          style,
          {
            fontFamily: resolvedFontFamily,
            color: textColor,
            includeFontPadding: false,
            textAlignVertical: 'center',
          },
        ]}
        allowFontScaling={false}
      />
    );
  },
);

export default TextInput;
