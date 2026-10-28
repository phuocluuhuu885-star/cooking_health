import * as React from 'react';
import { createStaticNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import StackScreen from './utils/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoadingIndicator from './components/loading';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { getDeviceID, setDeviceID } from './utils/syncUtils';
import { setupStore } from './reduxs/store';
import type { StoreAndPersistor } from './reduxs/store';
import HouseholdMealReminderProvider from './screens/household/HouseholdMealReminderProvider';
import { createStateSetter } from './utils/stateUtils';

const StackNavigation = createStaticNavigation(StackScreen);

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: 'black',
  },
  startupError: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  startupErrorText: {
    fontSize: 16,
    color: 'black',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryText: {
    color: '#2F6B4F',
    fontWeight: '600',
  },
});

const LoadingScreen = React.memo(() => {
  return (
    <View style={styles.loadingScreen}>
      <Text style={styles.loadingText}>Đang tải...</Text>
    </View>
  );
});

export default function App() {
  const [state, setState] = React.useState<{
    storeAndPersistor: StoreAndPersistor | null;
    startupError: string | null;
  }>({
    storeAndPersistor: null,
    startupError: null,
  });
  const { storeAndPersistor, startupError } = state;
  const setStoreAndPersistor = React.useMemo(
    () => createStateSetter(setState, 'storeAndPersistor'),
    [setState],
  );
  const setStartupError = React.useMemo(
    () => createStateSetter(setState, 'startupError'),
    [setState],
  );

  const startApp = React.useCallback(async () => {
    setStartupError(null);
    try {
      const deviceID = getDeviceID();
      setDeviceID(deviceID || '');
      const initializedStore = await setupStore();
      setStoreAndPersistor(initializedStore);
    } catch (error) {
      console.error('Failed to initialize the application', error);
      setStartupError('Không thể khởi tạo ứng dụng. Vui lòng thử lại.');
    }
  }, [setStartupError, setStoreAndPersistor]);

  React.useEffect(() => {
    startApp();
  }, [startApp]);

  if (!storeAndPersistor) {
    return startupError ? (
      <View style={styles.startupError}>
        <Text style={styles.startupErrorText}>
          {startupError}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={startApp}
          style={styles.retryButton}
        >
          <Text style={styles.retryText}>Thử lại</Text>
        </Pressable>
      </View>
    ) : (
      <LoadingScreen />
    );
  }

  return (
    <SafeAreaProvider>
      <Provider store={storeAndPersistor.store}>
        <PersistGate
          loading={<LoadingScreen />}
          persistor={storeAndPersistor.persistor}
        >
          <HouseholdMealReminderProvider>
            <StackNavigation />
            <LoadingIndicator />
          </HouseholdMealReminderProvider>
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
}
