import type {
  HouseholdMealPlanResponse,
  MealPlanResponse,
  SkippedMealPeriod,
} from './types';

export const isHouseholdPlan = (
  plan:
    | NonNullable<MealPlanResponse['data']>
    | NonNullable<HouseholdMealPlanResponse['data']>,
): plan is NonNullable<HouseholdMealPlanResponse['data']> =>
  'householdId' in plan && typeof plan.householdId === 'string';

export const formatSkippedMealPeriods = (
  periods: SkippedMealPeriod[],
) =>
  periods
    .map(({ date, mealPeriod, reason }) => {
      const periodLabel = mealPeriod === 'LUNCH' ? 'bữa trưa' : 'bữa tối';
      const reasonLabel =
        reason === 'COMPLETED' ? 'đã hoàn tất' : 'đã có món';
      const [year, month, day] = date.split('-');
      return `${periodLabel} ngày ${day}/${month}/${year} (${reasonLabel})`;
    })
    .join('; ');
