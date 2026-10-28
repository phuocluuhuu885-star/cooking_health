import type {
  ConsumptionReportData,
  MealPlanDestination,
  MealPlanResponse,
} from './meal';
import type { Household, HouseholdMealPlan } from './household';
import type { BackendMeal } from './recipe';

export type AppDataState = {
  ownerUserId: string | null;
  mealPlanDestination: MealPlanDestination;
  mealCatalog: BackendMeal[];
  mealCatalogLoaded: boolean;
  mealPlans: Record<string, NonNullable<MealPlanResponse['data']>>;
  household: Household | null;
  householdLoaded: boolean;
  householdMealPlans: Record<string, HouseholdMealPlan>;
  consumptionReports: Record<string, ConsumptionReportData>;
};

export type CacheUserPayload = {
  userId: string;
};

export type CacheMealCatalogPayload = CacheUserPayload & {
  meals: BackendMeal[];
};

export type CacheMealPlanPayload = CacheUserPayload & {
  date: string;
  mealPlan: NonNullable<MealPlanResponse['data']>;
};

export type CacheConsumptionReportPayload = CacheUserPayload & {
  key: string;
  report: ConsumptionReportData;
};

export type UpdateMealConsumptionPayload = CacheUserPayload & {
  plannedMealId: string;
  isConsumed: boolean;
  consumedAt: string | null;
};

export type InvalidateMealPlanPayload = CacheUserPayload & {
  date: string;
};

export type CacheHouseholdPayload = CacheUserPayload & {
  household: Household | null;
};

export type CacheHouseholdMealPlanPayload = CacheUserPayload & {
  householdId: string;
  date: string;
  mealPlan: HouseholdMealPlan;
};

export type InvalidateHouseholdMealPlanPayload = CacheUserPayload & {
  householdId: string;
  date: string;
};

export type InvalidateConsumptionReportsPayload = CacheUserPayload;
