import React, { useId, useMemo } from 'react';
import {
  ColorValue,
  StyleProp,
  StyleSheet,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Rect,
  Stop,
} from 'react-native-svg';

type GradientPoint = {
  x: number;
  y: number;
};

type Props = Omit<ViewProps, 'style'> & {
  colors: readonly ColorValue[];
  end?: GradientPoint;
  locations?: readonly number[];
  start?: GradientPoint;
  style?: StyleProp<ViewStyle>;
};

const LinearGradient = ({
  children,
  colors,
  end = { x: 0.5, y: 1 },
  locations,
  start = { x: 0.5, y: 0 },
  style,
  ...viewProps
}: Props) => {
  const gradientId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const flattenedStyle = StyleSheet.flatten(style) ?? {};
  const gradientFrameStyle: ViewStyle = {
    ...StyleSheet.absoluteFill,
    borderRadius: flattenedStyle.borderRadius,
    borderTopLeftRadius: flattenedStyle.borderTopLeftRadius,
    borderTopRightRadius: flattenedStyle.borderTopRightRadius,
    borderBottomLeftRadius: flattenedStyle.borderBottomLeftRadius,
    borderBottomRightRadius: flattenedStyle.borderBottomRightRadius,
    overflow: 'hidden',
  };
  const gradientStops = useMemo(
    () =>
      colors.map((color, index) => (
        <Stop
          key={index}
          offset={locations?.[index] ?? index / Math.max(colors.length - 1, 1)}
          stopColor={color}
        />
      )),
    [colors, locations],
  );

  return (
    <View {...viewProps} style={style}>
      <View pointerEvents="none" style={gradientFrameStyle}>
        <Svg height="100%" width="100%">
          <Defs>
            <SvgLinearGradient
              gradientUnits="objectBoundingBox"
              id={gradientId}
              x1={`${start.x * 100}%`}
              x2={`${end.x * 100}%`}
              y1={`${start.y * 100}%`}
              y2={`${end.y * 100}%`}
            >
              {gradientStops}
            </SvgLinearGradient>
          </Defs>
          <Rect fill={`url(#${gradientId})`} height="100%" width="100%" />
        </Svg>
      </View>
      {children}
    </View>
  );
};

export default LinearGradient;
