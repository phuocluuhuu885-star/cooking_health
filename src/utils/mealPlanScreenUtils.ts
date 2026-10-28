import type {
  HouseholdMealPlanResponse,
  MealPlanResponse,
} from './types';

export const isHouseholdPlan = (
  plan:
    | NonNullable<MealPlanResponse['data']>
    | NonNullable<HouseholdMealPlanResponse['data']>,
): plan is NonNullable<HouseholdMealPlanResponse['data']> =>
  'householdId' in plan && typeof plan.householdId === 'string';
