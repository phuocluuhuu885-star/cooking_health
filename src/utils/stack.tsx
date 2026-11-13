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
import AiMealChatScreen from '../screens/home/AiMealChatScreen';
import AiMealScanScreen from '../screens/home/AiMealScanScreen';
import WeeklyMealPlanScreen from '../screens/home/WeeklyMealPlanScreen';
import EatingProgressScreen from '../screens/home/EatingProgressScreen';
import SmartShoppingScreen from '../screens/home/SmartShoppingScreen';
import DailyPlannedMealsScreen from '../screens/home/DailyPlannedMealsScreen';
import HealthDashboardScreen from '../screens/home/HealthDashboardScreen';
import ExpenseManagementScreen from '../screens/profile/ExpenseManagementScreen';
import ExpenseReportScreen from '../screens/profile/ExpenseReportScreen';
import HouseholdHealthScreen from '../screens/household/HouseholdHealthScreen';
import CommunityMealsScreen from '../screens/community/CommunityMealsScreen';
import CommunityCreatorMealsScreen from '../screens/community/CommunityCreatorMealsScreen';
import ShareCommunityMealScreen from '../screens/community/ShareCommunityMealScreen';
import CommunityMealDetailScreen from '../screens/community/CommunityMealDetailScreen';

const HomeStack = createStackNavigator<RootStackParamList>({
  initialRouteName: ScreenKeys.PRIVACY_POLICY,
  screens: {
    [ScreenKeys.HOMESCREEN]: HomeView,
    [ScreenKeys.PRIVACY_POLICY]: PrivacyPolicyScreen,
    [ScreenKeys.LOGIN]: Login,
    [ScreenKeys.RECIPE_DETAIL]: RecipeDetail,
    [ScreenKeys.MEAL_REVIEWS]: MealReviewsScreen,
    [ScreenKeys.COMMUNITY_MEALS]: CommunityMealsScreen,
    [ScreenKeys.COMMUNITY_CREATOR_MEALS]: CommunityCreatorMealsScreen,
    [ScreenKeys.SHARE_COMMUNITY_MEAL]: ShareCommunityMealScreen,
    [ScreenKeys.COMMUNITY_MEAL_DETAIL]: CommunityMealDetailScreen,
    [ScreenKeys.WALKING]: WalkingScreen,
    [ScreenKeys.PERSONAL_INFO]: PersonalInfoScreen,
    [ScreenKeys.DAILY_CONSUMED_MEALS]: DailyConsumedMealsScreen,
    [ScreenKeys.AI_MEAL_RECOMMENDATIONS]: AiMealRecommendationsScreen,
    [ScreenKeys.AI_MEAL_CHAT]: AiMealChatScreen,
    [ScreenKeys.AI_MEAL_SCAN]: AiMealScanScreen,
    [ScreenKeys.WEEKLY_MEAL_PLAN]: WeeklyMealPlanScreen,
    [ScreenKeys.EATING_PROGRESS]: EatingProgressScreen,
    [ScreenKeys.SMART_SHOPPING]: SmartShoppingScreen,
    [ScreenKeys.DAILY_PLANNED_MEALS]: DailyPlannedMealsScreen,
    [ScreenKeys.FAMILY]: HouseholdScreen,
    [ScreenKeys.HOUSEHOLD_HEALTH]: HouseholdHealthScreen,
    [ScreenKeys.HOUSEHOLD_CHAT]: HouseholdChatScreen,
    [ScreenKeys.NOTIFICATIONS]: HouseholdNotificationsScreen,
    [ScreenKeys.HEALTH_DASHBOARD]: HealthDashboardScreen,
    [ScreenKeys.EXPENSES]: ExpenseManagementScreen,
    [ScreenKeys.EXPENSE_REPORT]: ExpenseReportScreen,
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
