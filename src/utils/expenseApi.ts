import apiConst from '../abase/constant/apiConst';
import type { UserInfo } from '../type/user';
import type {
  Expense,
  ExpenseCategory,
  ExpenseMonthData,
  ExpenseResponse,
  ExpenseScope,
  Income,
  IncomeCategory,
  IncomeMonthData,
  MealBudget,
  MealPeriod,
} from './types';
import { setSyncUser, syncApi } from './syncUtils';

type ExpenseInput = {
  scope: ExpenseScope;
  title: string;
  amountVnd: number;
  expenseDate: string;
  category: ExpenseCategory;
  note: string | null;
  mealId: string | null;
};

export const createMealExpense = async (
  user: UserInfo,
  scope: ExpenseScope,
  data: {
    date: string;
    mealPeriod: MealPeriod;
    mealId: string;
    mealName: string;
    amountVnd: number;
  },
): Promise<ExpenseResponse<Expense>> => {
  const periodLabel = data.mealPeriod === 'LUNCH' ? 'Bữa trưa' : 'Bữa tối';
  return createExpense(user, {
    scope,
    title: `${periodLabel}: ${data.mealName}`,
    amountVnd: data.amountVnd,
    expenseDate: data.date,
    category: 'FOOD',
    note: null,
    mealId: data.mealId,
  });
};

export const createMealExpenses = async (
  user: UserInfo,
  scope: ExpenseScope,
  data: {
    date: string;
    mealPeriod: MealPeriod;
    expenses: Array<{
      mealId: string;
      mealName: string;
      amountVnd: number;
    }>;
  },
) => {
  const failures: Array<{ mealName: string; message: string }> = [];
  for (const expense of data.expenses) {
    try {
      const response = await createMealExpense(user, scope, {
        ...data,
        ...expense,
      });
      if (!response.success) {
        failures.push({
          mealName: expense.mealName,
          message: response.message || 'Không thể lưu khoản chi.',
        });
      }
    } catch (error) {
      failures.push({
        mealName: expense.mealName,
        message:
          error instanceof Error ? error.message : 'Vui lòng thử lại sau.',
      });
    }
  }
  return failures;
};

export type IncomeInput = {
  title: string;
  amountVnd: number;
  incomeDate: string;
  category: IncomeCategory;
  note: string | null;
};

export const fetchIncomes = async (
  user: UserInfo,
  month: string,
): Promise<ExpenseResponse<IncomeMonthData>> => {
  setSyncUser(user);
  return (await syncApi(apiConst.getIncomes, {
    month,
  })) as ExpenseResponse<IncomeMonthData>;
};

export const createIncome = async (
  user: UserInfo,
  data: IncomeInput,
): Promise<ExpenseResponse<Income>> => {
  setSyncUser(user);
  return (await syncApi(apiConst.addIncome, data)) as ExpenseResponse<Income>;
};

export const updateIncome = async (
  user: UserInfo,
  id: string,
  data: IncomeInput,
): Promise<ExpenseResponse<Income>> => {
  setSyncUser(user);
  return (await syncApi(apiConst.updateIncome, {
    ...data,
    id,
  })) as ExpenseResponse<Income>;
};

export const deleteIncome = async (
  user: UserInfo,
  id: string,
): Promise<ExpenseResponse<undefined>> => {
  setSyncUser(user);
  return (await syncApi(apiConst.deleteIncome, {
    id,
  })) as ExpenseResponse<undefined>;
};

export const fetchExpenses = async (
  user: UserInfo,
  scope: ExpenseScope,
  month: string,
): Promise<ExpenseResponse<ExpenseMonthData>> => {
  setSyncUser(user);
  return (await syncApi(apiConst.getExpenses, {
    scope,
    month,
  })) as ExpenseResponse<ExpenseMonthData>;
};

export const createExpense = async (
  user: UserInfo,
  data: ExpenseInput,
): Promise<ExpenseResponse<Expense>> => {
  setSyncUser(user);
  return (await syncApi(apiConst.addExpense, data)) as ExpenseResponse<Expense>;
};

export const updateExpense = async (
  user: UserInfo,
  id: string,
  data: ExpenseInput,
): Promise<ExpenseResponse<Expense>> => {
  setSyncUser(user);
  return (await syncApi(apiConst.updateExpense, {
    ...data,
    id,
  })) as ExpenseResponse<Expense>;
};

export const deleteExpense = async (
  user: UserInfo,
  id: string,
  scope: ExpenseScope,
): Promise<ExpenseResponse<undefined>> => {
  setSyncUser(user);
  return (await syncApi(apiConst.deleteExpense, {
    id,
    scope,
  })) as ExpenseResponse<undefined>;
};

export const fetchMealBudgets = async (
  user: UserInfo,
  scope: ExpenseScope,
): Promise<ExpenseResponse<MealBudget[]>> => {
  setSyncUser(user);
  return (await syncApi(apiConst.getMealBudgets, {
    scope,
  })) as ExpenseResponse<MealBudget[]>;
};

export const saveMealBudget = async (
  user: UserInfo,
  scope: ExpenseScope,
  mealPeriod: 'LUNCH' | 'DINNER',
  limitVnd: number,
  enabled: boolean,
): Promise<ExpenseResponse<MealBudget>> => {
  setSyncUser(user);
  return (await syncApi(apiConst.upsertMealBudget, {
    scope,
    mealPeriod,
    limitVnd,
    enabled,
  })) as ExpenseResponse<MealBudget>;
};

export const deleteMealBudget = async (
  user: UserInfo,
  scope: ExpenseScope,
  mealPeriod: 'LUNCH' | 'DINNER',
): Promise<ExpenseResponse<undefined>> => {
  setSyncUser(user);
  return (await syncApi(apiConst.deleteMealBudget, {
    scope,
    mealPeriod,
  })) as ExpenseResponse<undefined>;
};
