import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useFetchDetails from '../hooks/useFetchDetails';
import ImageComponent from './ImageComponent';
import FlexLayout from './FlexLayout';
import SongsList from './SongsList';
import Slider from './Slider';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setSongs, playMusic, addRecentlyPlayedAlbum } from '../features/musicplayer/musicPlayerSlice';
import { openPlaylistModal, showToast } from '../features/ui/uiSlice';
import { toggleFavoriteCloud } from '../features/library/libraryActions';
import { IoGridOutline, IoListOutline, IoFilterOutline, IoPlay, IoHeart, IoHeartOutline, IoAdd, IoPeopleOutline, IoLogoTwitter, IoLogoFacebook, IoCheckmarkCircle } from 'react-icons/io5';
import { motion, AnimatePresence } from 'framer-motion';
import { Song } from '../types/music';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { search as searchUrl, album as albumSearchUrl, playlistSearch as playlistSearchUrl } from '../constants';

interface PageTemplateProps {
    apiUrl?: string;
    getImageUrl?: (data: any) => string;
    title?: string;
    children?: React.ReactNode;
}

const PageTemplate: React.FC<PageTemplateProps> = ({ apiUrl, getImageUrl, title, children }) => {
    const { details, loading, error, image: fetchedImage } = useFetchDetails(
        apiUrl || '',
        getImageUrl || ((d: any) => (d.image ? (Array.isArray(d.image) ? d.image[d.image.length - 1].url : d.image) : ''))
    );
    const dispatch = useAppDispatch();
    const { favorites } = useAppSelector((state) => state.library);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [sortBy, setSortBy] = useState<'default' | 'name' | 'artist' | 'duration'>('default');
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const [isBioExpanded, setIsBioExpanded] = useState(false);
    const [selectedSongs, setSelectedSongs] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [visibleSongsCount, setVisibleSongsCount] = useState(10);
    const [recommendations, setRecommendations] = useState<{
        moreByArtist: any[];
        similarCollections: any[];
    }>({ moreByArtist: [], similarCollections: [] });

    const rawSongs = (details as any)?.songs || (details as any)?.topSongs || [];

    useEffect(() => {
        if (rawSongs && Array.isArray(rawSongs) && rawSongs.length > 0) {
            dispatch(setSongs(rawSongs));
        }
    }, [rawSongs, dispatch]);

    useEffect(() => {
        if (details && (details as any).type === 'album') {
            dispatch(addRecentlyPlayedAlbum(details));
        }
    }, [details, dispatch]);

    useEffect(() => {
        const fetchRecommendations = async () => {
            if (!details || !(details as any).id || !(details as any).type) return;

            const type = (details as any).type;
            const id = (details as any).id;

            console.log(`[Recommendations] Fetching for ${type}: ${id}`);

            try {
                if (type === 'album') {
                    let artistName = '';
                    const artists = (details as any).artists;

                    // Priority extraction of primary artist
                    if (Array.isArray(artists)) {
                        artistName = artists.find(a => a.role === 'music' || a.role === 'singer')?.name || artists[0]?.name;
                    } else if (artists && typeof artists === 'object') {
                        artistName = artists.primary?.[0]?.name || artists.all?.[0]?.name;
                    }

                    if (!artistName) artistName = (details as any).primaryArtists || (details as any).artist;

                    if (artistName) {
                        const moreByRes = await axios.get(`${albumSearchUrl}?query=${encodeURIComponent(decodeHtmlEntities(artistName))}&limit=10`);
                        if (moreByRes.data?.data?.results && Array.isArray(moreByRes.data.data.results)) {
                            const results = moreByRes.data.data.results.filter((a: any) => a.id !== id);
                            setRecommendations(prev => ({ ...prev, moreByArtist: results }));
                        }
                    }
                } else if (type === 'playlist') {
                    const playlistName = (details as any).name;
                    if (playlistName) {
                        // Clean playlist name for better search (remove common bracketed info)
                        const query = decodeHtmlEntities(playlistName).split('(')[0].split('-')[0].trim();
                        const similarRes = await axios.get(`${playlistSearchUrl}${encodeURIComponent(query)}&limit=10`);
                        if (similarRes.data?.data?.results && Array.isArray(similarRes.data.data.results)) {
                            const results = similarRes.data.data.results.filter((p: any) => p.id !== id);
                            setRecommendations(prev => ({ ...prev, similarCollections: results }));
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching recommendations:', error);
            }
        };

        fetchRecommendations();
    }, [details?.id, details?.type]);

    const sortedSongs = [...rawSongs].sort((a: any, b: any) => {
        if (sortBy === 'name') {
            const nameA = a.name || '';
            const nameB = b.name || '';
            return nameA.localeCompare(nameB);
        }
        if (sortBy === 'artist') {
            const artistA = a.primaryArtists || '';
            const artistB = b.primaryArtists || '';
            return artistA.localeCompare(artistB);
        }
        if (sortBy === 'duration') {
            const durA = Number(a.duration) || 0;
            const durB = Number(b.duration) || 0;
            return durB - durA;
        }
        return 0;
    });

    const handlePlayAll = () => {
        if (sortedSongs.length > 0) {
            dispatch(playMusic(sortedSongs[0]));
        }
    };

    const handleFavorite = (e: React.MouseEvent, song: Song) => {
        e.stopPropagation();
        const isFavorite = favorites.some(s => s.id === song.id);
        dispatch(toggleFavoriteCloud(song) as any);
        dispatch(showToast({
            message: isFavorite ? 'Removed from favorites' : 'Added to favorites'
        }));
    };

    const handleAddToPlaylist = (e: React.MouseEvent, song: Song) => {
        e.stopPropagation();
        dispatch(openPlaylistModal(song));
    };

    const handleBulkSelect = (id: string) => {
        setSelectedSongs(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkAddToPlaylist = () => {
        if (selectedSongs.length === 0) return;
        const songsToBulkAdd = sortedSongs.filter(s => selectedSongs.includes(s.id));
        dispatch(openPlaylistModal(songsToBulkAdd));
        dispatch(showToast({ message: `Ready to add ${selectedSongs.length} songs` }));
    };

    const songs = sortedSongs.slice(0, visibleSongsCount);

    if (children) {
        return (
            <div className="p-5 pb-32 max-w-7xl mx-auto">
                {title && <h1 className="text-3xl font-black mb-8">{title}</h1>}
                {children}
            </div>
        );
    }

    if (loading) return (
        <div className="flex justify-center items-center h-[60vh]">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (error) return (
        <div className="p-10 text-center">
            <p className="text-primary font-medium">{error}</p>
            <button
                onClick={() => window.location.reload()}
                className="mt-4 px-6 py-2 bg-primary text-white rounded-full hover:bg-red-600 transition-colors"
            >
                Retry
            </button>
        </div>
    );

    return (
        <div className="p-5 pb-32 max-w-7xl mx-auto">
            <FlexLayout>
                <div className="flex flex-col items-center lg:items-start lg:sticky lg:top-24 h-fit">
                    <div className="relative group cursor-pointer" onClick={handlePlayAll}>
                        <ImageComponent src={fetchedImage} alt={details?.name || 'Album/Artist'} />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <button className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center shadow-2xl transform scale-90 group-hover:scale-100 transition-transform">
                                <span className="text-3xl">▶</span>
                            </button>
                        </div>
                    </div>
                    <h1 className="text-xl sm:text-3xl font-black mt-4 sm:mt-6 text-center lg:text-left leading-tight line-clamp-2 flex items-center gap-2">
                        {decodeHtmlEntities(details?.name || '')}
                        {(details as any)?.isVerified && <IoCheckmarkCircle className="text-blue-500" size={24} />}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 sm:mt-2 text-center lg:text-left font-medium text-xs sm:text-base line-clamp-2 px-4 lg:px-0">
                        {decodeHtmlEntities(Array.isArray((details as any)?.artists)
                            ? (details as any).artists.map((a: any) => a.name).join(', ')
                            : (details as any)?.primaryArtists ||
                              ((details as any)?.artists && typeof (details as any).artists === 'object'
                                ? (details as any).artists.primary?.map((a: any) => a.name).join(', ')
                                : (details as any)?.artists) || '')}
                    </p>
                    {(details as any)?.songCount && (
                        <p className="text-xs sm:text-sm text-gray-400 mt-1 sm:mt-2 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{(details as any).songCount} Songs</p>
                    )}
                </div>

                <div className="flex-1 w-full lg:pl-10 mt-4 lg:mt-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 border-b border-gray-100 dark:border-gray-800 pb-4">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
                                Songs
                                <span className="text-xs font-normal text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{songs.length}</span>
                            </h2>
                            <button
                                onClick={() => {
                                    setIsSelectionMode(!isSelectionMode);
                                    setSelectedSongs([]);
                                }}
                                className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border transition-all ${isSelectionMode ? 'bg-primary text-white border-primary' : 'border-gray-300 dark:border-gray-700'}`}
                            >
                                {isSelectionMode ? 'Cancel' : 'Select'}
                            </button>
                            {isSelectionMode && selectedSongs.length > 0 && (
                                <motion.button
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    onClick={handleBulkAddToPlaylist}
                                    className="bg-primary text-white text-[10px] font-bold uppercase px-3 py-1 rounded-full shadow-lg whitespace-nowrap"
                                >
                                    Add {selectedSongs.length} to Playlist
                                </motion.button>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
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

                            <div className="flex items-center gap-2 text-sm relative">
                                <button
                                    onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                                    className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer group"
                                >
                                    <IoFilterOutline className={`group-hover:text-primary transition-colors ${sortBy !== 'default' ? 'text-primary' : ''}`} />
                                    <span className="font-bold text-[11px] uppercase tracking-wider">
                                        {sortBy === 'default' ? 'Sort' : sortBy === 'name' ? 'Name' : sortBy === 'artist' ? 'Artist' : 'Duration'}
                                    </span>
                                    <div className={`transition-transform duration-200 ${isSortMenuOpen ? 'rotate-180' : ''}`}>
                                        <div className="text-[8px]">▼</div>
                                    </div>
                                </button>

                                <AnimatePresence>
                                    {isSortMenuOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsSortMenuOpen(false)} />
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute top-full right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 py-1"
                                            >
                                                {[
                                                    { id: 'default', label: 'Default' },
                                                    { id: 'name', label: 'Name (A-Z)' },
                                                    { id: 'artist', label: 'Artist (A-Z)' },
                                                    { id: 'duration', label: 'Duration' }
                                                ].map((option) => (
                                                    <button
                                                        key={option.id}
                                                        onClick={() => {
                                                            setSortBy(option.id as any);
                                                            setIsSortMenuOpen(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors ${
                                                            sortBy === option.id
                                                                ? 'text-primary bg-primary/10 dark:bg-primary/10'
                                                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                        }`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    <div className={viewMode === 'grid'
                        ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-6"
                        : "flex flex-col gap-1"
                    }>
                        <AnimatePresence mode="popLayout">
                            {songs.map((song: Song) => (
                                viewMode === 'list' ? (
                                    <SongsList
                                        key={song.id}
                                        name={song.name}
                                        artists={song.primaryArtists}
                                        duration={song.duration}
                                        downloadUrl={song.downloadUrl}
                                        image={song.image}
                                        id={song.id}
                                        album={song.album || details}
                                        isSelectionMode={isSelectionMode}
                                        isSelected={selectedSongs.includes(song.id)}
                                        onSelect={handleBulkSelect}
                                    />
                                ) : (
                                    <motion.div
                                        key={song.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        whileHover={{ y: -5 }}
                                        className="group cursor-pointer bg-white/20 dark:bg-gray-800/20 p-3 rounded-2xl border border-white/10 hover:border-primary/30 transition-all relative"
                                        onClick={() => dispatch(playMusic(song))}
                                    >
                                        <div className="relative aspect-square mb-3 overflow-hidden rounded-xl shadow-md">
                                            <img
                                                src={Array.isArray(song.image) ? song.image[song.image.length - 1].url : song.image}
                                                alt={song.name}
                                                loading="lazy"
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 sm:gap-2">
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={(e) => handleFavorite(e, song)}
                                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-primary transition-colors"
                                                    title={favorites.some(s => s.id === song.id) ? "Remove from Favorites" : "Add to Favorites"}
                                                >
                                                    {favorites.some(s => s.id === song.id) ? <IoHeart size={14} /> : <IoHeartOutline size={14} />}
                                                </motion.button>
                                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg">
                                                    <IoPlay size={16} />
                                                </div>
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={(e) => handleAddToPlaylist(e, song)}
                                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-primary transition-colors"
                                                    title="Add to Playlist"
                                                >
                                                    <IoAdd size={16} />
                                                </motion.button>
                                            </div>
                                        </div>
                                        <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{decodeHtmlEntities(song.name)}</p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-1">{decodeHtmlEntities(song.primaryArtists)}</p>
                                    </motion.div>
                                )
                            ))}
                        </AnimatePresence>
                    </div>

                    {visibleSongsCount < sortedSongs.length && (
                        <div className="mt-8 flex justify-center">
                            <button
                                onClick={() => setVisibleSongsCount(prev => prev + 10)}
                                className="px-8 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-colors"
                            >
                                Load More Songs
                            </button>
                        </div>
                    )}
                </div>
            </FlexLayout>

            {/* Artist Deep-Dive Sections */}
            {(details as any)?.type === 'artist' && (
                <div className="mt-16 space-y-16">
                    {/* Stats & Socials */}
                    <div className="flex flex-wrap gap-4">
                        {(details as any).followerCount && (
                            <div className="bg-white/5 dark:bg-gray-800/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                    <IoPeopleOutline size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Followers</p>
                                    <p className="text-lg font-black">{Number((details as any).followerCount).toLocaleString()}</p>
                                </div>
                            </div>
                        )}
                        {(details as any).fanCount && (
                            <div className="bg-white/5 dark:bg-gray-800/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                                    <IoPeopleOutline size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Fans</p>
                                    <p className="text-lg font-black">{Number((details as any).fanCount).toLocaleString()}</p>
                                </div>
                            </div>
                        )}
                        <div className="flex gap-2">
                            {(details as any).twitter && (
                                <a href={(details as any).twitter} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-500 hover:bg-sky-500 hover:text-white transition-all border border-sky-500/20">
                                    <IoLogoTwitter size={20} />
                                </a>
                            )}
                            {(details as any).fb && (
                                <a href={(details as any).fb} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white transition-all border border-blue-600/20">
                                    <IoLogoFacebook size={20} />
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Biography */}
                    {(Array.isArray((details as any).bio) ? (details as any).bio.length > 0 : ((details as any).bio?.length > 0 || (details as any).wiki?.length > 0)) && (
                        <div className="bg-white/5 dark:bg-gray-800/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8">
                            <h3 className="text-xl font-black mb-4">About the Artist</h3>
                            <div className="relative">
                                <motion.div
                                    animate={{ height: isBioExpanded ? 'auto' : '100px' }}
                                    className="overflow-hidden text-gray-400 leading-relaxed text-sm sm:text-base whitespace-pre-wrap"
                                >
                                    {decodeHtmlEntities(Array.isArray((details as any).bio)
                                        ? (details as any).bio.map((b: any) => b.text).join('\n')
                                        : (details as any).bio || '')}
                                </motion.div>
                                {!isBioExpanded && (
                                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white/5 dark:from-gray-900/50 to-transparent" />
                                )}
                            </div>
                            <button
                                onClick={() => setIsBioExpanded(!isBioExpanded)}
                                className="mt-4 text-primary font-bold text-sm hover:underline"
                            >
                                {isBioExpanded ? 'Show Less' : 'Read More'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className="mt-20 space-y-16">
                {(details as any)?.singles && (details as any).singles.length > 0 && (
                    <Slider data={(details as any).singles} title="Singles & EPs" />
                )}

                {(details as any)?.topAlbums && (details as any).topAlbums.length > 0 && (
                    <Slider data={(details as any).topAlbums} title="Top Albums" />
                )}

                {(details as any)?.similarArtists && (details as any).similarArtists.length > 0 && (
                    <Slider data={(details as any).similarArtists} title="Fans Also Like" />
                )}

                {recommendations.moreByArtist.length > 0 && (
                    <Slider data={recommendations.moreByArtist} title={`More by ${(details as any).artists?.primary?.[0]?.name || (details as any).primaryArtists}`} />
                )}

                {recommendations.similarCollections.length > 0 && (
                    <Slider data={recommendations.similarCollections} title="Similar Playlists" />
                )}
            </div>
        </div>
    );
};

export default PageTemplate;
