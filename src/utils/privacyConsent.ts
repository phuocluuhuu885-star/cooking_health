import { localStorage } from './storage';

export const PRIVACY_POLICY_VERSION = '2026-10-28';
const PRIVACY_POLICY_CONSENT_KEY = 'privacy-policy-consent-version';

export const hasAcceptedPrivacyPolicy = () =>
  localStorage.getString(PRIVACY_POLICY_CONSENT_KEY) === PRIVACY_POLICY_VERSION;

export const savePrivacyPolicyConsent = () => {
  localStorage.set(PRIVACY_POLICY_CONSENT_KEY, PRIVACY_POLICY_VERSION);
};
