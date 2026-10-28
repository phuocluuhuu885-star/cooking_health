import { memo, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import eventEmitter from '../utils/eventEmitter';

const loadingEvent = 'loading-indicator-event';

export const onShowLoading = (title?: string) => {
  eventEmitter.emit(loadingEvent, {
    Title: title || 'Bạn vui lòng đợi',
    IsDefault: !title ? true : false,
  });
};

export const onHideLoading = () => {
  eventEmitter.emit(loadingEvent, { Title: null, IsDefault: true });
};

const LoadingIndicator = memo(() => {
  // const rotateAnim = useRef(new Animated.Value(0)).current;
  const [state, setState] = useState<{
    Title: string;
    IsShow: boolean;
    IsDefault: boolean;
  }>({
    Title: 'Bạn vui lòng đợi',
    IsShow: false,
    IsDefault: true,
  });
  // const spinAnim = useRef<any>(null);

  const onShowLoading = useCallback(
    ({ Title, IsDefault }: { Title: string | null; IsDefault: boolean }) => {
      setState(prev => ({
        ...prev,
        IsShow: Title ? true : false,
        IsDefault: IsDefault,
        Title: Title || '',
      }));
    },
    [],
  );

  useEffect(() => {
    eventEmitter.on(loadingEvent, onShowLoading);
    return () => {
      eventEmitter.off(loadingEvent, onShowLoading);
    };
  }, [onShowLoading]);

  useEffect(() => {
    if (state.IsShow) {
      // if (!spinAnim.current)
      //     spinAnim.current = Animated.loop(
      //         Animated.timing(rotateAnim, {
      //             toValue: 1,
      //             duration: 1000, // Speed of one full rotation (in ms)
      //             easing: Easing.linear, // Essential for a smooth, constant spin
      //             useNativeDriver: true, // Better performance
      //         })
      //     );
      // spinAnim.current.start();
    } else {
      // if (spinAnim.current)
      //     spinAnim.current.reset();
    }
  }, [state.IsShow]);

  // // Map the 0-1 value to degrees
  // const spinInterpolation = rotateAnim.interpolate({
  //     inputRange: [0, 1],
  //     outputRange: ['0deg', '360deg'],
  // });

  if (state.IsShow) {
    return (
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1099,
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#0A162D80',
          }}
        />
        <View
          style={{
            margin: 24,
            padding: 16,
            borderRadius: 12,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* <AppImage
            source={require('imgs/homeS.webp')}
            style={{ width: 44, height: 53 }}
            resizeMode="contain"
          /> */}
          {state.IsDefault && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 8,
                gap: 5,
              }}
            >
              <Text
                style={{ fontSize: 16, color: '#FFFFFF', fontWeight: '700' }}
              >
                {state.Title}
              </Text>
              <ActivityIndicator size={'large'} color={'white'} />
              {/* <Animated.Image
                        source={require("imgs/v2/indicator.webp")}
                        style={{ marginLeft: 5, width: 24, height: 24, transform: [{ rotate: spinInterpolation }] }}
                        resizeMode="contain"
                    /> */}
            </View>
          )}
          {!state.IsDefault && (
            <View
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 8,
                gap: 5,
              }}
            >
              {/* <Animated.Image
                        source={require("imgs/v2/indicator.webp")}
                        style={{ marginLeft: 5, width: 24, height: 24, transform: [{ rotate: spinInterpolation }] }}
                        resizeMode="contain"
                    /> */}
              <ActivityIndicator size={'large'} color={'white'} />
              <Text
                style={{ fontSize: 16, color: '#FFFFFF', fontWeight: '700' }}
              >
                {state.Title}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }
  return null;
});

export default LoadingIndicator;
