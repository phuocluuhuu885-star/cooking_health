import type { GlobalState } from '../src/type/global';
import type {
  BackendMeal,
  ConsumptionReportData,
  Household,
  HouseholdMealPlan,
  MealPlanResponse,
} from '../src/utils/types';
import appDataReducer, {
  appendMealCatalog,
  cacheConsumptionReport,
  cacheCurrentHousehold,
  cacheHouseholdMealPlan,
  cacheMealCatalog,
  cacheMealPlan,
  selectConsumptionReport,
  selectCurrentHousehold,
  selectHouseholdMealPlan,
  selectMealCatalog,
  selectMealPlanForDate,
  updateCachedMealConsumption,
} from '../src/reduxs/reduces/appData';
import { logOutUser, setUserInfo } from '../src/reduxs/reduces/user';

const firstMeal: BackendMeal = {
  id: 'meal-1',
  name: 'Món thứ nhất',
  imageUrl: null,
  category: 'LUNCH',
  prepTimeMinutes: 5,
  cookTimeMinutes: 10,
  nutritionSummary: null,
};

const secondMeal: BackendMeal = {
  ...firstMeal,
  id: 'meal-2',
  name: 'Món thứ hai',
};

const mealPlan: NonNullable<MealPlanResponse['data']> = {
  date: '2026-10-22',
  meals: {
    LUNCH: {
      items: [
        {
          id: 'planned-meal-1',
          servings: 1,
          meal: {
            id: firstMeal.id,
            name: firstMeal.name,
            description: null,
            imageUrl: null,
            category: 'LUNCH',
          },
          nutritionSummary: null,
          isConsumed: false,
          consumedAt: null,
        },
      ],
      nutritionSummary: {
        calories: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
      },
      unavailableNutritionItems: 1,
    },
    DINNER: {
      items: [],
      nutritionSummary: {
        calories: 0,
        proteinG: 0,
        carbsG: 0,
        fatG: 0,
      },
      unavailableNutritionItems: 0,
    },
  },
};

const report: ConsumptionReportData = {
  period: 'WEEK',
  startDate: '2026-10-19',
  endDate: '2026-10-25',
  totals: {
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  },
  unavailableNutritionItems: 0,
  days: [],
};

const household: Household = {
  id: 'household-1',
  name: 'Gia đình MealCraft',
  currentMemberId: 'user-1',
  currentRole: 'ADMIN',
  members: [],
  createdAt: '',
  updatedAt: '',
};

const householdMealPlan: HouseholdMealPlan = {
  ...mealPlan,
  householdId: household.id,
  meals: {
    LUNCH: toHouseholdPeriod(mealPlan.meals.LUNCH.items),
    DINNER: toHouseholdPeriod(mealPlan.meals.DINNER.items),
  },
};

function toHouseholdPeriod(
  items: NonNullable<MealPlanResponse['data']>['meals']['LUNCH']['items'],
) {
  return {
    items: items.map(item => ({
      ...item,
      addedBy: { id: 'user-1', fullName: 'user-1' },
      consumedBy: null,
    })),
    nutritionSummary: {
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
    },
    unavailableNutritionItems: items.length,
  };
}

const rootState = (
  appData: ReturnType<typeof appDataReducer>,
  userId: string | null,
): GlobalState => ({
  appData,
  user: {
    loginUserInfo: userId
      ? {
          id: userId,
          email: `${userId}@example.com`,
          fullName: userId,
          accessToken: `${userId}-token`,
          createdAt: '',
          updatedAt: '',
        }
      : null,
  },
});

test('caches shared data and updates consumed meals only after a matching user action', () => {
  let state = appDataReducer(
    undefined,
    cacheMealCatalog({ userId: 'user-1', meals: [firstMeal] }),
  );
  state = appDataReducer(
    state,
    appendMealCatalog({
      userId: 'user-1',
      meals: [firstMeal, secondMeal],
    }),
  );
  state = appDataReducer(
    state,
    cacheMealPlan({
      userId: 'user-1',
      date: mealPlan.date,
      mealPlan,
    }),
  );
  state = appDataReducer(
    state,
    cacheConsumptionReport({
      userId: 'user-1',
      key: 'WEEK:2026-10-22',
      report,
    }),
  );

  expect(selectMealCatalog(rootState(state, 'user-1'))).toEqual([
    firstMeal,
    secondMeal,
  ]);

  state = appDataReducer(
    state,
    updateCachedMealConsumption({
      userId: 'other-user',
      plannedMealId: 'planned-meal-1',
      isConsumed: true,
      consumedAt: '2026-10-22T10:00:00.000Z',
    }),
  );
  expect(
    selectMealPlanForDate(rootState(state, 'user-1'), mealPlan.date)?.meals
      .LUNCH.items[0].isConsumed,
  ).toBe(false);

  state = appDataReducer(
    state,
    updateCachedMealConsumption({
      userId: 'user-1',
      plannedMealId: 'planned-meal-1',
      isConsumed: true,
      consumedAt: '2026-10-22T10:00:00.000Z',
    }),
  );

  expect(
    selectMealPlanForDate(rootState(state, 'user-1'), mealPlan.date)?.meals
      .LUNCH.items[0],
  ).toMatchObject({
    isConsumed: true,
    consumedAt: '2026-10-22T10:00:00.000Z',
  });
  expect(
    selectConsumptionReport(rootState(state, 'user-1'), 'WEEK:2026-10-22'),
  ).toBeNull();
});

test('clears cached account data when switching users or logging out', () => {
  let state = appDataReducer(
    undefined,
    cacheMealCatalog({ userId: 'user-1', meals: [firstMeal] }),
  );

  state = appDataReducer(
    state,
    setUserInfo({
      id: 'user-2',
      email: 'user-2@example.com',
      fullName: 'user-2',
      accessToken: 'user-2-token',
      createdAt: '',
      updatedAt: '',
    }),
  );
  expect(state.ownerUserId).toBeNull();
  expect(state.mealCatalog).toEqual([]);

  state = appDataReducer(
    state,
    cacheMealCatalog({ userId: 'user-2', meals: [secondMeal] }),
  );
  state = appDataReducer(state, logOutUser());
  expect(state.ownerUserId).toBeNull();
  expect(state.mealCatalogLoaded).toBe(false);
});

test('scopes household plans to the active household and clears them on leaving', () => {
  let state = appDataReducer(
    undefined,
    cacheCurrentHousehold({ userId: 'user-1', household }),
  );
  state = appDataReducer(
    state,
    cacheHouseholdMealPlan({
      userId: 'user-1',
      householdId: household.id,
      date: householdMealPlan.date,
      mealPlan: householdMealPlan,
    }),
  );

  expect(selectCurrentHousehold(rootState(state, 'user-1'))).toEqual(household);
  expect(
    selectHouseholdMealPlan(
      rootState(state, 'user-1'),
      household.id,
      householdMealPlan.date,
    ),
  ).toEqual(householdMealPlan);

  state = appDataReducer(
    state,
    cacheCurrentHousehold({ userId: 'user-1', household: null }),
  );
  expect(selectCurrentHousehold(rootState(state, 'user-1'))).toBeNull();
  expect(
    selectHouseholdMealPlan(
      rootState(state, 'user-1'),
      household.id,
      householdMealPlan.date,
    ),
  ).toBeNull();
});
