import ScreenKeys from './screenKey';
import { createStackNavigator } from '@react-navigation/stack';
import PrivacyPolicyScreen from '../screens/privacyPolicy';
import HomeView from '../screens/homeTab';
import Login from '../screens/login';
import RecipeDetail from '../screens/recipes/recipeDetail';
import MealReviewsScreen from '../screens/recipes/MealReviewsScreen';
import type { RootStackParamList } from './types/navigation';
import HouseholdScreen from '../screens/household';
import HouseholdChatScreen from '../screens/household/HouseholdChatScreen';
import HouseholdNotificationsScreen from '../screens/household/HouseholdNotificationsScreen';
import WalkingScreen from '../screens/walking/WalkingScreen';
import PersonalInfoScreen from '../screens/profile/PersonalInfoScreen';

const HomeStack = createStackNavigator<RootStackParamList>({
  initialRouteName: ScreenKeys.PRIVACY_POLICY,
  screens: {
    [ScreenKeys.HOMESCREEN]: HomeView,
    [ScreenKeys.PRIVACY_POLICY]: PrivacyPolicyScreen,
    [ScreenKeys.LOGIN]: Login,
    [ScreenKeys.RECIPE_DETAIL]: RecipeDetail,
    [ScreenKeys.MEAL_REVIEWS]: MealReviewsScreen,
    [ScreenKeys.WALKING]: WalkingScreen,
    [ScreenKeys.PERSONAL_INFO]: PersonalInfoScreen,
    [ScreenKeys.FAMILY]: HouseholdScreen,
    [ScreenKeys.HOUSEHOLD_CHAT]: HouseholdChatScreen,
    [ScreenKeys.NOTIFICATIONS]: HouseholdNotificationsScreen,
  },
  screenOptions: {
    headerShown: false,
  },
});

const StackScreen = createStackNavigator({
  groups: {
    Home: {
      screens: {
        App: HomeStack,
      },
      screenOptions: {
        headerShown: false,
      },
    },
    // Modal: {
    //     screenOptions: {
    //         presentation: "transparentModal",
    //         headerShown: false,
    //     },
    //     screens: {
    //         [ScreenKeys.HOMESCREEN]: HomeScreen,
    //     },
    // },
  },
});

export default StackScreen;
