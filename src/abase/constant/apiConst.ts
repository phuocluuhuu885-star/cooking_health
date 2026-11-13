import { ApiType } from '../../type/apiType';

type API = {
  getAllMeal: ApiType;
  login: ApiType;
  register: ApiType;
  changePassword: ApiType;
  deleteAccount: ApiType;
  updatePersonalInfo: ApiType;
  updateAvatar: ApiType;
  getMealDetail: ApiType;
  searchMeals: ApiType;
  getCommunityMeals: ApiType;
  getCommunityMeal: ApiType;
  favoriteCommunityMeal: ApiType;
  unfavoriteCommunityMeal: ApiType;
  createCommunityMeal: ApiType;
  deleteCommunityMeal: ApiType;
  analyzeCommunityMealNutrition: ApiType;
  getCommunityMealReviews: ApiType;
  upsertCommunityMealReview: ApiType;
  getMealPlan: ApiType;
  addMealToPlan: ApiType;
  deleteMealFromPlan: ApiType;
  completeMealPeriod: ApiType;
  updateMealConsumption: ApiType;
  getDailyConsumedMeals: ApiType;
  addConsumedMeal: ApiType;
  addScannedConsumedMeal: ApiType;
  getConsumptionReport: ApiType;
  getAiMealRecommendations: ApiType;
  postAiMealChatMessage: ApiType;
  postAiMealScan: ApiType;
  saveWeeklyMealPlan: ApiType;
  getFamilyMealRecommendations: ApiType;
  saveFamilyWeeklyMealPlan: ApiType;
  updateHealthProfile: ApiType;
  getHealthProfileHistory: ApiType;
  getCurrentHousehold: ApiType;
  getHouseholdHealthOverview: ApiType;
  getHouseholdMemberHealth: ApiType;
  updateHouseholdMemberHealth: ApiType;
  createHousehold: ApiType;
  joinHousehold: ApiType;
  createHouseholdInvitation: ApiType;
  leaveHousehold: ApiType;
  removeHouseholdMember: ApiType;
  getHouseholdMealPlan: ApiType;
  addMealToHouseholdPlan: ApiType;
  updateHouseholdMealPollDeadline: ApiType;
  updateHouseholdMealVoting: ApiType;
  updateHouseholdMealConsumption: ApiType;
  completeHouseholdMealPeriod: ApiType;
  deleteHouseholdPlannedMeal: ApiType;
  voteForHouseholdMeal: ApiType;
  startWalkingWorkout: ApiType;
  getActiveWalkingWorkout: ApiType;
  updateWalkingWorkout: ApiType;
  pauseWalkingWorkout: ApiType;
  resumeWalkingWorkout: ApiType;
  finishWalkingWorkout: ApiType;
  getWalkingWorkoutHistory: ApiType;
  getWalkingSummary: ApiType;
  getWaterIntake: ApiType;
  addWaterIntake: ApiType;
  getExpenses: ApiType;
  addExpense: ApiType;
  updateExpense: ApiType;
  deleteExpense: ApiType;
  getIncomes: ApiType;
  addIncome: ApiType;
  updateIncome: ApiType;
  deleteIncome: ApiType;
  getMealBudgets: ApiType;
  upsertMealBudget: ApiType;
  deleteMealBudget: ApiType;
};

const apiConst: API = {
  getAllMeal: {
    method: 'get',
    url: 'api/meal/getAll',
  },
  login: {
    method: 'post',
    url: 'api/auth/login',
  },
  register: {
    method: 'post',
    url: 'api/auth/register',
  },
  changePassword: {
    method: 'post',
    url: 'api/auth/changePassword',
  },
  deleteAccount: {
    method: 'delete',
    url: 'api/auth/account',
  },
  updatePersonalInfo: {
    method: 'put',
    url: 'api/auth/profile',
  },
  updateAvatar: {
    method: 'put',
    url: 'api/auth/profile/avatar',
  },
  getMealDetail: {
    method: 'get',
    url: 'api/meal/:id',
  },
  searchMeals: {
    method: 'get',
    url: 'api/meal/search',
  },
  getCommunityMeals: {
    method: 'get',
    url: 'api/community-meals',
  },
  getCommunityMeal: {
    method: 'get',
    url: 'api/community-meals/:id',
  },
  favoriteCommunityMeal: {
    method: 'put',
    url: 'api/community-meals/:id/favorite',
  },
  unfavoriteCommunityMeal: {
    method: 'delete',
    url: 'api/community-meals/:id/favorite',
  },
  createCommunityMeal: {
    method: 'post',
    url: 'api/community-meals',
  },
  deleteCommunityMeal: {
    method: 'delete',
    url: 'api/community-meals/:id',
  },
  analyzeCommunityMealNutrition: {
    method: 'post',
    url: 'api/community-meals/analyze-nutrition',
    timeout: 50000,
  },
  getCommunityMealReviews: {
    method: 'get',
    url: 'api/community-meals/:id/reviews',
  },
  upsertCommunityMealReview: {
    method: 'post',
    url: 'api/community-meals/:id/reviews',
  },
  getMealPlan: {
    method: 'get',
    url: 'api/meal-plan',
  },
  addMealToPlan: {
    method: 'post',
    url: 'api/meal-plan',
  },
  deleteMealFromPlan: {
    method: 'delete',
    url: 'api/meal-plan/:id',
  },
  completeMealPeriod: {
    method: 'post',
    url: 'api/meal-plan/complete',
  },
  updateMealConsumption: {
    method: 'put',
    url: 'api/meal-plan/:id/consumption',
  },
  getDailyConsumedMeals: {
    method: 'get',
    url: 'api/meal-plan/consumed',
  },
  addConsumedMeal: {
    method: 'post',
    url: 'api/meal-plan/consumed',
  },
  addScannedConsumedMeal: {
    method: 'post',
    url: 'api/meal-plan/scanned-consumed',
  },
  getConsumptionReport: {
    method: 'get',
    url: 'api/meal-plan/report',
  },
  getAiMealRecommendations: {
    method: 'post',
    url: 'api/ai/meal-recommendations',
    timeout: 20000,
  },
  postAiMealChatMessage: {
    method: 'post',
    url: 'api/ai/chat',
    timeout: 20000,
  },
  postAiMealScan: {
    method: 'post',
    url: 'api/ai/meal-scan',
    timeout: 190000,
  },
  saveWeeklyMealPlan: {
    method: 'post',
    url: 'api/ai/weekly-plan',
  },
  getFamilyMealRecommendations: {
    method: 'post',
    url: 'api/household/ai/meal-recommendations',
    timeout: 20000,
  },
  saveFamilyWeeklyMealPlan: {
    method: 'post',
    url: 'api/household/meal-plan/weekly',
  },
  updateHealthProfile: {
    method: 'post',
    url: 'api/auth/updateHealth',
  },
  getHealthProfileHistory: {
    method: 'get',
    url: 'api/auth/health-history',
  },
  getCurrentHousehold: {
    method: 'get',
    url: 'api/households/current',
  },
  getHouseholdHealthOverview: {
    method: 'get',
    url: 'api/households/current/health',
  },
  getHouseholdMemberHealth: {
    method: 'get',
    url: 'api/households/current/members/:memberId/health',
  },
  updateHouseholdMemberHealth: {
    method: 'put',
    url: 'api/households/current/members/:memberId/health',
  },
  createHousehold: {
    method: 'post',
    url: 'api/households',
  },
  joinHousehold: {
    method: 'post',
    url: 'api/households/join',
  },
  createHouseholdInvitation: {
    method: 'post',
    url: 'api/households/:id/invitations',
  },
  leaveHousehold: {
    method: 'delete',
    url: 'api/households/current/membership',
  },
  removeHouseholdMember: {
    method: 'delete',
    url: 'api/households/:id/members/:memberId',
  },
  getHouseholdMealPlan: {
    method: 'get',
    url: 'api/household/meal-plan',
  },
  addMealToHouseholdPlan: {
    method: 'post',
    url: 'api/household/meal-plan',
  },
  updateHouseholdMealPollDeadline: {
    method: 'put',
    url: 'api/household/meal-plan/poll/deadline',
  },
  updateHouseholdMealVoting: {
    method: 'put',
    url: 'api/household/meal-plan/poll/enabled',
  },
  updateHouseholdMealConsumption: {
    method: 'put',
    url: 'api/household/meal-plan/:id/consumption',
  },
  completeHouseholdMealPeriod: {
    method: 'post',
    url: 'api/household/meal-plan/complete',
  },
  deleteHouseholdPlannedMeal: {
    method: 'delete',
    url: 'api/household/meal-plan/:id',
  },
  voteForHouseholdMeal: {
    method: 'put',
    url: 'api/household/meal-plan/vote',
  },
  startWalkingWorkout: {
    method: 'post',
    url: 'api/walking-workouts',
  },
  getActiveWalkingWorkout: {
    method: 'get',
    url: 'api/walking-workouts/active',
  },
  updateWalkingWorkout: {
    method: 'put',
    url: 'api/walking-workouts/:id',
  },
  pauseWalkingWorkout: {
    method: 'put',
    url: 'api/walking-workouts/:id/pause',
  },
  resumeWalkingWorkout: {
    method: 'put',
    url: 'api/walking-workouts/:id/resume',
  },
  finishWalkingWorkout: {
    method: 'post',
    url: 'api/walking-workouts/:id/finish',
  },
  getWalkingWorkoutHistory: {
    method: 'get',
    url: 'api/walking-workouts/history',
  },
  getWalkingSummary: {
    method: 'get',
    url: 'api/walking-workouts/summary',
  },
  getWaterIntake: {
    method: 'get',
    url: 'api/water-intake',
  },
  addWaterIntake: {
    method: 'post',
    url: 'api/water-intake',
  },
  getExpenses: {
    method: 'get',
    url: 'api/expenses',
  },
  addExpense: {
    method: 'post',
    url: 'api/expenses',
  },
  updateExpense: {
    method: 'put',
    url: 'api/expenses/:id',
  },
  deleteExpense: {
    method: 'delete',
    url: 'api/expenses/:id',
  },
  getIncomes: {
    method: 'get',
    url: 'api/incomes',
  },
  addIncome: {
    method: 'post',
    url: 'api/incomes',
  },
  updateIncome: {
    method: 'put',
    url: 'api/incomes/:id',
  },
  deleteIncome: {
    method: 'delete',
    url: 'api/incomes/:id',
  },
  getMealBudgets: {
    method: 'get',
    url: 'api/meal-budgets',
  },
  upsertMealBudget: {
    method: 'put',
    url: 'api/meal-budgets',
  },
  deleteMealBudget: {
    method: 'delete',
    url: 'api/meal-budgets/:mealPeriod',
  },
};

export default apiConst;
