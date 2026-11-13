import type {
  EstimatedPriceRange,
  MealPeriod,
  MealPeriodPlan,
  PlannedMeal,
} from './meal';
import type { HealthProfile } from '../../type/user';

export type HouseholdRole = 'ADMIN' | 'MEMBER';

export type HouseholdMember = {
  id: string;
  userId: string;
  user: {
    id: string;
    fullName: string | null;
    email: string;
  };
  role: HouseholdRole;
  joinedAt: string;
};

export type HouseholdHealthDaily = {
  nutrition: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  waterMl: number;
  walking: {
    steps: number;
    distanceMeters: number;
    durationSeconds: number;
    caloriesBurned: number;
  };
};

export type HouseholdHealthOverviewMember = {
  userId: string;
  role: HouseholdRole;
  name: string;
  shared: boolean;
  canUpdate: boolean;
  profile: HealthProfile | null;
  daily: HouseholdHealthDaily | null;
};

export type HouseholdHealthOverviewResponse = {
  success: boolean;
  message?: string;
  data?: {
    date: string;
    members: HouseholdHealthOverviewMember[];
  };
};

export type HouseholdMemberHealthResponse = {
  success: boolean;
  message?: string;
  data?: {
    date: string;
    member: {
      userId: string;
      role: HouseholdRole;
      name: string;
      profile: HealthProfile | null;
      canUpdate: boolean;
    };
    daily: HouseholdHealthDaily;
    weightHistory: Array<{
      id: string;
      weightKg: number;
      bmi: number;
      measuredAt: string;
      recordedByUserId: string | null;
    }>;
  };
};

export type Household = {
  id: string;
  name: string;
  lunchPollCloseTime?: string;
  dinnerPollCloseTime?: string;
  mealVotingEnabled: boolean;
  currentMemberId: string;
  currentRole: HouseholdRole;
  members: HouseholdMember[];
  createdAt: string;
  updatedAt: string;
};

export type HouseholdResponse = {
  success: boolean;
  message?: string;
  data?: Household | null;
};

export type HouseholdInvitationResponse = {
  success: boolean;
  message?: string;
  data?: {
    code: string;
    expiresAt: string;
    maxUses: number;
  };
};

export type HouseholdPlannedMeal = PlannedMeal & {
  addedBy: {
    id: string;
    fullName: string | null;
  };
  consumedBy: {
    id: string;
    fullName: string | null;
  } | null;
};

export type HouseholdMealPollOption = {
  id: string;
  mealId: string;
  servings: number;
  createdAt: string;
  proposedBy: {
    id: string;
    fullName: string | null;
  };
  meal: {
    id: string;
    communityMealId?: string | null;
    name: string;
    description?: string | null;
    imageUrl: string | null;
    category: string;
  };
  estimatedPrice?: EstimatedPriceRange;
  agrees: number;
  disagrees: number;
  unvoted: number;
  myVote: boolean | null;
  outcome: 'ACCEPTED' | 'REJECTED' | null;
};

export type HouseholdMealPoll = {
  closesAt: string;
  closedAt: string | null;
  options: HouseholdMealPollOption[];
};

export type HouseholdMealPeriodPlan = Omit<MealPeriodPlan, 'items'> & {
  items: HouseholdPlannedMeal[];
  poll?: HouseholdMealPoll | null;
};

export type HouseholdMealPlan = {
  householdId: string;
  date: string;
  meals: Record<MealPeriod, HouseholdMealPeriodPlan>;
};

export type HouseholdMealPlanResponse = {
  success: boolean;
  message?: string;
  data?: HouseholdMealPlan;
};

export type HouseholdMealVoteResponse = {
  success: boolean;
  message?: string;
  data?: {
    agrees: boolean;
    updatedAt: string;
  };
};

export type HouseholdChatMessage = {
  id: string;
  householdId: string;
  senderUserId: string | null;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
  } | null;
};

export type HouseholdChatMessagesResponse = {
  success: boolean;
  message?: string;
  data?: {
    messages: HouseholdChatMessage[];
    hasMore: boolean;
    unreadCount: number;
  };
};

export type HouseholdNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: {
    householdId?: string;
    date?: string;
    mealPeriod?: MealPeriod;
  };
  createdAt: string;
  readAt: string | null;
};

export type HouseholdNotificationsResponse = {
  success: boolean;
  message?: string;
  data?: {
    notifications: HouseholdNotification[];
    unreadCount: number;
  };
};

export type HouseholdShoppingItem = {
  ingredientKey: string;
  name: string;
  amountG: number;
  mealNames: string[];
  purchasedAt: string | null;
};

export type HouseholdShoppingListResponse = {
  success: boolean;
  message?: string;
  data?: {
    householdId: string;
    date: string;
    mealPeriod: MealPeriod;
    items: HouseholdShoppingItem[];
  };
};

export type HouseholdScreenState = {
  loading: boolean;
  mealPlanLoading: boolean;
  saving: boolean;
  error: string;
  mealPlanError: string;
  date: string;
  mealPlan: HouseholdMealPlan | null;
  completingPeriod: MealPeriod | null;
  householdName: string;
  invitationCode: string;
  invitationExpiresAt: string;
  membersExpanded: boolean;
  selectedMealPeriod: MealPeriod;
  votingOptionKey: string;
  chatUnreadCount: number;
  pollDeadlineVisible: boolean;
  pollDeadlineSaving: boolean;
  pollVotingSaving: boolean;
  shoppingListVisible: boolean;
  currentTime: Date;
  sendingMealReminder: boolean;
  ingredientSummary: {
    visible: boolean;
    selectedMeals: Array<{ id: string; name: string; servings: number }>;
    ingredients: import('./home').HomeAggregatedIngredient[];
    loading: boolean;
    error: string;
  };
};
