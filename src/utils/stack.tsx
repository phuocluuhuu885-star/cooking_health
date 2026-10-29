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
import DailyConsumedMealsScreen from '../screens/profile/DailyConsumedMealsScreen';
import AiMealRecommendationsScreen from '../screens/home/AiMealRecommendationsScreen';
import WeeklyMealPlanScreen from '../screens/home/WeeklyMealPlanScreen';
import EatingProgressScreen from '../screens/home/EatingProgressScreen';
import SmartShoppingScreen from '../screens/home/SmartShoppingScreen';
import DailyPlannedMealsScreen from '../screens/home/DailyPlannedMealsScreen';

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
    [ScreenKeys.DAILY_CONSUMED_MEALS]: DailyConsumedMealsScreen,
    [ScreenKeys.AI_MEAL_RECOMMENDATIONS]: AiMealRecommendationsScreen,
    [ScreenKeys.WEEKLY_MEAL_PLAN]: WeeklyMealPlanScreen,
    [ScreenKeys.EATING_PROGRESS]: EatingProgressScreen,
    [ScreenKeys.SMART_SHOPPING]: SmartShoppingScreen,
    [ScreenKeys.DAILY_PLANNED_MEALS]: DailyPlannedMealsScreen,
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
