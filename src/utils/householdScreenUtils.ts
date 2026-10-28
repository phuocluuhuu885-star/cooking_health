import type {
  HouseholdChatMessage,
  HouseholdMealPeriodPlan,
  HouseholdPlannedMeal,
  MealPeriod,
} from './types';
import { getVietnamDateKey } from './dateUtils';

export const getHouseholdDateKey = getVietnamDateKey;

export const getCurrentMealPeriod = (date = new Date()): MealPeriod => {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(date),
  );
  return hour < 12 ? 'LUNCH' : 'DINNER';
};

export const getMealPeriodSummary = (plan?: HouseholdMealPeriodPlan) => {
  if (!plan) return 'Chưa có thông tin';
  if (plan.isCompleted) return 'Bữa ăn đã hoàn thành';
  if (plan.isLocked) return 'Thực đơn đã cố định';
  if (plan.poll && !plan.poll.closedAt) {
    if (plan.poll.options.length === 0) return 'Chưa có món đề xuất';
    const pendingVotes = plan.poll.options.filter(
      option => option.myVote === null,
    ).length;
    return pendingVotes > 0
      ? `${pendingVotes} món chờ bạn bình chọn`
      : 'Bạn đã bình chọn';
  }
  return plan.items.length > 0
    ? `${plan.items.length} món trong thực đơn`
    : 'Chưa có món';
};

export const formatPollDeadline = (closesAt: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(closesAt));

export const getFinalizedMeals = (
  items: HouseholdMealPeriodPlan['items'],
  poll: HouseholdMealPeriodPlan['poll'],
): HouseholdPlannedMeal[] => {
  if (!poll?.closedAt) return items;
  const outcomes = new Map(
    poll.options.map(option => [option.mealId, option.outcome]),
  );
  return items.filter(
    item =>
      !outcomes.has(item.meal.id) || outcomes.get(item.meal.id) === 'ACCEPTED',
  );
};

export const formatHouseholdNotificationDate = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));

export const formatHouseholdChatTime = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));

export const mergeHouseholdMessages = (
  ...groups: HouseholdChatMessage[][]
) => {
  const unique = new Map<string, HouseholdChatMessage>();
  groups.flat().forEach(message => unique.set(message.id, message));
  return [...unique.values()].sort((first, second) => {
    const byDate =
      new Date(second.createdAt).getTime() -
      new Date(first.createdAt).getTime();
    return byDate || second.id.localeCompare(first.id);
  });
};

export const formatHouseholdShoppingAmount = (amountG: number) =>
  amountG >= 1000
    ? `${(amountG / 1000).toLocaleString('vi-VN', {
        maximumFractionDigits: 1,
      })} kg`
    : `${Math.round(amountG).toLocaleString('vi-VN')} g`;

export const getTodayMealDeadlineDate = getVietnamDateKey;

export const formatHouseholdDeadlineDateTime = (value: string) => {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map(({ type, value: partValue }) => [type, partValue]),
  );
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
};

export const getDefaultMealDeadlineSelection = (
  date: string,
  mealPeriod: MealPeriod,
  closesAt: string | null,
  defaultCloseTime: string,
) => {
  if (closesAt) {
    const currentDeadline = new Date(closesAt);
    if (currentDeadline.getTime() > Date.now()) {
      return formatHouseholdDeadlineDateTime(closesAt);
    }
  }
  const time = defaultCloseTime || (mealPeriod === 'LUNCH' ? '11:00' : '17:00');
  const today = getTodayMealDeadlineDate();
  const initialDate = date > today ? date : today;
  const proposed = new Date(`${initialDate}T${time}:00+07:00`);
  if (proposed.getTime() > Date.now()) {
    return { date: initialDate, time };
  }

  const tomorrow = new Date(`${initialDate}T00:00:00+07:00`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return {
    date: new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(tomorrow),
    time,
  };
};
