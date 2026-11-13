export type CommunityMealNutrition = {
  caloriesKcal: number;
  proteinG: number;
  carbohydratesG: number;
  fatG: number;
  fiberG: number | null;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  notes: string[];
};

export type CommunityMealStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type CommunityMeal = {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string | null;
  name: string;
  description: string | null;
  ingredients: string[];
  instructions: string;
  nutrition: CommunityMealNutrition;
  imageUrl: string;
  createdAt: string;
  averageRating: number;
  reviewCount: number;
  favoriteCount: number;
  isFavorited: boolean;
  status: CommunityMealStatus;
  moderationReason: string | null;
};

export type CommunityMealFavoriteResponse = {
  success: boolean;
  message?: string;
  data?: {
    isFavorited: boolean;
    favoriteCount: number;
  };
};

export type CommunityMealReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  userName: string;
  userAvatar: string | null;
};

export type CommunityMealReviewsResponse = {
  success: boolean;
  message?: string;
  data?: {
    reviews: CommunityMealReview[];
    total: number;
    averageRating: number;
    myReview: {
      id: string;
      rating: number;
      comment: string | null;
      createdAt: string;
    } | null;
    hasMore: boolean;
  };
};

export type CommunityMealsResponse = {
  success: boolean;
  message?: string;
  data?: CommunityMeal[];
  pagination?: {
    hasNextPage: boolean;
    currentPage: number;
  };
};

export type CommunityMealResponse = {
  success: boolean;
  message?: string;
  data?: CommunityMeal;
};

export type CommunityNutritionResponse = {
  success: boolean;
  message?: string;
  data?: CommunityMealNutrition;
};

export type SharedCommunityMealResponse = {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    name: string;
    status: CommunityMealStatus;
    moderationReason: string | null;
  };
};
