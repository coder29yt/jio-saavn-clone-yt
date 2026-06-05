import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Song } from '../../types/music';

export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface UIState {
    toasts: Toast[];
    playlistModal: {
        isOpen: boolean;
        song: Song | null;
        bulkSongs?: Song[];
    };
    isEqualizerOpen: boolean;
    isLyricsOpen: boolean;
    isPlayerExpanded: boolean;
    theme: {
        accentColor: string;
        isOled: boolean;
        darkMode: boolean;
    };
}

const initialState: UIState = {
    toasts: [],
    playlistModal: {
        isOpen: false,
        song: null,
    },
    isEqualizerOpen: false,
    isLyricsOpen: false,
    isPlayerExpanded: false,
    theme: {
        accentColor: '#ef4444', // Default red-500
        isOled: false,
        darkMode: true,
    },
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        showToast: (state, action: PayloadAction<{ message: string; type?: Toast['type'] }>) => {
            state.toasts.push({
                id: Date.now().toString(),
                message: action.payload.message,
                type: action.payload.type || 'success',
            });
        },
        removeToast: (state, action: PayloadAction<string>) => {
            state.toasts = state.toasts.filter((t) => t.id !== action.payload);
        },
        openPlaylistModal: (state, action: PayloadAction<Song | Song[]>) => {
            state.playlistModal.isOpen = true;
            if (Array.isArray(action.payload)) {
                state.playlistModal.bulkSongs = action.payload;
                state.playlistModal.song = action.payload[0] || null;
            } else {
                state.playlistModal.song = action.payload;
                state.playlistModal.bulkSongs = undefined;
            }
        },
        closePlaylistModal: (state) => {
            state.playlistModal.isOpen = false;
            state.playlistModal.song = null;
            state.playlistModal.bulkSongs = undefined;
        },
        setEqualizerOpen: (state, action: PayloadAction<boolean>) => {
            state.isEqualizerOpen = action.payload;
        },
        setLyricsOpen: (state, action: PayloadAction<boolean>) => {
            state.isLyricsOpen = action.payload;
        },
        setPlayerExpanded: (state, action: PayloadAction<boolean>) => {
            state.isPlayerExpanded = action.payload;
        },
        setAccentColor: (state, action: PayloadAction<string>) => {
            state.theme.accentColor = action.payload;
        },
        setOledMode: (state, action: PayloadAction<boolean>) => {
            state.theme.isOled = action.payload;
            if (action.payload) {
                state.theme.darkMode = true;
            }
        },
        setDarkMode: (state, action: PayloadAction<boolean>) => {
            state.theme.darkMode = action.payload;
            if (!action.payload) {
                state.theme.isOled = false;
            }
        },
        applyThemeSettings: (state, action: PayloadAction<UIState['theme']>) => {
            state.theme = { ...state.theme, ...action.payload };
        },
    },
});

export const {
    showToast,
    removeToast,
    openPlaylistModal,
    closePlaylistModal,
    setEqualizerOpen,
    setLyricsOpen,
    setPlayerExpanded,
    setAccentColor,
    setOledMode,
    setDarkMode,
    applyThemeSettings
} = uiSlice.actions;
export default uiSlice.reducer;
