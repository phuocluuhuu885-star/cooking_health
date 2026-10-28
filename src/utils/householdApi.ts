import apiConst from '../abase/constant/apiConst';
import type { UserInfo } from '../type/user';
import type {
  HouseholdMealPlanResponse,
  HouseholdMealVoteResponse,
  HouseholdResponse,
  MealPeriod,
} from './types';
import { setSyncUser, syncApi } from './syncUtils';

export const fetchCurrentHousehold = async (
  user: UserInfo,
): Promise<HouseholdResponse> => {
  setSyncUser(user);
  return (await syncApi(apiConst.getCurrentHousehold)) as HouseholdResponse;
};

export const fetchHouseholdMealPlan = async (
  user: UserInfo,
  date: string,
): Promise<HouseholdMealPlanResponse> => {
  setSyncUser(user);
  return (await syncApi(apiConst.getHouseholdMealPlan, {
    date,
  })) as HouseholdMealPlanResponse;
};

export const voteForHouseholdMeal = async (
  user: UserInfo,
  data: {
    mealId: string;
    date: string;
    mealPeriod: MealPeriod;
    agrees: boolean;
  },
): Promise<HouseholdMealVoteResponse> => {
  setSyncUser(user);
  return (await syncApi(
    apiConst.voteForHouseholdMeal,
    data,
  )) as HouseholdMealVoteResponse;
};

export const updateHouseholdMealPollDeadline = async (
  user: UserInfo,
  data: {
    date: string;
    mealPeriod: MealPeriod;
    closesAt: string;
  },
): Promise<{
  success: boolean;
  message?: string;
  data?: {
    date: string;
    mealPeriod: MealPeriod;
    closesAt: string;
    defaultCloseTime: string;
    currentPollUpdated: boolean;
  };
}> => {
  setSyncUser(user);
  return (await syncApi(apiConst.updateHouseholdMealPollDeadline, data)) as {
    success: boolean;
    message?: string;
    data?: {
      date: string;
      mealPeriod: MealPeriod;
      closesAt: string;
      defaultCloseTime: string;
      currentPollUpdated: boolean;
    };
  };
};
