import type { MealPeriod } from './meal';

export type ExpenseScope = 'PERSONAL' | 'HOUSEHOLD';
export type ExpenseSource = 'MANUAL' | 'MEAL';
export type ExpenseCategory =
  | 'FOOD'
  | 'SHOPPING'
  | 'TRANSPORT'
  | 'HOUSEHOLD'
  | 'HEALTH'
  | 'ENTERTAINMENT'
  | 'OTHER';
export type IncomeCategory =
  | 'SALARY'
  | 'BUSINESS'
  | 'INVESTMENT'
  | 'GIFT'
  | 'OTHER';

export type Expense = {
  id: string;
  scope: ExpenseScope;
  source: ExpenseSource;
  category: ExpenseCategory;
  title: string;
  amountVnd: number;
  expenseDate: string;
  note: string | null;
  mealId: string | null;
  mealName: string | null;
  mealPeriod: MealPeriod | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Income = {
  id: string;
  title: string;
  amountVnd: number;
  incomeDate: string;
  category: IncomeCategory;
  note: string | null;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type IncomeMonthData = {
  month: string;
  items: Income[];
  totalAmountVnd: number;
  categories: Array<{
    category: IncomeCategory;
    totalAmountVnd: number;
  }>;
};

export type MealBudget = {
  id: string;
  mealPeriod: MealPeriod;
  limitVnd: number;
  enabled: boolean;
  ownerUserId: string | null;
  householdId: string | null;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseMonthData = {
  month: string;
  items: Expense[];
  totalAmountVnd: number;
  categories: Array<{
    category: ExpenseCategory;
    totalAmountVnd: number;
  }>;
};

export type ExpenseResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};
