import type {
  HomeAggregatedIngredient,
  MealPeriod,
  RecipeDetailMeal,
} from './types';

export const aggregateMealIngredients = (
  meals: RecipeDetailMeal[],
): HomeAggregatedIngredient[] => {
  const ingredientTotals = new Map<string, HomeAggregatedIngredient>();

  meals.forEach(meal => {
    meal.groceryList.forEach(ingredient => {
      const normalizedName = ingredient.name.trim().toLocaleLowerCase();
      if (!normalizedName || !Number.isFinite(ingredient.amountG)) {
        return;
      }

      const existingIngredient = ingredientTotals.get(normalizedName);
      if (existingIngredient) {
        existingIngredient.amountG += ingredient.amountG;
        return;
      }

      ingredientTotals.set(normalizedName, {
        name: ingredient.name.trim(),
        amountG: ingredient.amountG,
      });
    });
  });

  return Array.from(ingredientTotals.values()).sort((first, second) =>
    first.name.localeCompare(second.name, 'vi'),
  );
};

export const getDefaultMealPeriod = (date: Date): MealPeriod => {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(date),
  );
  return hour >= 14 && hour < 23 ? 'DINNER' : 'LUNCH';
};

export const formatDateLabel = (dateKey: string) =>
  new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });

export const getApiError = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;
