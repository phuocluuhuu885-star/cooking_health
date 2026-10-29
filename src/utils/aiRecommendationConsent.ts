import { localStorage } from './storage';

const getConsentKey = (userId: string) =>
  `ai-meal-recommendation-consent:${userId}`;

export const hasAiRecommendationConsent = (userId: string) =>
  localStorage.getBoolean(getConsentKey(userId)) === true;

export const saveAiRecommendationConsent = (
  userId: string,
  accepted: boolean,
) => {
  localStorage.set(getConsentKey(userId), accepted);
};
