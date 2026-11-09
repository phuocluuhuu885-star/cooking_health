import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { memo, useCallback, useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaFrame } from 'react-native-safe-area-context';
import LinearGradient from '../../components/LinearGradient';
import { AppImage } from '../../abase/component';
import { colors } from '../../abase/constant';

type IProps = BottomTabBarProps & {};

const HomeBottomView = memo((props: IProps) => {
  const { insets, state, navigation } = props;
  const { width } = useSafeAreaFrame();

  const onTabPress = useCallback((tabId: number) => {
    const route = tabId;
    const event = navigation.emit({
      type: 'tabPress',
      target: state.routes[route].key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      navigation.navigate(state.routes[route].name, state.routes[route].params);
    }
  }, [navigation, state.routes]);

  const styleView = useMemo(
    () =>
      StyleSheet.create({
        container: {
          height: insets.bottom + 66,
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: insets.bottom + 8,
          backgroundColor: 'transparent',
        },
        containerStyle: {
          alignSelf: 'center',
          width: width - 32,
        },
      }),
    [insets.bottom, width],
  );

  return (
    <View style={styleView.container}>
      <View style={styleView.containerStyle}>
        <View style={styles.menuWrapper}>
          <LinearGradient
            colors={['#FFFFFF', '#F0F9F4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.menuBackground}
          />
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
            <ItemTab
              tabId={2}
              width={width}
              isSelected={state.index === 2}
              onPress={onTabPress}
            />
            <ItemTab
              tabId={3}
              width={width}
              isSelected={state.index === 3}
              onPress={onTabPress}
            />
            <ItemTab
              tabId={4}
              width={width}
              isSelected={state.index === 4}
              onPress={onTabPress}
            />
          </View>
        </View>
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
    const { onPress: onTabPress, tabId } = props;
    const itemInfo = useMemo(() => {
      return tabId === 0
        ? {
            icon: require('../../imgs/home/home.webp'),
            iconS: require('../../imgs/home/homeS.webp'),
            name: 'Trang chủ',
          }
        : tabId === 1
        ? {
            icon: require('../../imgs/home/book.webp'),
            iconS: require('../../imgs/home/bookS.webp'),
            name: 'Món ăn',
          }
        : tabId === 2
        ? {
            icon: require('../../imgs/home/iconS2.webp'),
            iconS: require('../../imgs/home/iconS2.webp'),
          }
        : tabId === 3
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
    }, [tabId]);

    const onPress = useCallback(() => {
      onTabPress(tabId);
    }, [onTabPress, tabId]);

    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={itemInfo.name || 'Sức khỏe'}
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
          <View
            style={[
              styles.healthIconWrapper,
              props.isSelected && styles.healthIconWrapperActive,
            ]}
          >
            <AppImage
              source={require('../../imgs/home/iconS2.webp')}
              style={[
                styles.healthIcon,
                props.isSelected && styles.healthIconActive,
              ]}
              resizeMode="contain"
            />
          </View>
        )}
      </TouchableOpacity>
    );
  },
);

const styles = StyleSheet.create({
  menuWrapper: {
    position: 'relative',
    overflow: 'visible',
    height: 58,
  },
  menuBackground: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 12,
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
  healthIconWrapper: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthIconWrapperActive: {
    width: 78,
    height: 78,
    shadowColor: '#183B29',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  healthIcon: { width: 58, height: 58 },
  healthIconActive: { width: 76, height: 76 },
  activeTab: {},
});

export default HomeBottomView;
