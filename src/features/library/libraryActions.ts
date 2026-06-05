import { createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '../../lib/supabase';
import { RootState } from '../../store';
import { Song } from '../../types/music';
import { setFavorites, setPlaylists, setSyncing, setLastSynced, toggleFavorite, createPlaylist, addToPlaylist, addBulkToPlaylist, removeFromPlaylist } from './librarySlice';
import { showToast } from '../ui/uiSlice';
import { fetchSettings } from '../settings/settingsActions';

export const syncLibrary = createAsyncThunk(
    'library/sync',
    async (options: { merge?: boolean; silent?: boolean } = {}, { getState, dispatch }) => {
        const state = getState() as RootState;
        const user = state.auth.user;
        const localFavorites = state.library.favorites;
        const localPlaylists = state.library.playlists;

        if (!user) return;

        dispatch(setSyncing(true));
        try {
            // 1. Sync Favorites
            const { data: cloudFavs, error: favError } = await supabase
                .from('favorites')
                .select('song_id, song_data')
                .eq('user_id', user.id);

            if (favError) throw favError;

            let finalFavorites = cloudFavs?.map(f => f.song_data as Song) || [];

            if (options.merge) {
                // Merge local into cloud
                const cloudIds = new Set(finalFavorites.map(s => s.id));
                const newToCloud = localFavorites.filter(s => !cloudIds.has(s.id));

                if (newToCloud.length > 0) {
                    const upserts = newToCloud.map(song => ({
                        user_id: user.id,
                        song_id: song.id,
                        song_data: song
                    }));
                    await supabase.from('favorites').upsert(upserts);
                    finalFavorites = [...finalFavorites, ...newToCloud];
                }
            }
            dispatch(setFavorites(finalFavorites));

            // 2. Sync Playlists
            const { data: cloudPlaylists, error: pleError } = await supabase
                .from('playlists')
                .select('*')
                .eq('user_id', user.id);

            if (pleError) throw pleError;

            let finalPlaylists = cloudPlaylists?.map(p => ({
                id: p.id,
                name: p.name,
                songs: p.songs_data as Song[]
            })) || [];

            if (options.merge) {
                // Merge local playlists into cloud
                // For simplicity, we merge playlists by name or ID
                const cloudIds = new Set(finalPlaylists.map(p => p.id));
                const newToCloudPlaylists = localPlaylists.filter(p => !cloudIds.has(p.id));

                if (newToCloudPlaylists.length > 0) {
                    const upserts = newToCloudPlaylists.map(p => ({
                        id: p.id,
                        user_id: user.id,
                        name: p.name,
                        songs_data: p.songs
                    }));
                    await supabase.from('playlists').upsert(upserts);
                    finalPlaylists = [...finalPlaylists, ...newToCloudPlaylists];
                }
            }
            dispatch(setPlaylists(finalPlaylists));

            dispatch(setLastSynced(new Date().toISOString()));
            // 3. Sync Settings (Cloud overrides local as requested)
            await dispatch(fetchSettings() as any);

            if (!options.silent) {
                dispatch(showToast({ message: 'Library synced successfully' }));
            }
        } catch (error) {
            console.error('Error syncing library:', error);
            if (!options.silent) {
                dispatch(showToast({ message: 'Sync failed', type: 'error' }));
            }
        } finally {
            dispatch(setSyncing(false));
        }
    }
);

export const toggleFavoriteCloud = createAsyncThunk(
    'library/toggleFavoriteCloud',
    async (song: Song, { getState, dispatch }) => {
        const state = getState() as RootState;
        const user = state.auth.user;
        const isFavorite = state.library.favorites.some(s => s.id === song.id);

        // Update local state first for responsiveness
        dispatch(toggleFavorite(song));

        if (!user) return;

        try {
            if (isFavorite) {
                await supabase.from('favorites').delete().eq('user_id', user.id).eq('song_id', song.id);
            } else {
                await supabase.from('favorites').upsert({
                    user_id: user.id,
                    song_id: song.id,
                    song_data: song
                });
            }
        } catch (error) {
            console.error('Error toggling favorite on cloud:', error);
            // Optional: rollback local state on error?
        }
    }
);

export const uploadFavorite = createAsyncThunk(
    'library/uploadFavorite',
    async (song: Song, { getState }) => {
        const state = getState() as RootState;
        const user = state.auth.user;
        if (!user) return;

        await supabase.from('favorites').upsert({
            user_id: user.id,
            song_id: song.id,
            song_data: song
        });
    }
);

export const removeFavoriteCloud = createAsyncThunk(
    'library/removeFavorite',
    async (songId: string, { getState }) => {
        const state = getState() as RootState;
        const user = state.auth.user;
        if (!user) return;

        await supabase.from('favorites').delete().eq('user_id', user.id).eq('song_id', songId);
    }
);

export const savePlaylistCloud = createAsyncThunk(
    'library/savePlaylist',
    async (playlist: { id: string; name: string; songs: Song[] }, { getState }) => {
        const state = getState() as RootState;
        const user = state.auth.user;
        if (!user) return;

        try {
            const { error } = await supabase.from('playlists').upsert({
                id: playlist.id,
                user_id: user.id,
                name: playlist.name,
                songs_data: playlist.songs
            });
            if (error) throw error;
        } catch (error) {
            console.error('Error saving playlist to cloud:', error);
        }
    }
);

export const deletePlaylistCloud = createAsyncThunk(
    'library/deletePlaylist',
    async (playlistId: string, { getState }) => {
        const state = getState() as RootState;
        const user = state.auth.user;
        if (!user) return;

        try {
            const { error } = await supabase.from('playlists').delete().eq('user_id', user.id).eq('id', playlistId);
            if (error) throw error;
        } catch (error) {
            console.error('Error deleting playlist from cloud:', error);
        }
    }
);

export const createPlaylistCloud = createAsyncThunk(
    'library/createPlaylistCloud',
    async (payload: { name: string; song?: Song; songs?: Song[]; id?: string }, { getState, dispatch }) => {
        const id = payload.id || crypto.randomUUID();
        const songs = payload.songs ? payload.songs : (payload.song ? [payload.song] : []);

        // Update local state
        dispatch(createPlaylist({ ...payload, id, songs }));

        // Sync to cloud
        dispatch(savePlaylistCloud({ id, name: payload.name, songs }) as any);
    }
);

export const addToPlaylistCloud = createAsyncThunk(
    'library/addToPlaylistCloud',
    async (payload: { playlistId: string; song: Song }, { getState, dispatch }) => {
        const state = getState() as RootState;
        const playlist = state.library.playlists.find(p => p.id === payload.playlistId);
        if (!playlist) return;

        if (playlist.songs.find(s => s.id === payload.song.id)) return;

        // Update local state
        dispatch(addToPlaylist(payload));

        // Sync to cloud
        const updatedPlaylist = { ...playlist, songs: [...playlist.songs, payload.song] };
        dispatch(savePlaylistCloud(updatedPlaylist) as any);
    }
);

export const addBulkToPlaylistCloud = createAsyncThunk(
    'library/addBulkToPlaylistCloud',
    async (payload: { playlistId: string; songs: Song[] }, { getState, dispatch }) => {
        const state = getState() as RootState;
        const playlist = state.library.playlists.find(p => p.id === payload.playlistId);
        if (!playlist) return;

        // Update local state
        dispatch(addBulkToPlaylist(payload));

        // Sync to cloud
        const existingSongIds = new Set(playlist.songs.map(s => s.id));
        const newSongs = payload.songs.filter(s => !existingSongIds.has(s.id));
        const updatedPlaylist = { ...playlist, songs: [...playlist.songs, ...newSongs] };
        dispatch(savePlaylistCloud(updatedPlaylist) as any);
    }
);

export const removeFromPlaylistCloud = createAsyncThunk(
    'library/removeFromPlaylistCloud',
    async (payload: { playlistId: string; songId: string }, { getState, dispatch }) => {
        const state = getState() as RootState;
        const playlist = state.library.playlists.find(p => p.id === payload.playlistId);
        if (!playlist) return;

        // Update local state
        dispatch(removeFromPlaylist(payload));

        // Sync to cloud
        const updatedPlaylist = { ...playlist, songs: playlist.songs.filter(s => s.id !== payload.songId) };
        dispatch(savePlaylistCloud(updatedPlaylist) as any);
    }
);
