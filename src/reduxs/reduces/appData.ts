import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { GlobalState } from '../../type/global';
import type { ConsumptionReportData } from '../../utils/types';
import type {
  AppDataState,
  CacheConsumptionReportPayload,
  CacheMealCatalogPayload,
  CacheMealPlanPayload,
  CacheHouseholdPayload,
  CacheHouseholdMealPlanPayload,
  InvalidateConsumptionReportsPayload,
  InvalidateHouseholdMealPlanPayload,
  InvalidateMealPlanPayload,
  UpdateMealConsumptionPayload,
} from '../../utils/types/appData';
import { logOutUser, setUserInfo } from './user';

const initialState: AppDataState = {
  ownerUserId: null,
  mealPlanDestination: 'PERSONAL',
  mealCatalog: [],
  mealCatalogLoaded: false,
  mealPlans: {},
  household: null,
  householdLoaded: false,
  householdMealPlans: {},
  consumptionReports: {},
};

const householdPlanKey = (householdId: string, date: string) =>
  `${householdId}:${date}`;

const appDataSlice = createSlice({
  name: 'appData',
  initialState,
  reducers: {
    setMealPlanDestination: (
      state,
      action: PayloadAction<{
        userId: string;
        destination: AppDataState['mealPlanDestination'];
      }>,
    ) => {
      const { userId, destination } = action.payload;
      if (state.ownerUserId && state.ownerUserId !== userId) {
        Object.assign(state, initialState);
      }
      state.ownerUserId = userId;
      state.mealPlanDestination = destination;
    },
    cacheMealCatalog: (
      state,
      action: PayloadAction<CacheMealCatalogPayload>,
    ) => {
      const { userId, meals } = action.payload;
      if (state.ownerUserId && state.ownerUserId !== userId) {
        Object.assign(state, initialState);
      }
      state.ownerUserId = userId;
      state.mealCatalog = meals;
      state.mealCatalogLoaded = true;
    },
    appendMealCatalog: (
      state,
      action: PayloadAction<CacheMealCatalogPayload>,
    ) => {
      const { userId, meals } = action.payload;
      if (state.ownerUserId && state.ownerUserId !== userId) {
        Object.assign(state, initialState);
      }
      state.ownerUserId = userId;
      const mealIds = new Set(state.mealCatalog.map(meal => meal.id));
      meals.forEach(meal => {
        if (!mealIds.has(meal.id)) {
          mealIds.add(meal.id);
          state.mealCatalog.push(meal);
        }
      });
      state.mealCatalogLoaded = true;
    },
    cacheMealPlan: (state, action: PayloadAction<CacheMealPlanPayload>) => {
      const { userId, date, mealPlan } = action.payload;
      if (state.ownerUserId && state.ownerUserId !== userId) {
        Object.assign(state, initialState);
      }
      state.ownerUserId = userId;
      state.mealPlans[date] = mealPlan;
    },
    cacheConsumptionReport: (
      state,
      action: PayloadAction<CacheConsumptionReportPayload>,
    ) => {
      const { userId, key, report } = action.payload;
      if (state.ownerUserId && state.ownerUserId !== userId) {
        Object.assign(state, initialState);
      }
      state.ownerUserId = userId;
      state.consumptionReports[key] = report;
    },
    cacheCurrentHousehold: (
      state,
      action: PayloadAction<CacheHouseholdPayload>,
    ) => {
      const { userId, household } = action.payload;
      if (state.ownerUserId && state.ownerUserId !== userId) {
        Object.assign(state, initialState);
      }
      if (state.household?.id !== household?.id) {
        state.householdMealPlans = {};
      }
      state.ownerUserId = userId;
      state.household = household;
      state.householdLoaded = true;
    },
    cacheHouseholdMealPlan: (
      state,
      action: PayloadAction<CacheHouseholdMealPlanPayload>,
    ) => {
      const { userId, householdId, date, mealPlan } = action.payload;
      if (state.ownerUserId && state.ownerUserId !== userId) {
        Object.assign(state, initialState);
      }
      state.ownerUserId = userId;
      state.householdMealPlans[householdPlanKey(householdId, date)] = mealPlan;
    },
    updateCachedMealConsumption: (
      state,
      action: PayloadAction<UpdateMealConsumptionPayload>,
    ) => {
      const { userId, plannedMealId, isConsumed, consumedAt } = action.payload;
      if (state.ownerUserId !== userId) {
        return;
      }
      Object.values(state.mealPlans).forEach(plan => {
        (['LUNCH', 'DINNER'] as const).forEach(period => {
          plan.meals[period].items.forEach(meal => {
            if (meal.id === plannedMealId) {
              meal.isConsumed = isConsumed;
              meal.consumedAt = consumedAt;
            }
          });
        });
      });
      Object.values(state.householdMealPlans).forEach(plan => {
        (['LUNCH', 'DINNER'] as const).forEach(period => {
          plan.meals[period].items.forEach(meal => {
            if (meal.id === plannedMealId) {
              meal.isConsumed = isConsumed;
              meal.consumedAt = consumedAt;
            }
          });
        });
      });
      state.consumptionReports = {};
    },
    invalidateCachedMealPlan: (
      state,
      action: PayloadAction<InvalidateMealPlanPayload>,
    ) => {
      const { userId, date } = action.payload;
      if (state.ownerUserId === userId) {
        delete state.mealPlans[date];
      }
    },
    invalidateCachedHouseholdMealPlan: (
      state,
      action: PayloadAction<InvalidateHouseholdMealPlanPayload>,
    ) => {
      const { userId, householdId, date } = action.payload;
      if (state.ownerUserId === userId) {
        delete state.householdMealPlans[householdPlanKey(householdId, date)];
      }
    },
    invalidateCachedConsumptionReports: (
      state,
      action: PayloadAction<InvalidateConsumptionReportsPayload>,
    ) => {
      if (state.ownerUserId === action.payload.userId) {
        state.consumptionReports = {};
      }
    },
    clearCachedAppData: () => initialState,
  },
  extraReducers: builder => {
    builder
      .addCase(setUserInfo, (state, action) => {
        if (state.ownerUserId && state.ownerUserId !== action.payload.id) {
          return initialState;
        }
        return state;
      })
      .addCase(logOutUser, () => initialState);
  },
});

export const {
  setMealPlanDestination,
  cacheMealCatalog,
  appendMealCatalog,
  cacheMealPlan,
  cacheConsumptionReport,
  cacheCurrentHousehold,
  cacheHouseholdMealPlan,
  updateCachedMealConsumption,
  invalidateCachedMealPlan,
  invalidateCachedHouseholdMealPlan,
  invalidateCachedConsumptionReports,
  clearCachedAppData,
} = appDataSlice.actions;

export const selectMealCatalog = (state: GlobalState) =>
  state.appData.ownerUserId === (state.user.loginUserInfo?.id ?? 'guest')
    ? state.appData.mealCatalog
    : [];

export const selectMealCatalogLoaded = (state: GlobalState) =>
  state.appData.ownerUserId === (state.user.loginUserInfo?.id ?? 'guest') &&
  state.appData.mealCatalogLoaded;

export const selectMealPlanForDate = (state: GlobalState, date: string) =>
  state.appData.ownerUserId === (state.user.loginUserInfo?.id ?? 'guest')
    ? state.appData.mealPlans[date] ?? null
    : null;

export const selectMealPlanDestination = (state: GlobalState) =>
  state.appData.ownerUserId === (state.user.loginUserInfo?.id ?? 'guest')
    ? state.appData.mealPlanDestination
    : 'PERSONAL';

export const selectConsumptionReport = (state: GlobalState, key: string) =>
  state.appData.ownerUserId === (state.user.loginUserInfo?.id ?? 'guest')
    ? state.appData.consumptionReports[key] ?? null
    : null;

export const selectCurrentHousehold = (state: GlobalState) =>
  state.appData.ownerUserId === (state.user.loginUserInfo?.id ?? 'guest')
    ? state.appData.household
    : null;

export const selectHouseholdLoaded = (state: GlobalState) =>
  state.appData.ownerUserId === (state.user.loginUserInfo?.id ?? 'guest') &&
  state.appData.householdLoaded;

export const selectHouseholdMealPlan = (
  state: GlobalState,
  householdId: string,
  date: string,
) =>
  state.appData.ownerUserId === (state.user.loginUserInfo?.id ?? 'guest')
    ? state.appData.householdMealPlans[householdPlanKey(householdId, date)] ??
      null
    : null;

export const getConsumptionReportCacheKey = (
  period: ConsumptionReportData['period'],
  date: string,
) => `${period}:${date}`;

export default appDataSlice.reducer;
