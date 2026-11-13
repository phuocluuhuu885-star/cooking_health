import type { StackScreenProps } from '@react-navigation/stack';
import ScreenKeys from '../screenKey';

export type RootStackParamList = {
  [ScreenKeys.HOMESCREEN]: { id: number } | undefined;
  [ScreenKeys.PRIVACY_POLICY]: { mode?: 'view' } | undefined;
  [ScreenKeys.LOGIN]: undefined;
  [ScreenKeys.RECIPE_DETAIL]: { mealId: string };
  [ScreenKeys.MEAL_REVIEWS]: { mealId: string; mealName: string };
  [ScreenKeys.COMMUNITY_MEALS]: undefined;
  [ScreenKeys.COMMUNITY_CREATOR_MEALS]: {
    creatorId: string;
    creatorName: string;
    creatorAvatar: string | null;
  };
  [ScreenKeys.SHARE_COMMUNITY_MEAL]: undefined;
  [ScreenKeys.COMMUNITY_MEAL_DETAIL]: { mealId: string };
  [ScreenKeys.WALKING]: undefined;
  [ScreenKeys.PERSONAL_INFO]: { section?: 'BASIC' | 'PASSWORD' } | undefined;
  [ScreenKeys.DAILY_CONSUMED_MEALS]: undefined;
  [ScreenKeys.AI_MEAL_RECOMMENDATIONS]: undefined;
  [ScreenKeys.AI_MEAL_CHAT]: undefined;
  [ScreenKeys.AI_MEAL_SCAN]: undefined;
  [ScreenKeys.WEEKLY_MEAL_PLAN]: undefined;
  [ScreenKeys.EATING_PROGRESS]: undefined;
  [ScreenKeys.SMART_SHOPPING]: undefined;
  [ScreenKeys.DAILY_PLANNED_MEALS]: { date: string };
  [ScreenKeys.FAMILY]:
    | { date?: string; mealPeriod?: 'LUNCH' | 'DINNER' }
    | undefined;
  [ScreenKeys.HOUSEHOLD_HEALTH]: { memberId?: string } | undefined;
  [ScreenKeys.HOUSEHOLD_CHAT]: {
    householdId: string;
    householdName: string;
  };
  [ScreenKeys.NOTIFICATIONS]: undefined;
  [ScreenKeys.HEALTH_DASHBOARD]: undefined;
  [ScreenKeys.EXPENSES]: undefined;
  [ScreenKeys.EXPENSE_REPORT]: undefined;
};

export type RecipeDetailScreenProps = StackScreenProps<
  RootStackParamList,
  typeof ScreenKeys.RECIPE_DETAIL
>;

export type MealReviewScreenProps = StackScreenProps<
  RootStackParamList,
  typeof ScreenKeys.MEAL_REVIEWS
>;
