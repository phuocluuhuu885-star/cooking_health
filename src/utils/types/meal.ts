export type MealCategory = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export type NutritionValues = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type MealNutritionSummary = {
  servings: number;
  totalWeightG: number;
  weightBasis: 'FINAL_WEIGHT' | 'INGREDIENT_WEIGHT_ESTIMATE';
  per100g: NutritionValues;
  total: NutritionValues;
  perServing: NutritionValues;
};

export type RecipeDetailMeal = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  category: MealCategory;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  nutritionSummary: MealNutritionSummary | null;
  groceryList: Array<{
    id: string;
    name: string;
    amountG: number;
    formattedAmount: string;
  }>;
  cookingSteps: Array<{
    id: string;
    stepNumber: number;
    title: string;
    instruction: string;
    imageUrl: string | null;
  }>;
};

export type RecipeDetailResponse = {
  success: boolean;
  message?: string;
  data?: RecipeDetailMeal;
  IsError?: boolean;
  ErrorMessage?: string;
};

export type RecipeDetailState = {
  servings: number;
  reloadIndex: number;
  meal: RecipeDetailMeal | null;
  loading: boolean;
  error: string;
  composerVisible: boolean;
  composerSaving: boolean;
  reviewModalVisible: boolean;
  reviewSummary: import('./review').MealReviewSummary | null;
};

export type NutritionItemProps = {
  label: string;
  value: number;
  color: string;
};

export type MealPeriod = 'LUNCH' | 'DINNER';

export type AiMealChatSuggestion = {
  mealId: string;
  name: string;
  imageUrl: string | null;
  mealPeriod: MealPeriod;
  nutrition: {
    calories: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
  };
};

export type AiMealChatHistoryEntry = {
  role: 'assistant' | 'user';
  text: string;
  suggestions?: Array<{
    mealId: string;
    mealPeriod: MealPeriod;
  }>;
};

export type AiMealChatResponse = {
  success: boolean;
  message?: string;
  ErrorMessage?: string;
  data?: {
    inScope: boolean;
    answer: string;
    suggestions?: AiMealChatSuggestion[];
  };
};

export type AiMealScanNutrition = {
  caloriesKcal: number;
  proteinG: number;
  carbohydratesG: number;
  fatG: number;
  fiberG: number | null;
};

export type AiMealScanResult = {
  recognized: boolean;
  dishName: string | null;
  components: Array<{
    name: string;
    estimatedAmount: string;
    estimatedWeightG: number | null;
    estimatedQuantity: number | null;
    quantityUnit: string | null;
    nutrition: AiMealScanNutrition;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  totalNutrition: AiMealScanNutrition;
  notes: string[];
};

export type AiMealScanResponse = {
  success: boolean;
  message?: string;
  ErrorMessage?: string;
  data?: AiMealScanResult;
};

export type AddScannedConsumedMealResponse = {
  success: boolean;
  message?: string;
  ErrorMessage?: string;
  data?: DailyConsumedMeal;
};

export type EstimatedPriceRange = {
  minVnd: number;
  maxVnd: number;
};

export type SkippedMealPeriod = {
  date: string;
  mealPeriod: MealPeriod;
  reason: 'ALREADY_PLANNED' | 'COMPLETED';
};

export type WeeklyMealPlanSaveResponse = {
  success?: boolean;
  message?: string;
  ErrorMessage?: string;
  data?: {
    savedCount?: number;
    proposedCount?: number;
    plannedCount?: number;
    skippedPeriods?: SkippedMealPeriod[];
  };
};

export type MealPlanDestination = 'PERSONAL' | 'HOUSEHOLD';

export type ConsumptionReportPeriod = 'WEEK' | 'MONTH';

export type ConsumptionReportPeriodOption = {
  id: ConsumptionReportPeriod;
  label: string;
};

export type ConsumptionMacroSummaryProps = {
  label: string;
  value: number;
  color: string;
};

export type MealPeriodOption = {
  id: MealPeriod;
  label: string;
};

export type Nutrition = NutritionValues;

export type PlannedMeal = {
  id: string;
  servings: number;
  estimatedPrice?: EstimatedPriceRange;
  addedAt?: string;
  meal: {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    category: string;
  };
  nutritionSummary: {
    total: Nutrition;
  } | null;
  isConsumed: boolean;
  consumedAt: string | null;
  addedBy?: {
    id: string;
    fullName: string | null;
  };
  consumedBy?: {
    id: string;
    fullName: string | null;
  } | null;
};

export type PlannedMealItemProps = {
  item: PlannedMeal;
  onDelete?: (item: PlannedMeal) => void;
  canDelete?: boolean;
};

export type ConsumptionReportDay = {
  date: string;
  nutrition: Nutrition;
  consumedItems: number;
  unavailableNutritionItems: number;
};

export type ConsumptionReportData = {
  period: ConsumptionReportPeriod;
  startDate: string;
  endDate: string;
  totals: Nutrition;
  unavailableNutritionItems: number;
  days: ConsumptionReportDay[];
};

export type CachedConsumptionReport = {
  cacheKey: string;
  data: ConsumptionReportData;
};

export type ConsumptionReportResponse = {
  success: boolean;
  message?: string;
  data?: ConsumptionReportData;
};

export type DailyConsumedMeal = {
  id: string;
  mealId: string;
  name: string;
  imageUrl: string | null;
  mealPeriod: MealPeriod;
  servings: number;
  consumedAt: string;
  source: 'PERSONAL' | 'HOUSEHOLD' | 'MANUAL' | 'SCANNED';
  nutrition: Nutrition | null;
};

export type AddConsumedMealResponse = {
  success: boolean;
  message?: string;
  data?: DailyConsumedMeal;
};

export type DailyConsumedMealsResponse = {
  success: boolean;
  message?: string;
  data?: {
    date: string;
    items: DailyConsumedMeal[];
  };
};

export type AiMealRecommendation = {
  meal: Pick<
    RecipeDetailMeal,
    | 'id'
    | 'name'
    | 'description'
    | 'imageUrl'
    | 'category'
    | 'prepTimeMinutes'
    | 'cookTimeMinutes'
    | 'nutritionSummary'
  >;
  recommendedServings: number;
  recommendationReason: string;
  estimatedPricePerServing?: EstimatedPriceRange;
  estimatedPrice?: EstimatedPriceRange;
};

export type AiMealRecommendationsData = {
  date: string;
  targets: Nutrition;
  consumed: Nutrition;
  remaining: Nutrition;
  consumedPeriods: MealPeriod[];
  unavailableNutritionItems: number;
  source: 'GEMINI' | 'LOCAL';
  message: string;
  budget?: EstimatedPriceRange;
  mealBudgets?: Partial<Record<MealPeriod, number>>;
  recommendations: Record<MealPeriod, AiMealRecommendation[]>;
};

export type AiMealRecommendationsResponse = {
  success: boolean;
  message?: string;
  ErrorMessage?: string;
  data?: AiMealRecommendationsData;
};

export type ConsumptionUpdateResponse = {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    isConsumed: boolean;
    consumedAt: string | null;
  };
};

export type MealPeriodPlan = {
  items: PlannedMeal[];
  nutritionSummary: Nutrition;
  estimatedPrice?: EstimatedPriceRange;
  unavailableNutritionItems: number;
  isCompleted?: boolean;
  completedAt?: string | null;
  isLocked?: boolean;
};

export type MealCompletionResponse = {
  success: boolean;
  message?: string;
  data?: {
    date: string;
    mealPeriod: MealPeriod;
    completedAt: string;
    items: Array<{
      mealId: string;
      name: string;
      servings: number;
      nutrition: MealNutritionSummary | null;
    }>;
    nutritionSummary: Nutrition;
    consumedItems: number;
    unavailableNutritionItems: number;
  };
};

export type MealPlanResponse = {
  success: boolean;
  message?: string;
  data?: {
    date: string;
    meals: Record<MealPeriod, MealPeriodPlan>;
  };
};

export type MealPlanScreenState = {
  date: string;
  selectedPeriod: MealPeriod;
  selectedMealIds: string[];
  loading: boolean;
  error: string;
  completingPeriod: MealPeriod | null;
  ingredientSummary: Array<{
    name: string;
    amountG: number;
    mealNames?: string[];
  }>;
  ingredientSummaryVisible: boolean;
  ingredientSummaryLoading: boolean;
  ingredientSummaryError: string;
};

export type HealthProfileHistoryPoint = {
  id: string;
  weightKg: number;
  bmi: number;
  measuredAt: string;
};

export type HealthProfileHistoryResponse = {
  success: boolean;
  message?: string;
  data?: {
    history: HealthProfileHistoryPoint[];
  };
};

export type HealthProfileHistoryCardProps = {
  history: HealthProfileHistoryPoint[];
  loading: boolean;
  error: string;
  onRetry: () => void;
};

export type DailyConsumedMealsCardProps = {
  items: DailyConsumedMeal[];
  loading: boolean;
  error: string;
  onRetry: () => void;
};

export type ConsumptionReportCardProps = {
  period: ConsumptionReportPeriod;
  report: ConsumptionReportData | null;
  loading: boolean;
  error: string;
  isLoggedIn: boolean;
  dailyCaloriesTarget?: number;
  onChangePeriod: (period: ConsumptionReportPeriod) => void;
  onRetry: () => void;
};
