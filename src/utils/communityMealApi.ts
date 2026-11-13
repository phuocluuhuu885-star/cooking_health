import apiConst from '../abase/constant/apiConst';
import type { UserInfo } from '../type/user';
import { getBaseUrl, setSyncUser, syncApi } from './syncUtils';
import type {
  CommunityMealResponse,
  CommunityMealFavoriteResponse,
  CommunityMealReviewsResponse,
  CommunityMealsResponse,
  CommunityNutritionResponse,
  SharedCommunityMealResponse,
} from './types/communityMeal';

const withImageBaseUrl = <T extends { imageUrl: string }>(meal: T): T => ({
  ...meal,
  imageUrl: `${getBaseUrl().replace(/\/+$/, '')}${meal.imageUrl}`,
  ...('creatorAvatar' in meal && typeof meal.creatorAvatar === 'string'
    ? {
        creatorAvatar: meal.creatorAvatar.startsWith('http')
          ? meal.creatorAvatar
          : `${getBaseUrl().replace(/\/+$/, '')}${meal.creatorAvatar}`,
      }
    : {}),
});

export const fetchCommunityMealReviews = async (
  user: UserInfo,
  mealId: string,
  offset = 0,
): Promise<CommunityMealReviewsResponse> => {
  setSyncUser(user);
  const response = (await syncApi(apiConst.getCommunityMealReviews, {
    id: mealId,
    offset,
  })) as CommunityMealReviewsResponse;
  if (!response?.data) return response;
  return {
    ...response,
    data: {
      ...response.data,
      reviews: response.data.reviews.map(review => ({
        ...review,
        userAvatar: review.userAvatar
          ? review.userAvatar.startsWith('http')
            ? review.userAvatar
            : `${getBaseUrl().replace(/\/+$/, '')}${review.userAvatar}`
          : null,
      })),
    },
  };
};

export const submitCommunityMealReview = async (
  user: UserInfo,
  mealId: string,
  rating: number,
  comment: string,
): Promise<{ success: boolean; message?: string }> => {
  setSyncUser(user);
  return (await syncApi(apiConst.upsertCommunityMealReview, {
    id: mealId,
    rating,
    comment,
  })) as { success: boolean; message?: string };
};

export const fetchCommunityMeals = async (
  user: UserInfo,
  options: {
    page?: number;
    query?: string;
    mine?: boolean;
    favorites?: boolean;
    creatorId?: string;
  } = {},
): Promise<CommunityMealsResponse> => {
  setSyncUser(user);
  const response = (await syncApi(apiConst.getCommunityMeals, {
    page: options.page ?? 1,
    limit: 20,
    q: options.query?.trim() || undefined,
    mine: options.mine ? 'true' : undefined,
    favorites: options.favorites ? 'true' : undefined,
    authorId: options.creatorId,
  })) as CommunityMealsResponse;
  return response?.data
    ? { ...response, data: response.data.map(withImageBaseUrl) }
    : response;
};

export const setCommunityMealFavorite = async (
  user: UserInfo,
  mealId: string,
  isFavorited: boolean,
): Promise<CommunityMealFavoriteResponse> => {
  setSyncUser(user);
  return (await syncApi(
    isFavorited
      ? apiConst.favoriteCommunityMeal
      : apiConst.unfavoriteCommunityMeal,
    { id: mealId },
  )) as CommunityMealFavoriteResponse;
};

export const fetchCommunityMeal = async (
  user: UserInfo,
  mealId: string,
): Promise<CommunityMealResponse> => {
  setSyncUser(user);
  const response = (await syncApi(apiConst.getCommunityMeal, {
    id: mealId,
  })) as CommunityMealResponse;
  return response?.data
    ? { ...response, data: withImageBaseUrl(response.data) }
    : response;
};

export const analyzeCommunityMealNutrition = async (
  user: UserInfo,
  data: {
    name: string;
    ingredients: string[];
    instructions: string;
    servings: number;
    consent: true;
  },
): Promise<CommunityNutritionResponse> => {
  setSyncUser(user);
  return (await syncApi(
    apiConst.analyzeCommunityMealNutrition,
    data,
  )) as CommunityNutritionResponse;
};

export const shareCommunityMeal = async (
  user: UserInfo,
  data: {
    name: string;
    description: string;
    ingredients: string[];
    instructions: string;
    servings: number;
    nutrition: NonNullable<CommunityNutritionResponse['data']>;
    imageBase64: string;
  },
): Promise<SharedCommunityMealResponse> => {
  setSyncUser(user);
  return (await syncApi(
    apiConst.createCommunityMeal,
    data,
  )) as SharedCommunityMealResponse;
};

export const removeCommunityMeal = async (
  user: UserInfo,
  mealId: string,
): Promise<{ success: boolean; message?: string }> => {
  setSyncUser(user);
  return (await syncApi(apiConst.deleteCommunityMeal, {
    id: mealId,
  })) as { success: boolean; message?: string };
};
