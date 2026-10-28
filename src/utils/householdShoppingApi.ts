import axios from 'axios';
import configs from '../abase/constant/config';
import type {
  HouseholdShoppingItem,
  HouseholdShoppingListResponse,
  MealPeriod,
} from './types';

const getEndpoint = (path = '') =>
  `${configs.baseUrl.replace(/\/+$/, '')}/api/household/shopping-list${path}`;

const getHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    axios.isAxiosError<{ message?: string }>(error) &&
    error.response?.data?.message
  ) {
    return error.response.data.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export const fetchHouseholdShoppingList = async (
  token: string,
  date: string,
  mealPeriod: MealPeriod,
): Promise<HouseholdShoppingItem[]> => {
  try {
    const response = await axios.get<HouseholdShoppingListResponse>(
      getEndpoint(),
      { headers: getHeaders(token), params: { date, mealPeriod } },
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(
        response.data.message || 'Không thể tải danh sách đi chợ.',
      );
    }
    return response.data.data.items;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Không thể tải danh sách đi chợ.'));
  }
};

export const updateHouseholdShoppingItem = async (
  token: string,
  date: string,
  mealPeriod: MealPeriod,
  ingredientKey: string,
  isPurchased: boolean,
): Promise<HouseholdShoppingItem> => {
  try {
    const response = await axios.put<{
      success: boolean;
      message?: string;
      data?: HouseholdShoppingItem;
    }>(
      getEndpoint(`/${encodeURIComponent(ingredientKey)}`),
      { date, mealPeriod, isPurchased },
      { headers: getHeaders(token) },
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(
        response.data.message || 'Không thể cập nhật trạng thái đã mua.',
      );
    }
    return response.data.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, 'Không thể cập nhật trạng thái đã mua.'),
    );
  }
};
