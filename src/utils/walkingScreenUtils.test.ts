import type { DailyConsumedMeal } from './types/meal';
import { summarizeDailyCalorieIntake } from './walkingScreenUtils';

const createConsumedMeal = (
  calories: number | null,
): DailyConsumedMeal => ({
  id: `meal-${calories}`,
  mealId: `meal-${calories}`,
  name: 'Bữa ăn',
  imageUrl: null,
  mealPeriod: 'LUNCH',
  servings: 1,
  consumedAt: '2026-10-28T12:00:00.000Z',
  source: 'PERSONAL',
  nutrition:
    calories == null
      ? null
      : { calories, proteinG: 0, carbsG: 0, fatG: 0 },
});

describe('summarizeDailyCalorieIntake', () => {
  it('sums known calories and reports meals without nutrition data', () => {
    expect(
      summarizeDailyCalorieIntake([
        createConsumedMeal(320),
        createConsumedMeal(null),
        createConsumedMeal(180),
      ]),
    ).toEqual({ calories: 500, incompleteMeals: 1 });
  });

  it('does not report zero when all meal calories are unknown', () => {
    expect(summarizeDailyCalorieIntake([createConsumedMeal(null)])).toEqual({
      calories: null,
      incompleteMeals: 1,
    });
  });

  it('returns zero for a day with no consumed meals', () => {
    expect(summarizeDailyCalorieIntake([])).toEqual({
      calories: 0,
      incompleteMeals: 0,
    });
  });
});
