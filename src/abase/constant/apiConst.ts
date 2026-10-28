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
  getMealPlan: ApiType;
  addMealToPlan: ApiType;
  deleteMealFromPlan: ApiType;
  completeMealPeriod: ApiType;
  updateMealConsumption: ApiType;
  getDailyConsumedMeals: ApiType;
  addConsumedMeal: ApiType;
  getConsumptionReport: ApiType;
  updateHealthProfile: ApiType;
  getCurrentHousehold: ApiType;
  createHousehold: ApiType;
  joinHousehold: ApiType;
  createHouseholdInvitation: ApiType;
  leaveHousehold: ApiType;
  removeHouseholdMember: ApiType;
  getHouseholdMealPlan: ApiType;
  addMealToHouseholdPlan: ApiType;
  updateHouseholdMealPollDeadline: ApiType;
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
  getConsumptionReport: {
    method: 'get',
    url: 'api/meal-plan/report',
  },
  updateHealthProfile: {
    method: 'post',
    url: 'api/auth/updateHealth',
  },
  getCurrentHousehold: {
    method: 'get',
    url: 'api/households/current',
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
};

export default apiConst;
