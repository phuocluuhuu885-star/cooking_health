import type { DailyConsumedMeal } from './types/meal';

export type WalkingSummaryPeriod = 'DAY' | 'WEEK' | 'MONTH';

export const summarizeDailyCalorieIntake = (items: DailyConsumedMeal[]) => {
  const summary = items.reduce(
    (totals, item) => {
      const calories = item.nutrition?.calories;
      if (calories == null || !Number.isFinite(calories) || calories < 0) {
        totals.incompleteMeals += 1;
      } else {
        totals.calories += calories;
        totals.mealsWithCalories += 1;
      }
      return totals;
    },
    { calories: 0, incompleteMeals: 0, mealsWithCalories: 0 },
  );
  return {
    calories:
      summary.mealsWithCalories > 0 || items.length === 0
        ? summary.calories
        : null,
    incompleteMeals: summary.incompleteMeals,
  };
};

export const getWalkingPeriodRange = (
  period: WalkingSummaryPeriod,
  now = new Date(),
) => {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  if (period === 'WEEK') {
    const daysFromMonday = (from.getDay() + 6) % 7;
    from.setDate(from.getDate() - daysFromMonday);
  } else if (period === 'MONTH') {
    from.setDate(1);
  }
  const to = new Date(from);
  if (period === 'DAY') {
    to.setDate(to.getDate() + 1);
  } else if (period === 'WEEK') {
    to.setDate(to.getDate() + 7);
  } else {
    to.setMonth(to.getMonth() + 1);
  }
  return { from: from.toISOString(), to: to.toISOString() };
};

export const formatWalkingDuration = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours.toString().padStart(2, '0')}:${remainingMinutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${remainingMinutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`;
};

export const formatWorkoutDate = (date: string) =>
  new Date(date).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
