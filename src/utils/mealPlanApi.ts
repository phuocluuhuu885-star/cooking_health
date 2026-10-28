import apiConst from '../abase/constant/apiConst';
import type { UserInfo } from '../type/user';
import type {
  DailyConsumedMealsResponse,
  MealCompletionResponse,
  MealPeriod,
  MealPlanDestination,
} from './types';
import { setSyncUser, syncApi } from './syncUtils';

export type AddMealToPlanResponse = {
  success?: boolean;
  message?: string;
  data?: {
    addedDirectlyToPlan?: boolean;
  };
};

export const addMealToPlan = async (
  user: UserInfo,
  destination: MealPlanDestination,
  data: {
    mealId: string;
    date: string;
    mealPeriod: MealPeriod;
  },
) => {
  setSyncUser(user);
  return (await syncApi(
    destination === 'HOUSEHOLD'
      ? apiConst.addMealToHouseholdPlan
      : apiConst.addMealToPlan,
    { ...data, servings: 1 },
  )) as AddMealToPlanResponse;
};

export const completeMealPeriod = async (
  user: UserInfo,
  destination: MealPlanDestination,
  data: { date: string; mealPeriod: MealPeriod },
): Promise<MealCompletionResponse> => {
  setSyncUser(user);
  return (await syncApi(
    destination === 'HOUSEHOLD'
      ? apiConst.completeHouseholdMealPeriod
      : apiConst.completeMealPeriod,
    data,
  )) as MealCompletionResponse;
};

export const getDailyConsumedMeals = async (
  user: UserInfo,
  date: string,
): Promise<DailyConsumedMealsResponse> => {
  setSyncUser(user);
  return (await syncApi(apiConst.getDailyConsumedMeals, {
    date,
  })) as DailyConsumedMealsResponse;
};
