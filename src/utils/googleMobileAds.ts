import mobileAds from 'react-native-google-mobile-ads';

let initializationPromise: Promise<unknown> | undefined;

export const initializeGoogleMobileAds = () => {
  if (!initializationPromise) {
    initializationPromise = mobileAds()
      .initialize()
      .catch(error => {
        initializationPromise = undefined;
        throw error;
      });
  }
  return initializationPromise;
};
