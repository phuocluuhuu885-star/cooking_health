import {
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
  type EmitterSubscription,
} from 'react-native';
import type {
  WalkingLocationPoint,
  WalkingStepUpdate,
  WalkingTrackingStatus,
} from './types/walking';

type WalkingTrackingSupport = {
  stepsAvailable: boolean;
  gpsAvailable: boolean;
};

type WalkingTrackingNativeModule = {
  isSupported: () => Promise<WalkingTrackingSupport>;
  startTracking: (
    sessionId: string,
    previousSteps: number,
    previousDistanceMeters: number,
    enableSteps: boolean,
  ) => Promise<WalkingTrackingSupport>;
  getTrackingSnapshot: () => Promise<WalkingTrackingSnapshot>;
  stopTracking: () => Promise<void>;
  clearSession: (sessionId: string) => Promise<void>;
};

export type WalkingTrackingSnapshot = {
  sessionId: string | null;
  steps: number;
  distanceMeters: number;
  running: boolean;
  lastUpdateAt: number;
};

const getNativeModule = (): WalkingTrackingNativeModule => {
  const nativeModule = NativeModules.WalkingTracking as
    | WalkingTrackingNativeModule
    | undefined;
  if (
    !nativeModule ||
    typeof nativeModule.isSupported !== 'function' ||
    typeof nativeModule.startTracking !== 'function' ||
    typeof nativeModule.getTrackingSnapshot !== 'function' ||
    typeof nativeModule.stopTracking !== 'function' ||
    typeof nativeModule.clearSession !== 'function'
  ) {
    throw new Error('Bản cài đặt hiện tại chưa có module cảm biến đi bộ.');
  }
  return nativeModule;
};

const getEventEmitter = () => {
  getNativeModule();
  return new NativeEventEmitter(NativeModules.WalkingTracking);
};

export const checkWalkingSensorSupport = () =>
  getNativeModule().isSupported();

export const requestWalkingPermissions = async () => {
  if (Platform.OS !== 'android') {
    return { enableSteps: true, enableGps: true };
  }

  const requestedPermissions: Array<
    Parameters<typeof PermissionsAndroid.requestMultiple>[0][number]
  > = [];
  if (Number(Platform.Version) >= 33) {
    requestedPermissions.push(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
  }
  if (Number(Platform.Version) >= 29) {
    requestedPermissions.push(
      PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
    );
  }
  requestedPermissions.push(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  );
  const results = await PermissionsAndroid.requestMultiple(
    requestedPermissions,
  );
  const enableSteps =
    Number(Platform.Version) < 29 ||
    results[PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION] ===
      PermissionsAndroid.RESULTS.GRANTED;
  const enableGps =
    results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
      PermissionsAndroid.RESULTS.GRANTED ||
    results[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
      PermissionsAndroid.RESULTS.GRANTED;
  return { enableSteps, enableGps };
};

export const startNativeWalkingTracking = (
  sessionId: string,
  previousSteps: number,
  previousDistanceMeters: number,
  enableSteps: boolean,
) =>
  getNativeModule().startTracking(
    sessionId,
    previousSteps,
    previousDistanceMeters,
    enableSteps,
  );

export const getNativeWalkingTrackingSnapshot = () =>
  getNativeModule().getTrackingSnapshot();
export const stopNativeWalkingTracking = () =>
  getNativeModule().stopTracking();

export const clearNativeWalkingSession = (sessionId: string) =>
  getNativeModule().clearSession(sessionId);

export const subscribeWalkingStepUpdates = (
  listener: (event: WalkingStepUpdate) => void,
): EmitterSubscription =>
  getEventEmitter().addListener('WalkingStepUpdate', (event: Object) =>
    listener(event as WalkingStepUpdate),
  );

export const subscribeWalkingLocationUpdates = (
  listener: (event: WalkingLocationPoint) => void,
): EmitterSubscription =>
  getEventEmitter().addListener('WalkingLocationUpdate', (event: Object) =>
    listener(event as WalkingLocationPoint),
  );

export const subscribeWalkingTrackingStatus = (
  listener: (event: WalkingTrackingStatus) => void,
): EmitterSubscription =>
  getEventEmitter().addListener('WalkingTrackingStatus', (event: Object) =>
    listener(event as WalkingTrackingStatus),
  );
