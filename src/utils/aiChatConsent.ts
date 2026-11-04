import { localStorage } from './storage';

const getConsentKey = (userId: string) => `ai-meal-chat-consent:${userId}`;

export const hasAiChatConsent = (userId: string) =>
  localStorage.getBoolean(getConsentKey(userId)) === true;

export const saveAiChatConsent = (userId: string, accepted: boolean) => {
  localStorage.set(getConsentKey(userId), accepted);
};
