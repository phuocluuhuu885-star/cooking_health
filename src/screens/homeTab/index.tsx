import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../home/home';
import Profile from '../profile';
import HomeBottomView from './homeBottomView';
import Groceries from '../groceries';
import RecipeLibrary from '../recipes';
import { useSelector } from 'react-redux';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { useEffect, useMemo, useState } from 'react';
import HealthProfile from '../profile/healthProfile';
import { createStateSetter } from '../../utils/stateUtils';

const screens = {
  HomeTab: HomeScreen,
  Recipes: RecipeLibrary,
  Groceries: Groceries,
  Profile: Profile,
};
const Tab = createBottomTabNavigator();

const HomeView = () => {
  // const user = useSelector(selectUserInfo);
  // console.log("dddd",user? user: '');
  const user = useSelector(selectUserInfo);
  const [state, setState] = useState({ visibleHealthProfile: false });
  const { visibleHealthProfile } = state;
  const setVisibleHealthProfile = useMemo(
    () => createStateSetter(setState, 'visibleHealthProfile'),
    [setState],
  );

  useEffect(() => {
    setVisibleHealthProfile(
      Boolean(user?.accessToken && !user.healthProfile),
    );
  }, [setVisibleHealthProfile, user?.accessToken, user?.healthProfile]);

  const onClose = () => {
    setVisibleHealthProfile(false);
  };
  return (
    <>
      {visibleHealthProfile && (
        <HealthProfile onClose={onClose} visible={visibleHealthProfile} />
      )}
      <Tab.Navigator
        initialRouteName="HomeTab"
        screenOptions={{
          headerShown: false,
        }}
        tabBar={props => <HomeBottomView {...props} />}
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
