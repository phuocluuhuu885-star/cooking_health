import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import HomeScreen from '../home/home';
import Profile from '../profile';
import HomeBottomView from './homeBottomView';
import Groceries from '../groceries';
import RecipeLibrary from '../recipes';
import { useSelector } from 'react-redux';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { useCallback, useEffect, useMemo, useState } from 'react';
import HealthProfile from '../profile/healthProfile';
import { createStateSetter } from '../../utils/stateUtils';
import HealthDashboardScreen from '../home/HealthDashboardScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const screens = {
  HomeTab: HomeScreen,
  Recipes: RecipeLibrary,
  Health: HealthDashboardScreen,
  Groceries: Groceries,
  Profile: Profile,
};
const Tab = createBottomTabNavigator();

const HomeView = () => {
  const user = useSelector(selectUserInfo);
  const insets = useSafeAreaInsets();
  const [state, setState] = useState({ visibleHealthProfile: false });
  const { visibleHealthProfile } = state;
  const setVisibleHealthProfile = useMemo(
    () => createStateSetter(setState, 'visibleHealthProfile'),
    [setState],
  );
  const closeHealthProfile = useMemo(
    () => () => setVisibleHealthProfile(false),
    [setVisibleHealthProfile],
  );
  const renderTabBar = useCallback(
    (props: BottomTabBarProps) => <HomeBottomView {...props} />,
    [],
  );

  useEffect(() => {
    setVisibleHealthProfile(Boolean(user?.accessToken && !user.healthProfile));
  }, [setVisibleHealthProfile, user?.accessToken, user?.healthProfile]);

  if (!user?.accessToken) {
    return <RecipeLibrary />;
  }

  return (
    <>
      {visibleHealthProfile && (
        <HealthProfile
          onClose={closeHealthProfile}
          visible={visibleHealthProfile}
        />
      )}
      <Tab.Navigator
        initialRouteName="HomeTab"
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            height: insets.bottom + 66,
            backgroundColor: 'transparent',
            borderTopWidth: 0,
          },
        }}
        tabBar={renderTabBar}
      >
        {Object.entries(screens).map(([name, component]) => (
          <Tab.Screen
            key={name}
            name={name}
            component={component}
            initialParams={{ isTab: true }}
          />
        ))}
      </Tab.Navigator>
    </>
  );
};

export default HomeView;
