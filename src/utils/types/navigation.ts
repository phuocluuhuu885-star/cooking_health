import type { StackScreenProps } from '@react-navigation/stack';
import ScreenKeys from '../screenKey';

export type RootStackParamList = {
  [ScreenKeys.HOMESCREEN]: { id: number } | undefined;
  [ScreenKeys.PRIVACY_POLICY]: { mode?: 'view' } | undefined;
  [ScreenKeys.LOGIN]: undefined;
  [ScreenKeys.RECIPE_DETAIL]: { mealId: string };
  [ScreenKeys.MEAL_REVIEWS]: { mealId: string; mealName: string };
  [ScreenKeys.WALKING]: undefined;
  [ScreenKeys.PERSONAL_INFO]: undefined;
  [ScreenKeys.FAMILY]:
    | { date?: string; mealPeriod?: 'LUNCH' | 'DINNER' }
    | undefined;
  [ScreenKeys.HOUSEHOLD_CHAT]: {
    householdId: string;
    householdName: string;
  };
  [ScreenKeys.NOTIFICATIONS]: undefined;
};

export type RecipeDetailScreenProps = StackScreenProps<
  RootStackParamList,
  typeof ScreenKeys.RECIPE_DETAIL
>;

export type MealReviewScreenProps = StackScreenProps<
  RootStackParamList,
  typeof ScreenKeys.MEAL_REVIEWS
>;
