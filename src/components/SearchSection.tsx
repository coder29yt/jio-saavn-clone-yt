import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { playMusic, setSearchedSongs } from '../features/musicplayer/musicPlayerSlice';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { decodeHtmlEntities } from '../utils/decodeHtml';

const SearchSection: React.FC = () => {
    const { searchedSongs } = useAppSelector((state) => state.musicPlayer);
    const [activeTab, setActiveTab] = useState<'songs' | 'albums' | 'artists' | 'playlists'>('songs');
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();

    // Close search on navigation
    useEffect(() => {
        dispatch(setSearchedSongs([]));
    }, [location.pathname, dispatch]);

    if (!searchedSongs || (Array.isArray(searchedSongs) && searchedSongs.length === 0)) return null;

    // Handle both cases: old state (array of songs) and new state (object with categories)
    const data = Array.isArray(searchedSongs) ? { songs: { results: searchedSongs } } : searchedSongs;

    const songs = data.songs?.results || [];
    const albums = data.albums?.results || [];
    const artists = data.artists?.results || [];
    const playlists = data.playlists?.results || [];

    const hasResults = songs.length > 0 || albums.length > 0 || artists.length > 0 || playlists.length > 0;
    if (!hasResults) return null;

    const tabs = [
        { id: 'songs', label: 'Songs', count: songs.length },
        { id: 'albums', label: 'Albums', count: albums.length },
        { id: 'artists', label: 'Artists', count: artists.length },
        { id: 'playlists', label: 'Playlists', count: playlists.length },
    ].filter(t => t.count > 0);

    return (
        <div className="p-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-b border-white/20 dark:border-gray-800/20">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'bg-primary text-white shadow-lg'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                            >
                                {tab.label} ({tab.count})
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => dispatch({ type: 'musicPlayer/setSearchedSongs', payload: [] })}
                        className="text-xs font-bold text-primary hover:bg-primary/10 dark:hover:bg-red-900/10 px-3 py-1.5 rounded-full transition-all"
                    >
                        CLEAR
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6"
                    >
                        {activeTab === 'songs' && songs.map((song: any) => (
                            <motion.div
                                whileHover={{ y: -5 }}
                                key={song.id}
                                onClick={() => dispatch(playMusic(song))}
                                className="cursor-pointer group bg-white/20 dark:bg-gray-800/20 p-3 rounded-2xl border border-white/10 hover:border-primary/30 transition-all"
                            >
                                <div className="relative aspect-square mb-3 overflow-hidden rounded-xl">
                                    <img
                                        src={song.image?.[2]?.url || song.image}
                                        alt={song.name}
                                        loading="lazy"
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg">
                                            <span>▶</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{decodeHtmlEntities(song.name)}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-1">{decodeHtmlEntities(song.primaryArtists)}</p>
                            </motion.div>
                        ))}

                        {activeTab === 'albums' && albums.map((album: any) => (
                            <motion.div
                                whileHover={{ y: -5 }}
                                key={album.id}
                                onClick={() => navigate(`/albums/${album.id}`)}
                                className="cursor-pointer group bg-white/20 dark:bg-gray-800/20 p-3 rounded-2xl border border-white/10 hover:border-primary/30 transition-all"
                            >
                                <div className="relative aspect-square mb-3 overflow-hidden rounded-xl">
                                    <img
                                        src={album.image?.[2]?.url || album.image}
                                        alt={album.name}
                                        loading="lazy"
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                </div>
                                <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{decodeHtmlEntities(album.name)}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-1">Album • {decodeHtmlEntities(album.artist)}</p>
                            </motion.div>
                        ))}

                        {activeTab === 'artists' && artists.map((artist: any) => (
                            <motion.div
                                whileHover={{ y: -5 }}
                                key={artist.id}
                                onClick={() => navigate(`/artists/${artist.id}`)}
                                className="cursor-pointer group bg-white/20 dark:bg-gray-800/20 p-3 rounded-2xl border border-white/10 hover:border-primary/30 transition-all flex flex-col items-center text-center"
                            >
                                <div className="relative aspect-square mb-3 overflow-hidden rounded-full w-full max-w-[120px]">
                                    <img
                                        src={artist.image?.[2]?.url || artist.image}
                                        alt={artist.name}
                                        loading="lazy"
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                </div>
                                <p className="text-sm font-bold truncate group-hover:text-primary transition-colors w-full">{decodeHtmlEntities(artist.name)}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider">{artist.role}</p>
                            </motion.div>
                        ))}

                        {activeTab === 'playlists' && playlists.map((playlist: any) => (
                            <motion.div
                                whileHover={{ y: -5 }}
                                key={playlist.id}
                                onClick={() => navigate(`/playlists/${playlist.id}`)}
                                className="cursor-pointer group bg-white/20 dark:bg-gray-800/20 p-3 rounded-2xl border border-white/10 hover:border-primary/30 transition-all"
                            >
                                <div className="relative aspect-square mb-3 overflow-hidden rounded-xl">
                                    <img
                                        src={playlist.image?.[2]?.url || playlist.image}
                                        alt={playlist.name}
                                        loading="lazy"
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                </div>
                                <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{decodeHtmlEntities(playlist.name)}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-1">Playlist</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default SearchSection;
