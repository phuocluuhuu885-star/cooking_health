import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import HomeScreen from '../home/home';
import Profile from '../profile';
import HomeBottomView, {
  BOTTOM_TAB_AD_SLOT_HEIGHT,
  BOTTOM_TAB_BAR_HEIGHT,
} from './homeBottomView';
import { BANNER_SURFACE_COLOR } from '../component/TestBannerAd';
import Groceries from '../groceries';
import RecipeLibrary from '../recipes';
import { useSelector } from 'react-redux';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { useCallback, useEffect, useMemo, useState } from 'react';
import HealthProfile from '../profile/healthProfile';
import { createStateSetter } from '../../utils/stateUtils';
import HealthDashboardScreen from '../home/HealthDashboardScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PremiumModal from '../component/PremiumModal';
import {
  isPremiumWelcomePending,
  markPremiumWelcomeSeen,
} from '../../utils/premiumWelcome';

const screens = {
  HomeTab: HomeScreen,
  Recipes: RecipeLibrary,
  Health: HealthDashboardScreen,
  Groceries: Groceries,
  Profile: Profile,
};
const screenEntries = Object.entries(screens) as Array<
  [keyof typeof screens, (typeof screens)[keyof typeof screens]]
>;
const Tab = createBottomTabNavigator();

const HomeView = () => {
  const user = useSelector(selectUserInfo);
  const insets = useSafeAreaInsets();
  const [state, setState] = useState({
    visibleHealthProfile: false,
    visiblePremium: false,
    healthProfilePromptHandledForUserId: null as string | null,
  });
  const {
    visibleHealthProfile,
    visiblePremium,
    healthProfilePromptHandledForUserId,
  } = state;
  const setVisibleHealthProfile = useMemo(
    () => createStateSetter(setState, 'visibleHealthProfile'),
    [setState],
  );
  const setVisiblePremium = useMemo(
    () => createStateSetter(setState, 'visiblePremium'),
    [setState],
  );
  const setHealthProfilePromptHandledForUserId = useMemo(
    () => createStateSetter(setState, 'healthProfilePromptHandledForUserId'),
    [setState],
  );
  const closeHealthProfile = useCallback(
    () => {
      setVisibleHealthProfile(false);
      if (user?.id) {
        setHealthProfilePromptHandledForUserId(user.id);
      }
    },
    [setHealthProfilePromptHandledForUserId, setVisibleHealthProfile, user?.id],
  );
  const closePremium = useCallback(
    () => setVisiblePremium(false),
    [setVisiblePremium],
  );
  const renderTabBar = useCallback(
    (props: BottomTabBarProps) => <HomeBottomView {...props} />,
    [],
  );
  const renderScreen = useCallback(
    ([name, component]: (typeof screenEntries)[number]) => (
      <Tab.Screen
        key={name}
        name={name}
        component={component}
        initialParams={{ isTab: true }}
      />
    ),
    [],
  );

  useEffect(() => {
    setVisibleHealthProfile(Boolean(user?.accessToken && !user.healthProfile));
  }, [setVisibleHealthProfile, user?.accessToken, user?.healthProfile]);

  useEffect(() => {
    if (
      !user?.id ||
      !user.accessToken ||
      !isPremiumWelcomePending(user.id) ||
      visibleHealthProfile ||
      (!user.healthProfile &&
        healthProfilePromptHandledForUserId !== user.id)
    ) {
      return;
    }

    markPremiumWelcomeSeen(user.id);
    setVisiblePremium(true);
  }, [
    healthProfilePromptHandledForUserId,
    setVisiblePremium,
    user?.accessToken,
    user?.healthProfile,
    user?.id,
    visibleHealthProfile,
  ]);

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
      <PremiumModal visible={visiblePremium} onClose={closePremium} />
      <Tab.Navigator
        initialRouteName="HomeTab"
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            height:
              insets.bottom + BOTTOM_TAB_BAR_HEIGHT + BOTTOM_TAB_AD_SLOT_HEIGHT,
            backgroundColor: BANNER_SURFACE_COLOR,
            borderTopWidth: 0,
            borderBottomWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
        }}
        tabBar={renderTabBar}
      >
        {screenEntries.map(renderScreen)}
      </Tab.Navigator>
    </>
  );
};

export default HomeView;
