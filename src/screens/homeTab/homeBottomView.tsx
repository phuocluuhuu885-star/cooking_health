import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { memo, useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaFrame } from 'react-native-safe-area-context';
import { Shadow } from 'react-native-shadow-2';
import LinearGradient from 'react-native-linear-gradient';
import { AppImage } from '../../abase/component';
import { colors } from '../../abase/constant';

type IProps = BottomTabBarProps & {};

const HomeBottomView = memo((props: IProps) => {
  const { insets, state, navigation } = props;
  const { width } = useSafeAreaFrame();

  const onTabPress = (tabId: number) => {
    let route = -1;
    if (tabId === 2) {
      //qr
      return;
    } else if (tabId < 2) {
      route = tabId;
    } else {
      route = tabId - 1;
    }
    console.log(route);
    const event = navigation.emit({
      type: 'tabPress',
      target: state.routes[route].key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      navigation.navigate(state.routes[route].name, state.routes[route].params);
    }
  };

  const styleView = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'transparent',
        },
        containerStyle: {
          alignSelf: 'center',
          paddingBottom: insets.bottom + 8,
          width: width - 32,
        },
        overlay: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: insets.bottom + 8 + 64,
          backgroundColor: 'transparent',
        },
      }),
    [insets.bottom, width],
  );

  return (
    <View style={styleView.container}>
      <View style={styleView.overlay} />
      <View style={styleView.containerStyle}>
        <Shadow
          distance={3} // Độ nhòe của bóng
          startColor={'#00000014'} // Màu bóng từ Figma
          offset={[0, 1]} // x=0, y=1
          stretch={true} // Để bóng ôm sát theo chiều rộng view
          containerStyle={styles.shadowContainer}
        >
          <LinearGradient
            colors={['#FFFFFF', '#F0F9F4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.menuWrapper}
          >
            <View style={styles.content}>
              <ItemTab
                tabId={0}
                width={width}
                isSelected={state.index === 0}
                onPress={onTabPress}
              />
              <ItemTab
                tabId={1}
                width={width}
                isSelected={state.index === 1}
                onPress={onTabPress}
              />
              {/* <ItemTab
                                tabId={2}
                                isSelected={false}
    onPress={onTabPress} />*/}
              <ItemTab
                tabId={3}
                width={width}
                isSelected={state.index === 2}
                onPress={onTabPress}
              />
              <ItemTab
                tabId={4}
                width={width}
                isSelected={state.index === 3}
                onPress={onTabPress}
              />
            </View>
          </LinearGradient>
        </Shadow>
      </View>
    </View>
  );
});

const ItemTab = memo(
  (props: {
    tabId: number;
    isSelected?: boolean;
    width: number;
    onPress: (tabId: number) => void;
  }) => {
    const itemInfo = useMemo(() => {
      return props.tabId === 0
        ? {
            icon: require('../../imgs/home/home.webp'),
            iconS: require('../../imgs/home/homeS.webp'),
            name: 'Trang chủ',
          }
        : props.tabId === 1
        ? {
            icon: require('../../imgs/home/book.webp'),
            iconS: require('../../imgs/home/bookS.webp'),
            name: 'Món ăn',
          }
        : props.tabId === 3
        ? {
            icon: require('../../imgs/home/sCart.webp'),
            iconS: require('../../imgs/home/cart.webp'),
            name: 'Thực đơn',
          }
        : {
            icon: require('../../imgs/home/profile.webp'),
            iconS: require('../../imgs/home/profileS.webp'),
            name: 'Cá nhân',
          };
    }, [props.tabId]);

    const onPress = () => {
      props.onPress(props.tabId);
    };

    return (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.itemContainer, props.isSelected && styles.activeTab]}
      >
        {props.tabId !== 2 && (
          <>
            <Image
              source={props.isSelected ? itemInfo.iconS : itemInfo.icon}
              style={styles.icon24}
              tintColor={props.isSelected ? colors.Green.g400 : '#B4BFCB'}
              resizeMode="contain"
            />
            <Text style={props.isSelected ? styles.textSelected : styles.text}>
              {itemInfo.name}
            </Text>
          </>
        )}
        {props.tabId === 2 && (
          <>
            <AppImage
              source={require('../../imgs/home/homeS.webp')}
              style={styles.icon54}
              resizeMode="contain"
            />
          </>
        )}
      </TouchableOpacity>
    );
  },
);

const styles = StyleSheet.create({
  shadowContainer: {
    width: '100%',
  },
  menuWrapper: {
    borderRadius: 12,
    overflow: 'hidden', // Để BlurView không tràn ra ngoài bo góc
    height: 58,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flex: 1,
  },
  textSelected: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.Green.g400,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    color: '#B4BFCB',
  },
  itemContainer: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon24: { width: 24, height: 24 },
  icon54: { width: 54, height: 54 },
  activeTab: {},
});

export default HomeBottomView;
