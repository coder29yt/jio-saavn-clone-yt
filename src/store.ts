import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // Use local storage for persistence
import { combineReducers } from '@reduxjs/toolkit';
import musicPlayerReducer from './features/musicplayer/musicPlayerSlice';
import languageReducer from './features/language/languageSlice';
import libraryReducer from './features/library/librarySlice';
import uiReducer from './features/ui/uiSlice';
import authReducer from './features/auth/authSlice';
import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { uploadSettings } from './features/settings/settingsActions';
import { setLanguage } from './features/language/languageSlice';
import { setAccentColor, setDarkMode, setOledMode } from './features/ui/uiSlice';
import {
    setPreferredQuality,
    setEqualizerEnabled,
    setEqualizerBand,
    setEqualizerPreset,
    setGaplessEnabled,
    setCrossfadeDuration,
    setSongRadioEnabled,
    setWifiOnly,
    setVisualizerStyle,
    toggleRepeatMode,
    toggleShuffle
} from './features/musicplayer/musicPlayerSlice';

// Create listener middleware for automatic settings sync
const settingsListener = createListenerMiddleware();

settingsListener.startListening({
    matcher: isAnyOf(
        setLanguage,
        setAccentColor,
        setDarkMode,
        setOledMode,
        setPreferredQuality,
        setEqualizerEnabled,
        setEqualizerBand,
        setEqualizerPreset,
        setGaplessEnabled,
        setCrossfadeDuration,
        setSongRadioEnabled,
        setWifiOnly,
        setVisualizerStyle,
        toggleRepeatMode,
        toggleShuffle
    ),
    effect: async (action, listenerApi) => {
        // Debounce or just upload? user asked for "immediately"
        // We'll use a small debounce to avoid spamming the DB during rapid changes (like slider moves)
        // listenerApi.cancelActiveInstances() is removed as it can cause TypeErrors in some environments
        await listenerApi.delay(1000);

        // Avoid uploading if we are currently fetching settings (e.g. on login/sync)
        const state = listenerApi.getState() as RootState;
        if (state.library.isSyncing) return;

        listenerApi.dispatch(uploadSettings() as any);
    },
});

// Combine reducers
const rootReducer = combineReducers({
    musicPlayer: musicPlayerReducer,
    language: languageReducer,
    library: libraryReducer,
    ui: uiReducer,
    auth: authReducer,
});

const persistConfig = {
    key: 'root',
    storage,
    whitelist: ['musicPlayer', 'language', 'library', 'ui', 'auth'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }).prepend(settingsListener.middleware),
});

if (import.meta.env.DEV) {
    (window as any).__REDUX_STORE__ = store;
}

export const persistor = persistStore(store);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
