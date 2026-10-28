export type WalkingWorkoutStatus =
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'FINISHED';

export type WalkingWorkout = {
  id: string;
  clientSessionId: string;
  startedAt: string;
  endedAt: string | null;
  lastActiveAt: string;
  pausedAt: string | null;
  durationSeconds: number;
  pausedDurationSeconds: number;
  steps: number;
  distanceMeters: number;
  caloriesBurned: number | null;
  activeCalories: number | null;
  averageSpeed: number | null;
  weightKgAtWorkout: number | null;
  metValue: number | null;
  calculationMethod: string | null;
  source: string;
  status: WalkingWorkoutStatus;
  createdAt: string;
  updatedAt: string;
};

export type WalkingWorkoutResponse = {
  success: boolean;
  message?: string;
  data?: { workout: WalkingWorkout | null };
};

export type WalkingWorkoutHistoryResponse = {
  success: boolean;
  message?: string;
  data?: {
    workouts: WalkingWorkout[];
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
};

export type WalkingSummary = {
  from: string;
  to: string;
  workoutCount: number;
  steps: number;
  distanceMeters: number;
  durationSeconds: number;
  caloriesBurned: number | null;
  activeCalories: number | null;
};

export type WalkingSummaryResponse = {
  success: boolean;
  message?: string;
  data?: WalkingSummary;
};

export type WalkingLocationPoint = {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
};

export type WalkingStepUpdate = { steps: number };

export type WalkingTrackingStatus = {
  kind: 'steps' | 'gps' | 'gpsPermission';
  status: 'available' | 'unavailable' | 'granted' | 'denied';
};
