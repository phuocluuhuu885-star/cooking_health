import type { RecipeDetailMeal } from './meal';
import type { MealReviewSummary } from './review';

export type Recipe = {
  id: string;
  name: string;
  description?: string | null;
  image: string;
  time: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  category: string[];
  nutritionAvailable?: boolean;
};

export type Category = {
  id: string;
  title: string;
};

export type RecipeCardProps = {
  item: Recipe;
  width: number;
  isFavorite: boolean;
  onFavorite: (id: string) => void;
  onAdd: (id: string) => void;
  onPress: (id: string) => void;
  reviewSummary?: MealReviewSummary;
};

export type CategoryItemProps = {
  item: Category;
  selected: boolean;
  onPress: (id: string) => void;
};

export type BackendMeal = Pick<
  RecipeDetailMeal,
  | 'id'
  | 'name'
  | 'imageUrl'
  | 'category'
  | 'prepTimeMinutes'
  | 'cookTimeMinutes'
> & {
  description?: string | null;
  nutritionSummary: RecipeDetailMeal['nutritionSummary'];
};

export type MealsResponse = {
  success: boolean;
  message?: string;
  data?: BackendMeal[];
  pagination?: {
    hasNextPage: boolean;
  };
};

export type RecipeLibraryState = {
  search: string;
  selectedCategory: string;
  favorites: string[];
  favoritesOnly: boolean;
  recipes: Recipe[];
  loading: boolean;
  error: string;
  reloadIndex: number;
  page: number;
  hasNextPage: boolean;
  loadingMore: boolean;
  selectedRecipe: Recipe | null;
  reviewSummaries: Record<string, MealReviewSummary>;
  composerVisible: boolean;
  composerSaving: boolean;
};
