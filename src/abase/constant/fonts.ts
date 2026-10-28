import { Platform } from 'react-native';

const Italic = 'Italic';
const fontNameiOS = 'SFProDisplay';
const fontNameAndroid = 'SF-Pro-Display';

const fontType = {
  Black: 'Black',
  Bold: 'Bold',
  Heavy: 'Heavy',
  Light: 'Light',
  Medium: 'Medium',
  Regular: 'Regular',
  Semibold: 'Semibold',
  Thin: 'Thin',
  Ultralight: 'Ultralight',
};

export function getFontFamilyFromWeightAndStyle(
  fontWeight: string | number | undefined,
  fontStyle: string | undefined
): string {
  const weight =
    typeof fontWeight === 'string'
      ? parseInt(fontWeight, 10)
      : (fontWeight ?? 400);
  const isItalic = fontStyle === 'italic';
  let base = fontType.Regular;

  if (weight <= 100) base = fontType.Ultralight;
  else if (weight <= 200) base = fontType.Thin;
  else if (weight <= 300) base = fontType.Light;
  else if (weight <= 400) base = fontType.Regular;
  else if (weight <= 500) base = fontType.Medium;
  else if (weight <= 600) base = fontType.Semibold;
  else if (weight <= 700) base = fontType.Bold;
  else if (weight <= 800) base = fontType.Heavy;
  else base = fontType.Black;

  return `${Platform.OS === 'android' ? fontNameAndroid : fontNameiOS}-${base}${isItalic ? Italic : ''}`;
}
