import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';
import { useIsFocused } from '@react-navigation/native';
import { initializeGoogleMobileAds } from '../../utils/googleMobileAds';

const TestBannerAd = () => {
  const isFocused = useIsFocused();
  const [initialized, setInitialized] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const handleAdFailedToLoad = useCallback((error: Error) => {
    console.warn('Test banner ad failed to load', error);
    setLoadFailed(true);
  }, []);

  useEffect(() => {
    if (!isFocused) {
      return undefined;
    }
    let active = true;
    initializeGoogleMobileAds()
      .then(() => {
        if (active) {
          setInitialized(true);
        }
      })
      .catch(error => {
        console.error('Failed to initialize Google Mobile Ads SDK', error);
      });

    return () => {
      active = false;
    };
  }, [isFocused]);

  if (!isFocused || !initialized || loadFailed) {
    return null;
  }

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={TestIds.BANNER}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={handleAdFailedToLoad}
      />
    </View>
  );
};

export default TestBannerAd;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginVertical: 8,
  },
});
