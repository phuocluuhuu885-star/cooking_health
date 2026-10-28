import type { EmitterSubscription } from 'react-native';
import type { WalkingLocationPoint } from './types/walking';

const EARTH_RADIUS_METERS = 6_371_000;
const MAX_GPS_ACCURACY_METERS = 35;
const MAX_WALKING_SPEED_METERS_PER_SECOND = 5.5;

export const createWalkingClientSessionId = () =>
  `walk_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;

export const stopWalkingTrackingSubscriptions = (
  subscriptions: EmitterSubscription[],
): void => {
  subscriptions.forEach(subscription => subscription.remove());
  subscriptions.splice(0, subscriptions.length);
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const getDistanceBetweenPointsMeters = (
  first: Pick<WalkingLocationPoint, 'latitude' | 'longitude'>,
  second: Pick<WalkingLocationPoint, 'latitude' | 'longitude'>,
) => {
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
};

export const filterWalkingLocationPoint = (
  previous: WalkingLocationPoint | null,
  candidate: WalkingLocationPoint,
): { point: WalkingLocationPoint; addedDistanceMeters: number } | null => {
  if (
    !Number.isFinite(candidate.latitude) ||
    !Number.isFinite(candidate.longitude) ||
    Math.abs(candidate.latitude) > 90 ||
    Math.abs(candidate.longitude) > 180 ||
    !Number.isFinite(candidate.accuracy) ||
    candidate.accuracy <= 0 ||
    candidate.accuracy > MAX_GPS_ACCURACY_METERS ||
    !Number.isFinite(candidate.timestamp)
  ) {
    return null;
  }
  if (!previous) {
    return { point: candidate, addedDistanceMeters: 0 };
  }

  const elapsedSeconds = (candidate.timestamp - previous.timestamp) / 1000;
  if (elapsedSeconds <= 0) {
    return null;
  }
  const distanceMeters = getDistanceBetweenPointsMeters(previous, candidate);
  const minimumMovementMeters = Math.max(
    1.5,
    (previous.accuracy + candidate.accuracy) * 0.15,
  );
  if (distanceMeters < minimumMovementMeters) {
    return { point: candidate, addedDistanceMeters: 0 };
  }
  if (distanceMeters / elapsedSeconds > MAX_WALKING_SPEED_METERS_PER_SECOND) {
    return null;
  }
  return { point: candidate, addedDistanceMeters: distanceMeters };
};
