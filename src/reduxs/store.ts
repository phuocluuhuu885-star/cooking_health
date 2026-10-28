import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import {
    persistStore, persistReducer,
    FLUSH,
    REHYDRATE,
    PAUSE,
    PERSIST,
    PURGE,
    REGISTER
} from 'redux-persist';
import { Storage } from 'redux-persist';
import { createMMKVStorage } from '../utils/storage';
import reducer from './reduces/index';

export async function setupStore() {
    const mmkv = await createMMKVStorage();
    const reduxStorage: Storage = {
        setItem: (key: string, value: string): Promise<void> => {
            try {
                mmkv.set(key, value);
            } catch (err) {
                console.error("setItem", err);
            }
            return Promise.resolve();
        },
        getItem: (key: string): Promise<string | null> => {
            try {
                const value = mmkv.getString(key);
                return Promise.resolve(value ?? null);
            } catch (err) {
                console.error("setItem", err);
            }
            return Promise.resolve(null);;
        },
        removeItem: (key: string): Promise<void> => {
            try {
                mmkv.remove(key);
            } catch (err) {
                console.error("setItem", err);
            }
            return Promise.resolve();
        },
    };

    const persistConfig = {
        key: 'root',
        storage: reduxStorage,
        timeout: 10000,
        blacklist: []
    }
    const persistedReducer = persistReducer(persistConfig, reducer);
    const store = configureStore({
        reducer: persistedReducer,
        middleware: (getDefaultMiddleware) => getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
            },
        })
    });

    const persistor = persistStore(store);
    return { store, persistor };
}

export type StoreAndPersistor = Awaited<ReturnType<typeof setupStore>>;
export type AppStore = StoreAndPersistor['store'];
export type AppDispatch = AppStore['dispatch'];
export type RootState = ReturnType<typeof reducer>;
export const useAppDispatch = () => useDispatch<AppDispatch>();
