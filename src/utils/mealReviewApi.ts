import axios from 'axios';
import configs from '../abase/constant/config';
import type {
  CreateMealReviewResponse,
  MealReviewSummariesResponse,
  MealReviewsResponse,
  MyMealReview,
} from './types';

const mealReviewEndpoint = `${configs.baseUrl.replace(/\/+$/, '')}/api/meal`;

const getEndpoint = (mealId: string) =>
  `${mealReviewEndpoint}/${encodeURIComponent(mealId)}/reviews`;

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

export const fetchMealReviews = async (
  mealId: string,
  token?: string,
  offset = 0,
): Promise<NonNullable<MealReviewsResponse['data']>> => {
  try {
    const response = await axios.get<MealReviewsResponse>(getEndpoint(mealId), {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      params: { offset },
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || 'Không thể tải đánh giá.');
    }
    return response.data.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, 'Không thể kết nối để tải đánh giá.'),
    );
  }
};

export const fetchMealReviewSummaries = async (
  mealIds: string[],
): Promise<NonNullable<MealReviewSummariesResponse['data']>> => {
  if (mealIds.length === 0) {
    return [];
  }
  try {
    const response = await axios.get<MealReviewSummariesResponse>(
      `${mealReviewEndpoint}/reviews/summary`,
      { params: { mealIds: mealIds.join(',') } },
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(
        response.data.message || 'Không thể tải tổng quan đánh giá.',
      );
    }
    return response.data.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, 'Không thể kết nối để tải tổng quan đánh giá.'),
    );
  }
};

export const createMealReview = async (
  mealId: string,
  token: string,
  rating: number,
  comment: string,
): Promise<MyMealReview> => {
  try {
    const response = await axios.post<CreateMealReviewResponse>(
      getEndpoint(mealId),
      { rating, comment },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.data.success) {
      throw new Error(response.data.message || 'Không thể gửi đánh giá.');
    }
    if (!response.data.data) {
      throw new Error('Đánh giá đã gửi nhưng máy chủ không trả về kết quả.');
    }
    return response.data.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Không thể gửi đánh giá.'));
  }
};
