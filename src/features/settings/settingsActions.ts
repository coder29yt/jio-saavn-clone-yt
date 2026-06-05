import { createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';
import { RootState } from '../../store';
import { applyThemeSettings } from '../ui/uiSlice';
import { applyMusicPlayerSettings } from '../musicplayer/musicPlayerSlice';
import { setLanguage } from '../language/languageSlice';

export const uploadSettings = createAsyncThunk(
    'settings/upload',
    async (_, { getState }) => {
        const state = getState() as RootState;
        const user = state.auth.user;
        if (!user) return;

        const settings = {
            language: state.language.language,
            theme: state.ui.theme,
            musicPlayer: {
                preferredQuality: state.musicPlayer.preferredQuality,
                equalizerSettings: state.musicPlayer.equalizerSettings,
                isGaplessEnabled: state.musicPlayer.isGaplessEnabled,
                crossfadeDuration: state.musicPlayer.crossfadeDuration,
                isSongRadioEnabled: state.musicPlayer.isSongRadioEnabled,
                downloadSettings: state.musicPlayer.downloadSettings,
                visualizerStyle: state.musicPlayer.visualizerStyle,
                repeatMode: state.musicPlayer.repeatMode,
                shuffle: state.musicPlayer.shuffle,
            }
        };

        try {
            const { error } = await supabase
                .from('user_settings')
                .upsert({
                    user_id: user.id,
                    settings: settings,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) {
                console.error('Supabase error uploading settings:', error);
                throw error;
            }
        } catch (error) {
            console.error('Error uploading settings:', error);
        }
    }
);

export const fetchSettings = createAsyncThunk(
    'settings/fetch',
    async (_, { getState, dispatch }) => {
        const state = getState() as RootState;
        const user = state.auth.user;
        if (!user) return;

        try {
            // Using .select().eq().limit(1) is more robust than .maybeSingle()
            // in preventing PGRST116/406 errors.
            const { data, error } = await supabase
                .from('user_settings')
                .select('settings')
                .eq('user_id', user.id)
                .limit(1);

            if (error) {
                console.error('Supabase error fetching settings:', error);
                throw error;
            }

            if (data && data.length > 0 && data[0].settings) {
                const settings = data[0].settings;
                if (settings.language) {
                    dispatch(setLanguage(settings.language));
                }
                if (settings.theme) {
                    dispatch(applyThemeSettings(settings.theme));
                }
                if (settings.musicPlayer) {
                    dispatch(applyMusicPlayerSettings(settings.musicPlayer));
                }
            } else {
                // If no settings exist in cloud, upload current local settings
                console.log('No cloud settings found, uploading local settings...');
                dispatch(uploadSettings() as any);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    }
);
