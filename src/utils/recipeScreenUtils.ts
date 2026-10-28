import type {
  BackendMeal,
  MealPlanDestination,
  Recipe,
} from './types';
import { getLocalDateKey, getVietnamDateKey } from './dateUtils';

export const toRecipe = (meal: BackendMeal): Recipe => ({
  id: meal.id,
  name: meal.name,
  description: meal.description,
  image: meal.imageUrl ?? '',
  time: meal.prepTimeMinutes + meal.cookTimeMinutes,
  calories: meal.nutritionSummary?.perServing.calories ?? 0,
  protein: meal.nutritionSummary?.perServing.proteinG ?? 0,
  carbs: meal.nutritionSummary?.perServing.carbsG ?? 0,
  fat: meal.nutritionSummary?.perServing.fatG ?? 0,
  category: [meal.category],
  nutritionAvailable: meal.nutritionSummary !== null,
});

export const findRecipe = (
  recipeId: string,
  recipes: Recipe[],
  meals: BackendMeal[],
): Recipe | null => {
  const recipe = recipes.find(item => item.id === recipeId);
  if (recipe) return recipe;
  const meal = meals.find(item => item.id === recipeId);
  return meal ? toRecipe(meal) : null;
};

export const getMealPlanDateKey = (
  destination: MealPlanDestination,
  date = new Date(),
) => {
  return destination === 'PERSONAL'
    ? getLocalDateKey(date)
    : getVietnamDateKey(date);
};

export const formatMealPlanDateLabel = (date: string) =>
  new Date(`${date}T00:00:00.000Z`).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
