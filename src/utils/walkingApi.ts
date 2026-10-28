import apiConst from '../abase/constant/apiConst';
import { syncApi } from './syncUtils';
import type {
  WalkingSummary,
  WalkingSummaryResponse,
  WalkingWorkout,
  WalkingWorkoutHistoryResponse,
  WalkingWorkoutResponse,
} from './types/walking';

const unwrapWorkout = (response: WalkingWorkoutResponse): WalkingWorkout => {
  if (!response.success || !response.data?.workout) {
    throw new Error(response.message || 'Không thể tải buổi đi bộ.');
  }
  return response.data.workout;
};

export const startWalkingWorkout = async (
  clientSessionId: string,
  weightKg?: number,
) => {
  const response = (await syncApi(
    apiConst.startWalkingWorkout,
    { clientSessionId, weightKg },
  )) as WalkingWorkoutResponse;
  return unwrapWorkout(response);
};

export const getActiveWalkingWorkout = async () => {
  const response = (await syncApi(
    apiConst.getActiveWalkingWorkout,
  )) as WalkingWorkoutResponse;
  if (!response.success) {
    throw new Error(response.message || 'Không thể tải buổi đi bộ hiện tại.');
  }
  return response.data?.workout ?? null;
};

export const updateWalkingWorkout = async (
  workoutId: string,
  steps: number,
  distanceMeters: number,
) => {
  const response = (await syncApi(apiConst.updateWalkingWorkout, {
    id: workoutId,
    steps,
    distanceMeters,
  })) as WalkingWorkoutResponse;
  return unwrapWorkout(response);
};

const updateWorkoutAction = async (
  api: typeof apiConst.pauseWalkingWorkout,
  workoutId: string,
) => {
  const response = (await syncApi(api, { id: workoutId })) as WalkingWorkoutResponse;
  return unwrapWorkout(response);
};

export const pauseWalkingWorkout = (workoutId: string) =>
  updateWorkoutAction(apiConst.pauseWalkingWorkout, workoutId);

export const resumeWalkingWorkout = (workoutId: string) =>
  updateWorkoutAction(apiConst.resumeWalkingWorkout, workoutId);

export const finishWalkingWorkout = async (workoutId: string) => {
  const response = (await syncApi(apiConst.finishWalkingWorkout, {
    id: workoutId,
  })) as WalkingWorkoutResponse;
  return unwrapWorkout(response);
};

export const getWalkingWorkoutHistory = async (
  from: string,
  to: string,
) => {
  const response = (await syncApi(apiConst.getWalkingWorkoutHistory, {
    from,
    to,
    page: 1,
    pageSize: 50,
  })) as WalkingWorkoutHistoryResponse;
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Không thể tải lịch sử đi bộ.');
  }
  return response.data;
};

export const getWalkingSummary = async (from: string, to: string) => {
  const response = (await syncApi(apiConst.getWalkingSummary, {
    from,
    to,
  })) as WalkingSummaryResponse;
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Không thể tải tổng kết đi bộ.');
  }
  return response.data as WalkingSummary;
};
