import type { BackendMeal } from './recipe';
import type { MealReviewSummary } from './review';
import type {
  MealPeriod,
  MealPeriodOption,
  EstimatedPriceRange,
  PlannedMeal,
  RecipeDetailMeal,
} from './meal';

export type HomeDashboardState = {
  date: string;
  loading: boolean;
  consumptionError: string;
  mealPlanError: string;
  recommendationsError: string;
  selectedMealPeriod: MealPeriod;
  chatUnreadCount: number;
  notificationUnreadCount: number;
  reviewSummaries: Record<string, MealReviewSummary>;
};

export type HomeMealItemProps = {
  item: PlannedMeal;
  onPress: (mealId: string) => void;
};

export type HomeMealPeriodProps = {
  title: string;
  items: PlannedMeal[];
  onPress: (mealId: string) => void;
};

export type HomeMealPeriodSelectorProps = {
  selectedPeriod: MealPeriod;
  periodPlans: Partial<
    Record<MealPeriod, { itemCount: number; isCompleted: boolean }>
  >;
  onSelect: (period: MealPeriod) => void;
};

export type HomeMealPeriodButtonProps = {
  period: MealPeriodOption;
  itemCount: number;
  completed: boolean;
  selected: boolean;
  onSelect: (period: MealPeriod) => void;
};

export type HomeRecipeCardProps = {
  meal: BackendMeal;
  onPress: (mealId: string) => void;
  onAdd?: () => void;
  adding?: boolean;
  disableAdd?: boolean;
  reviewSummary?: MealReviewSummary;
  recommendationReason?: string;
  recommendedServings?: number;
  estimatedPrice?: EstimatedPriceRange;
};

export type HomeAggregatedIngredient = {
  name: string;
  amountG: number;
  mealNames?: string[];
};

export type HomeIngredientSummaryModalProps = {
  visible: boolean;
  selectedMeals: Array<Pick<RecipeDetailMeal, 'id' | 'name' | 'servings'>>;
  ingredients: HomeAggregatedIngredient[];
  loading: boolean;
  error: string;
  shoppingListDate?: string;
  shoppingListUserId?: string;
  onClose: () => void;
  onRetry: () => void;
};
