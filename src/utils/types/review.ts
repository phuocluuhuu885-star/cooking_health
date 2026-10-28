export type MealReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  userName: string;
};

export type MyMealReview = Omit<MealReview, 'userName'>;

export type MealReviewSummary = {
  mealId: string;
  averageRating: number;
  total: number;
};

export type MealReviewSummariesResponse = {
  success: boolean;
  message?: string;
  data?: MealReviewSummary[];
};

export type MealReviewsResponse = {
  success: boolean;
  message?: string;
  data?: {
    reviews: MealReview[];
    total: number;
    averageRating: number;
    myReview: MyMealReview | null;
    hasMore: boolean;
  };
};

export type CreateMealReviewResponse = {
  success: boolean;
  message?: string;
  data?: MyMealReview;
};
