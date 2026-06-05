import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Player from './components/Player';
import SearchSection from './components/SearchSection';
import { SpeedInsights } from '@vercel/speed-insights/react';
import ErrorBoundary from './components/ErrorBoundary';
import { Provider } from 'react-redux';
import { persistor, store } from './store';
import { PersistGate } from 'redux-persist/integration/react';
import { motion, AnimatePresence } from 'framer-motion';
import ToastContainer from './components/toast/ToastContainer';
import MiniPlayer from './components/MiniPlayer';
import { showToast, removeToast, closePlaylistModal, setLyricsOpen } from './features/ui/uiSlice';
import { useAppSelector, useAppDispatch } from './hooks/redux';
import { useState } from 'react';
import { getOfflineSongs } from './utils/db';
import { setDownloadedIds } from './features/library/librarySlice';
import { syncLibrary } from './features/library/libraryActions';
import { supabase } from './lib/supabase';
import { setUser } from './features/auth/authSlice';

const lazyRetry = (componentImport: () => Promise<any>) => {
    return lazy(async () => {
        try {
            return await componentImport();
        } catch (error) {
            // If the chunk load fails, try one reload
            console.error('Chunk load failed, reloading...', error);
            window.location.reload();
            return { default: () => null };
        }
    });
};

const Home = lazyRetry(() => import('./pages/Home'));
const AlbumDetails = lazyRetry(() => import('./pages/AlbumDetails'));
const ArtistPage = lazyRetry(() => import('./pages/ArtistPage'));
const PlaylistPage = lazyRetry(() => import('./pages/PlaylistPage'));
const Library = lazyRetry(() => import('./pages/Library'));
const Profile = lazyRetry(() => import('./pages/Profile'));

// Lazy load UI components
const SettingsDrawer = lazyRetry(() => import('./components/SettingsDrawer'));
const Queue = lazyRetry(() => import('./components/Queue'));
const Equalizer = lazyRetry(() => import('./components/Equalizer'));
const Lyrics = lazyRetry(() => import('./components/Lyrics'));
const AddToPlaylistModal = lazyRetry(() => import('./components/modals/AddToPlaylistModal'));

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
    <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
    >
        {children}
    </motion.div>
);

const AnimatedRoutes = () => {
    const location = useLocation();
    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route
                    path="/"
                    element={
                        <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
                            <PageWrapper><Home /></PageWrapper>
                        </Suspense>
                    }
                />
                <Route
                    path="/albums/:id"
                    element={
                        <Suspense fallback={<div className="p-10 text-center">Loading Album...</div>}>
                            <PageWrapper><AlbumDetails /></PageWrapper>
                        </Suspense>
                    }
                />
                <Route
                    path="/library"
                    element={
                        <Suspense fallback={<div className="p-10 text-center">Loading Library...</div>}>
                            <PageWrapper><Library /></PageWrapper>
                        </Suspense>
                    }
                />
                <Route
                    path="/artists/:id"
                    element={
                        <Suspense fallback={<div className="p-10 text-center">Loading Artist...</div>}>
                            <PageWrapper><ArtistPage /></PageWrapper>
                        </Suspense>
                    }
                />
                <Route
                    path="/playlists/:id"
                    element={
                        <Suspense fallback={<div className="p-10 text-center">Loading Playlist...</div>}>
                            <PageWrapper><PlaylistPage /></PageWrapper>
                        </Suspense>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <Suspense fallback={<div className="p-10 text-center">Loading Profile...</div>}>
                            <PageWrapper><Profile /></PageWrapper>
                        </Suspense>
                    }
                />
            </Routes>
        </AnimatePresence>
    );
};

import { useEffect } from 'react';

export const AppContent = () => {
    const dispatch = useAppDispatch();
    const { toasts, playlistModal, isLyricsOpen, isPlayerExpanded, isEqualizerOpen, theme } = useAppSelector(state => state.ui);
    const { currentSong, isSettingsOpen, isQueueOpen } = useAppSelector(state => state.musicPlayer);
    const [isMiniPlayerOpen, setIsMiniPlayerOpen] = useState(false);

    // Scroll Lock when overlays are open
    useEffect(() => {
        const shouldLock = isPlayerExpanded || isSettingsOpen || isQueueOpen || isEqualizerOpen || isLyricsOpen || playlistModal.isOpen;
        if (shouldLock) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isPlayerExpanded, isSettingsOpen, isQueueOpen, isEqualizerOpen, isLyricsOpen, playlistModal.isOpen]);

    useEffect(() => {
        // Sync Offline Downloads
        getOfflineSongs().then(songs => {
            const ids = songs.map(s => s.id);
            dispatch(setDownloadedIds(ids));
        });

        // Supabase Auth Listener
        supabase.auth.getSession().then(({ data: { session } }) => {
            dispatch(setUser(session?.user ?? null));
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            dispatch(setUser(session?.user ?? null));
            if (event === 'SIGNED_IN' && session?.user) {
                // Merge local library with cloud on sign in
                dispatch(syncLibrary({ merge: true }) as any);
            }
        });

        return () => subscription.unsubscribe();
    }, [dispatch]);

    useEffect(() => {
        if (!theme) return;

        if (theme.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        if (theme.isOled && theme.darkMode) {
            document.body.classList.add('oled-mode');
        } else {
            document.body.classList.remove('oled-mode');
        }
    }, [theme?.darkMode, theme?.isOled]);

    return (
        <div
            className={`dark:text-white min-h-screen font-sans selection:bg-primary selection:text-white pt-28 md:pt-20 transition-colors duration-500 ${theme?.isOled ? 'dark:!bg-black' : 'dark:bg-gray-950'}`}
            style={{ '--accent-color': theme?.accentColor || '#ef4444' } as React.CSSProperties}
        >
            <BrowserRouter>
                <Navbar />
                <SearchSection />
                <main className="max-w-7xl mx-auto px-4">
                    <AnimatePresence mode="wait">
                        <AnimatedRoutes />
                    </AnimatePresence>
                </main>
                <Player onShowMiniPlayer={() => setIsMiniPlayerOpen(true)} />
                <AnimatePresence>
                    {isMiniPlayerOpen && <MiniPlayer onClose={() => setIsMiniPlayerOpen(false)} />}
                </AnimatePresence>

                <Suspense fallback={null}>
                    <SettingsDrawer />
                    <Queue />
                    <Equalizer />
                    <AddToPlaylistModal
                        song={playlistModal.song}
                        bulkSongs={playlistModal.bulkSongs}
                        onClose={() => dispatch(closePlaylistModal())}
                        onSuccess={(name: string) => dispatch(showToast({ message: `Added to ${name}` }))}
                        onError={(msg: string) => dispatch(showToast({ message: msg, type: 'error' }))}
                    />
                </Suspense>

                <ToastContainer
                    toasts={toasts}
                    removeToast={(id) => dispatch(removeToast(id))}
                />
            </BrowserRouter>
        </div>
    );
};

export default function App() {
    return (
        <ErrorBoundary>
            <Provider store={store}>
                <PersistGate loading={null} persistor={persistor}>
                    <AppContent />
                    <SpeedInsights />
                </PersistGate>
            </Provider>
        </ErrorBoundary>
    );
}
