import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import type { TextProps, TextStyle } from 'react-native';
import colors from '../constant/colors';
import { getFontFamilyFromWeightAndStyle } from '../constant';

const Text: React.FC<TextProps> = ({ style, ...props }) => {
  const flatStyle = StyleSheet.flatten(style || {}) as TextStyle;
  const { fontFamily, fontWeight, fontStyle, color } = flatStyle;

  const resolvedFontFamily =
    fontFamily ?? getFontFamilyFromWeightAndStyle(fontWeight, fontStyle);
  const textColor = color ?? colors.Gray.g950;

  return (
    <RNText
      {...props}
      style={[flatStyle, {
        fontFamily: resolvedFontFamily, color: textColor,
        includeFontPadding: false,
        textAlignVertical: 'center'
      }]}
      allowFontScaling={false}
    />
  );
};

export default Text;
