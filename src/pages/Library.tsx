import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { deletePlaylist, updatePlaylistSongs } from '../features/library/librarySlice';
import { savePlaylistCloud, deletePlaylistCloud, toggleFavoriteCloud, createPlaylistCloud, removeFromPlaylistCloud } from '../features/library/libraryActions';
import { playMusic, setSongs } from '../features/musicplayer/musicPlayerSlice';
import { IoAdd, IoHeart, IoTrash, IoMusicalNote, IoGridOutline, IoListOutline, IoFilterOutline, IoCloudDownload, IoPlay, IoShuffle } from 'react-icons/io5';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getOfflineSongs, OfflineSong, deleteOfflineSong } from '../utils/db';
import { removeDownloadedId } from '../features/library/librarySlice';
import { showToast } from '../features/ui/uiSlice';

const Library: React.FC = () => {
    const { favorites, playlists } = useAppSelector((state) => state.library);
    const dispatch = useAppDispatch();
    const location = useLocation();
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [activeTab, setActiveTab] = useState<'favorites' | 'playlists' | 'offline'>('favorites');
    const [offlineSongs, setOfflineSongs] = useState<(OfflineSong & { imageUrl?: string })[]>([]);

    const blobUrlsRef = useRef<Set<string>>(new Set());

    const revokeAllBlobUrls = useCallback(() => {
        blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
        blobUrlsRef.current.clear();
    }, []);

    useEffect(() => {
        return () => revokeAllBlobUrls();
    }, [revokeAllBlobUrls]);
    const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sortBy, setSortBy] = useState<'name' | 'artist' | 'date'>('date');

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        if (queryParams.get('tab') === 'offline') {
            setActiveTab('offline');
        }
    }, [location]);

    useEffect(() => {
        if (activeTab === 'offline') {
            loadOfflineSongs();
        }
    }, [activeTab]);

    const loadOfflineSongs = async () => {
        revokeAllBlobUrls();
        const songs = await getOfflineSongs();
        const songsWithUrls = songs.map(song => {
            const url = URL.createObjectURL(song.imageBlob);
            blobUrlsRef.current.add(url);
            return { ...song, imageUrl: url };
        });
        setOfflineSongs(songsWithUrls);
    };

    const handleDeleteOffline = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        await deleteOfflineSong(id);
        dispatch(removeDownloadedId(id));
        dispatch(showToast({ message: 'Removed from offline' }));
        loadOfflineSongs();
    };

    const playOfflineCollection = (startWithId?: string, shuffle = false) => {
        if (offlineSongs.length === 0) return;

        let songsToPlay = [...offlineSongs];
        if (shuffle) {
            songsToPlay = [...songsToPlay].sort(() => Math.random() - 0.5);
        }

        dispatch(setSongs(songsToPlay));

        const firstSong = startWithId
            ? songsToPlay.find(s => s.id === startWithId) || songsToPlay[0]
            : songsToPlay[0];

        dispatch(playMusic(firstSong));
    };

    const handleCreatePlaylist = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPlaylistName.trim()) {
            const name = newPlaylistName.trim();
            dispatch(createPlaylistCloud({ name, songs: [] }) as any);
            setNewPlaylistName('');
            setIsCreating(false);
        }
    };

    const currentPlaylist = playlists.find(p => p.id === selectedPlaylist);

    return (
        <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-32">
            <h1 className="text-3xl font-bold mb-8">My Library</h1>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-gray-100 dark:border-gray-800">
                <div className="flex gap-4">
                    <button
                        onClick={() => { setActiveTab('favorites'); setSelectedPlaylist(null); }}
                        className={`pb-4 px-2 font-semibold transition-colors relative ${activeTab === 'favorites' && !selectedPlaylist ? 'text-primary' : 'text-gray-500'}`}
                    >
                        Favorites
                        {activeTab === 'favorites' && !selectedPlaylist && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('playlists')}
                        className={`pb-4 px-2 font-semibold transition-colors relative ${activeTab === 'playlists' || selectedPlaylist ? 'text-primary' : 'text-gray-500'}`}
                    >
                        Playlists
                        {(activeTab === 'playlists' || selectedPlaylist) && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                    </button>
                    <button
                        onClick={() => { setActiveTab('offline'); setSelectedPlaylist(null); }}
                        className={`pb-4 px-2 font-semibold transition-colors relative ${activeTab === 'offline' ? 'text-primary' : 'text-gray-500'}`}
                    >
                        Offline
                        {activeTab === 'offline' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                    </button>
                </div>

                <div className="flex items-center gap-4 pb-4 md:pb-0">
                    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-500'}`}
                        >
                            <IoGridOutline size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' : 'text-gray-500'}`}
                        >
                            <IoListOutline size={18} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <IoFilterOutline />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="bg-transparent border-none focus:ring-0 cursor-pointer font-medium"
                        >
                            <option value="date">Recently Added</option>
                            <option value="name">A-Z (Name)</option>
                            <option value="artist">A-Z (Artist)</option>
                        </select>
                    </div>
                </div>
            </div>

            {activeTab === 'offline' && (
                <div className="space-y-6">
                    {offlineSongs.length > 0 && (
                        <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide">
                            <button
                                onClick={() => playOfflineCollection()}
                                className="flex items-center gap-1.5 sm:gap-2 bg-primary text-white px-4 py-2 sm:px-6 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-lg shadow-primary/20 hover:bg-red-600 transition-all whitespace-nowrap"
                            >
                                <IoPlay /> Play All
                            </button>
                            <button
                                onClick={() => playOfflineCollection(undefined, true)}
                                className="flex items-center gap-1.5 sm:gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 py-2 sm:px-6 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all whitespace-nowrap"
                            >
                                <IoShuffle /> Shuffle
                            </button>
                        </div>
                    )}
                    <div className={viewMode === 'grid'
                        ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
                        : "space-y-2"
                    }>
                        {offlineSongs.length > 0 ? (
                            [...offlineSongs].sort((a, b) => {
                                if (sortBy === 'name') return a.name.localeCompare(b.name);
                                if (sortBy === 'artist') return a.primaryArtists.localeCompare(b.primaryArtists);
                                return 0;
                            }).map((song) => (
                                <motion.div
                                    key={song.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`group cursor-pointer ${viewMode === 'list' ? 'flex items-center gap-4 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''}`}
                                    onClick={() => playOfflineCollection(song.id)}
                                >
                                    <div className={`relative overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 ${viewMode === 'list' ? 'w-12 h-12 rounded-lg' : 'aspect-square mb-3 rounded-xl'}`}>
                                        <img
                                            src={song.imageUrl}
                                            alt={song.name}
                                            loading="lazy"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <IoMusicalNote className="text-white text-xl" />
                                        </div>
                                    </div>
                                    <div className={`flex items-center justify-between gap-2 ${viewMode === 'list' ? 'flex-1 min-w-0' : ''}`}>
                                        <div className="min-w-0">
                                            <p className="font-semibold truncate text-sm">{song.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{song.primaryArtists}</p>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteOffline(e, song.id)}
                                            className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-primary/10 dark:hover:bg-red-900/20 text-primary rounded-full transition-all"
                                        >
                                            <IoTrash size={14} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center text-gray-500">
                                <IoCloudDownload size={48} className="mx-auto mb-4 opacity-20" />
                                <p>No offline songs yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'favorites' && !selectedPlaylist && (
                <div className="space-y-6">
                    {favorites.length > 0 && (
                        <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide">
                            <button
                                onClick={() => {
                                    dispatch(setSongs(favorites));
                                    dispatch(playMusic(favorites[0]));
                                }}
                                className="flex items-center gap-1.5 sm:gap-2 bg-primary text-white px-4 py-2 sm:px-6 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-lg shadow-primary/20 hover:bg-red-600 transition-all whitespace-nowrap"
                            >
                                <IoPlay /> Play All
                            </button>
                            <button
                                onClick={() => {
                                    const shuffled = [...favorites].sort(() => Math.random() - 0.5);
                                    dispatch(setSongs(shuffled));
                                    dispatch(playMusic(shuffled[0]));
                                }}
                                className="flex items-center gap-1.5 sm:gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 py-2 sm:px-6 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all whitespace-nowrap"
                            >
                                <IoShuffle /> Shuffle
                            </button>
                        </div>
                    )}
                    <div className={viewMode === 'grid'
                        ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
                        : "space-y-2"
                    }>
                        {favorites.length > 0 ? (
                            [...favorites].sort((a, b) => {
                                if (sortBy === 'name') return a.name.localeCompare(b.name);
                                if (sortBy === 'artist') return a.primaryArtists.localeCompare(b.primaryArtists);
                                return 0; // Default is date, but favorites aren't timestamped, so we keep order
                            }).map((song) => (
                                <motion.div
                                    key={song.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`group cursor-pointer ${viewMode === 'list' ? 'flex items-center gap-4 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''}`}
                                    onClick={() => {
                                        dispatch(setSongs(favorites));
                                        dispatch(playMusic(song));
                                    }}
                                >
                                    <div className={`relative overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 ${viewMode === 'list' ? 'w-12 h-12 rounded-lg' : 'aspect-square mb-3 rounded-xl'}`}>
                                        <img
                                            src={Array.isArray(song.image) ? song.image[song.image.length - 1].url : song.image}
                                            alt={song.name}
                                            loading="lazy"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <IoHeart className="text-primary text-xl" />
                                        </div>
                                    </div>
                                    <div className={`flex items-center justify-between gap-2 ${viewMode === 'list' ? 'flex-1 min-w-0' : ''}`}>
                                        <div className="min-w-0">
                                            <p className="font-semibold truncate text-sm">{song.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{song.primaryArtists}</p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                dispatch(toggleFavoriteCloud(song) as any);
                                            }}
                                            className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-primary/10 dark:hover:bg-red-900/20 text-primary rounded-full transition-all"
                                        >
                                            <IoTrash size={14} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center text-gray-500">
                                <IoHeart size={48} className="mx-auto mb-4 opacity-20" />
                                <p>No favorite songs yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'playlists' && !selectedPlaylist && (
                <div className={viewMode === 'grid'
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
                    : "space-y-2"
                }>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsCreating(true)}
                        className={`${viewMode === 'list' ? 'flex items-center gap-4 p-3 w-full border-2 border-dashed' : 'aspect-square border-2 border-dashed flex flex-col items-center justify-center gap-2'} rounded-xl border-gray-200 dark:border-gray-800 hover:border-primary hover:text-primary transition-colors`}
                    >
                        <IoAdd size={viewMode === 'list' ? 24 : 32} />
                        <span className="font-semibold text-sm">New Playlist</span>
                    </motion.button>

                    {[...playlists].sort((a, b) => {
                        if (sortBy === 'name') return a.name.localeCompare(b.name);
                        return 0;
                    }).map((playlist) => (
                        <motion.div
                            key={playlist.id}
                            layout
                            className={`group cursor-pointer ${viewMode === 'list' ? 'flex items-center gap-4 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''}`}
                            onClick={() => setSelectedPlaylist(playlist.id)}
                        >
                            <div className={`relative bg-gray-100 dark:bg-gray-800 overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 ${viewMode === 'list' ? 'w-12 h-12 rounded-lg' : 'aspect-square mb-3 rounded-xl'} flex items-center justify-center`}>
                                {playlist.songs.length > 0 ? (
                                    <img
                                        src={Array.isArray(playlist.songs[0].image) ? playlist.songs[0].image[playlist.songs[0].image.length - 1].url : playlist.songs[0].image}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                        alt=""
                                    />
                                ) : (
                                    <IoMusicalNote size={viewMode === 'list' ? 20 : 40} className="text-gray-300 dark:text-gray-700" />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-white text-[10px] font-bold">{playlist.songs.length} songs</span>
                                </div>
                            </div>
                            <div className={`flex items-center justify-between gap-2 ${viewMode === 'list' ? 'flex-1 min-w-0' : ''}`}>
                                <p className="font-semibold truncate text-sm">{playlist.name}</p>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Delete playlist "${playlist.name}"?`)) {
                                            dispatch(deletePlaylist(playlist.id));
                                            dispatch(deletePlaylistCloud(playlist.id) as any);
                                        }
                                    }}
                                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-primary/10 dark:hover:bg-red-900/20 text-primary rounded-full transition-all"
                                >
                                    <IoTrash size={14} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {selectedPlaylist && currentPlaylist && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <button
                        onClick={() => setSelectedPlaylist(null)}
                        className="mb-6 text-sm text-gray-500 hover:text-primary transition-colors"
                    >
                        ← Back to Playlists
                    </button>
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold">{currentPlaylist.name}</h2>
                        <span className="text-gray-500">{currentPlaylist.songs.length} songs</span>
                    </div>

                    <div className="flex gap-2 sm:gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                        <button
                            onClick={() => {
                                dispatch(setSongs(currentPlaylist.songs));
                                dispatch(playMusic(currentPlaylist.songs[0]));
                            }}
                            className="flex items-center gap-1.5 sm:gap-2 bg-primary text-white px-4 py-2 sm:px-6 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-lg shadow-primary/20 hover:bg-red-600 transition-all whitespace-nowrap"
                        >
                            <IoPlay /> Play All
                        </button>
                        <button
                            onClick={() => {
                                const shuffled = [...currentPlaylist.songs].sort(() => Math.random() - 0.5);
                                dispatch(setSongs(shuffled));
                                dispatch(playMusic(shuffled[0]));
                            }}
                            className="flex items-center gap-1.5 sm:gap-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 py-2 sm:px-6 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all whitespace-nowrap"
                        >
                            <IoShuffle /> Shuffle
                        </button>
                    </div>

                    <div className="space-y-2">
                        {currentPlaylist.songs.map((song) => (
                            <div
                                key={song.id}
                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 group cursor-pointer"
                                onClick={() => {
                                    dispatch(setSongs(currentPlaylist.songs));
                                    dispatch(playMusic(song));
                                }}
                            >
                                <img
                                    src={Array.isArray(song.image) ? song.image[0].url : song.image}
                                    alt=""
                                    loading="lazy"
                                    className="w-12 h-12 rounded-lg object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold truncate">{song.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{song.primaryArtists}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            dispatch(toggleFavoriteCloud(song) as any);
                                        }}
                                        className={`p-2 rounded-full transition-colors ${favorites.some(s => s.id === song.id) ? 'text-primary' : 'text-gray-400 hover:text-primary hover:bg-primary/10 dark:hover:bg-red-900/20'}`}
                                    >
                                        {favorites.some(s => s.id === song.id) ? <IoHeart /> : <IoHeart size={18} className="opacity-40" />}
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (selectedPlaylist) {
                                                dispatch(removeFromPlaylistCloud({ playlistId: selectedPlaylist, songId: song.id }) as any);
                                            }
                                        }}
                                        className="p-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-primary hover:bg-primary/10 dark:hover:bg-red-900/20 rounded-full transition-all"
                                    >
                                        <IoTrash size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {currentPlaylist.songs.length === 0 && (
                            <p className="text-center py-20 text-gray-500">This playlist is empty.</p>
                        )}
                    </div>
                </motion.div>
            )}

            <AnimatePresence>
                {isCreating && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                        onClick={() => setIsCreating(false)}
                    >
                        <motion.form
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-gray-900 p-8 rounded-2xl w-full max-w-md shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                            onSubmit={handleCreatePlaylist}
                        >
                            <h3 className="text-xl font-bold mb-6">Create New Playlist</h3>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Playlist Name"
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-xl px-4 py-3 mb-6 focus:ring-2 focus:ring-primary outline-none"
                            />
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 py-3 font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-primary hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-primary/30 transition-all"
                                >
                                    Create
                                </button>
                            </div>
                        </motion.form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Library;
