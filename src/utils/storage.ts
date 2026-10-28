import { create } from 'axios';
import { createMMKV } from 'react-native-mmkv';

async function getEncryptionKey(): Promise<string> {

    return `meal_cyqQmUwd0wL`;
}

const MEALKEY = `meal_cyqQmUwd0wL`;

export async function createMMKVStorage() {
    const key = await getEncryptionKey();
  
    return createMMKV({
      id: 'redux',
      encryptionKey: key,
    });
  }

export const localStorage = createMMKV({
  id: 'meal-local-storage',
  encryptionKey: MEALKEY,
});

export const isWorkingApp = () => {
  const isAppWorking = localStorage.getBoolean('is-app-working');
  return isAppWorking;
};

export const setWorkingApp = () => {
  localStorage.set('is-app-working', true);
};
