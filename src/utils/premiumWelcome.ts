import { localStorage } from './storage';

const getSeenKey = (userId: string) => `premium-welcome-seen:${userId}`;
const getPendingKey = (userId: string) => `premium-welcome-pending:${userId}`;

export const queuePremiumWelcome = (userId: string) => {
  if (localStorage.getBoolean(getSeenKey(userId)) !== true) {
    localStorage.set(getPendingKey(userId), true);
  }
};

export const isPremiumWelcomePending = (userId: string) =>
  localStorage.getBoolean(getPendingKey(userId)) === true;

export const markPremiumWelcomeSeen = (userId: string) => {
  localStorage.set(getSeenKey(userId), true);
  localStorage.remove(getPendingKey(userId));
};
