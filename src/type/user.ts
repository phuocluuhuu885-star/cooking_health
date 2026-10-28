export type UserCategory = {
  id: number;
  passengerAccountId: number;
  passengerCategoryId: number;
  passengerCategoryName: string;
  status: number;
  activatedAt: Date;
  expiredAt: number;
  categoryType: number;
  categoryTypeName: string;
};
export type Gender =
  | 'MALE'
  | 'FEMALE';

export type ActivityLevel =
  | 'SEDENTARY'
  | 'LIGHT'
  | 'MODERATE'
  | 'ACTIVE'
  | 'VERY_ACTIVE';

export type Goal =
  | 'LOSE_WEIGHT'
  | 'MAINTAIN'
  | 'GAIN_MUSCLE';

export type BmiCategory =
  | 'UNDERWEIGHT'
  | 'NORMAL_WEIGHT'
  | 'OVERWEIGHT'
  | 'OBESITY_CLASS_I'
  | 'OBESITY_CLASS_II'
  | 'OBESITY_CLASS_III';

export type HealthProfile = {
  id: string;
  userId: string;

  age: number;
  gender: Gender;

  heightCm: number;
  weightKg: number;

  activityLevel: ActivityLevel;
  goal: Goal;

  bmr: number;
  tdee: number;
  dailyCaloriesTarget: number;
  bmi: number;
  bmiCategory: BmiCategory | null;
  healthyWeightMinKg: number | null;
  healthyWeightMaxKg: number | null;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;

  createdAt: string;
  updatedAt: string;
};

export type UserInfo = {
  id: string;
  email: string;
  fullName: string | null;

  avatar?: string | null;

  accessToken: string;
  refreshToken?: string;

  healthProfile?: HealthProfile | null;

  createdAt: string;
  updatedAt: string;
};

// export type LastUserLogin = {
//   Phone: string;
//   FullName: string;
//   IsBiometrict: boolean;
// };

export type UserState = {
  loginUserInfo: UserInfo | null;
};
