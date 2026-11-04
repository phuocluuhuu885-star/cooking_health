import type { EmitterSubscription } from 'react-native';

export const createWalkingClientSessionId = () =>
  `walk_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;

export const stopWalkingTrackingSubscriptions = (
  subscriptions: EmitterSubscription[],
): void => {
  subscriptions.forEach(subscription => subscription.remove());
  subscriptions.splice(0, subscriptions.length);
};
