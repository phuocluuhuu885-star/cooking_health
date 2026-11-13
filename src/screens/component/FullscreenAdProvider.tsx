import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { TestIds, useInterstitialAd } from 'react-native-google-mobile-ads';
import { useSelector } from 'react-redux';
import { selectUserInfo } from '../../reduxs/reduces/user';
import { initializeGoogleMobileAds } from '../../utils/googleMobileAds';
import { localStorage } from '../../utils/storage';

const INTERSTITIAL_COOLDOWN_MS = 2 * 60 * 1000;
const LAST_INTERSTITIAL_SHOWN_KEY = 'fullscreen-interstitial-last-shown';
const LEGACY_LAST_SHOWN_KEY = 'recipe-detail-interstitial-last-shown';
const INTERSTITIAL_CONTEXT_ERROR =
  'useFullscreenAdOnFocus must be used within FullscreenAdProvider.';

const FullscreenAdContext = createContext<(() => void) | null>(null);

export const FullscreenAdProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const user = useSelector(selectUserInfo);
  const initializedRef = useRef(false);
  const showAttemptedRef = useRef(false);
  const statusRef = useRef('idle');
  const {
    status,
    error,
    load: loadInterstitial,
    show: showInterstitial,
  } = useInterstitialAd({
    adUnitId: TestIds.INTERSTITIAL,
    autoLoad: false,
    requestOptions: { requestNonPersonalizedAdsOnly: true },
  });
  statusRef.current = status;

  const loadIfNeeded = useCallback(() => {
    if (
      !initializedRef.current ||
      statusRef.current === 'loading' ||
      statusRef.current === 'loaded' ||
      statusRef.current === 'showing'
    ) {
      return;
    }

    try {
      loadInterstitial();
    } catch (loadError) {
      console.error('Failed to load fullscreen interstitial ad', loadError);
    }
  }, [loadInterstitial]);

  useEffect(() => {
    if (!user?.accessToken) return undefined;
    let active = true;
    initializeGoogleMobileAds()
      .then(() => {
        if (!active) return;
        initializedRef.current = true;
        loadIfNeeded();
      })
      .catch(initializationError => {
        if (active) {
          console.error(
            'Failed to initialize Google Mobile Ads SDK',
            initializationError,
          );
        }
      });

    return () => {
      active = false;
    };
  }, [loadIfNeeded, user?.accessToken]);

  useEffect(() => {
    if (status === 'showing') {
      const shownAt = Date.now();
      localStorage.set(LAST_INTERSTITIAL_SHOWN_KEY, shownAt);
      showAttemptedRef.current = true;
    } else if (status === 'closed') {
      showAttemptedRef.current = false;
      loadIfNeeded();
    } else if (status === 'error' || status === 'no-fill') {
      showAttemptedRef.current = false;
    }
  }, [loadIfNeeded, status]);

  useEffect(() => {
    if (error) {
      console.warn('Fullscreen interstitial ad failed', error);
    }
  }, [error]);

  const requestInterstitial = useCallback(() => {
    if (!user?.accessToken) return;

    const lastShownAt = Math.max(
      localStorage.getNumber(LAST_INTERSTITIAL_SHOWN_KEY) ?? 0,
      localStorage.getNumber(LEGACY_LAST_SHOWN_KEY) ?? 0,
    );
    if (Date.now() - lastShownAt < INTERSTITIAL_COOLDOWN_MS) return;

    if (statusRef.current === 'loaded' && !showAttemptedRef.current) {
      showAttemptedRef.current = true;
      try {
        showInterstitial();
      } catch (showError) {
        showAttemptedRef.current = false;
        console.error('Failed to show fullscreen interstitial ad', showError);
      }
      return;
    }

    loadIfNeeded();
  }, [loadIfNeeded, showInterstitial, user?.accessToken]);

  return (
    <FullscreenAdContext.Provider value={requestInterstitial}>
      {children}
    </FullscreenAdContext.Provider>
  );
};

export const useFullscreenAdOnFocus = () => {
  const requestInterstitial = useContext(FullscreenAdContext);
  if (!requestInterstitial) {
    throw new Error(INTERSTITIAL_CONTEXT_ERROR);
  }

  useFocusEffect(
    useCallback(() => {
      requestInterstitial();
    }, [requestInterstitial]),
  );
};
