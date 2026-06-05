import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { playMusic } from '../features/musicplayer/musicPlayerSlice';
import { addDownloadedId, removeDownloadedId } from '../features/library/librarySlice';
import { toggleFavoriteCloud } from '../features/library/libraryActions';
import { openPlaylistModal, showToast } from '../features/ui/uiSlice';
import { LuHardDriveDownload, LuCircleCheck } from 'react-icons/lu';
import { useState } from 'react';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { motion } from 'framer-motion';
import { IoAdd, IoHeart, IoHeartOutline } from 'react-icons/io5';
import { Song } from '../types/music';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { saveSongOffline, deleteOfflineSong } from '../utils/db';

interface SongsListProps {
    name: string;
    artists: string;
    duration: string | number;
    downloadUrl: any;
    image: any;
    id: string;
    album: any;
    isSelected?: boolean;
    onSelect?: (id: string) => void;
    isSelectionMode?: boolean;
}

const SongsList: React.FC<SongsListProps> = ({
    name,
    artists,
    duration,
    downloadUrl,
    image,
    id,
    album,
    isSelected,
    onSelect,
    isSelectionMode
}) => {
    const dispatch = useAppDispatch();
    const { currentSong, downloadSettings, preferredQuality } = useAppSelector((state) => state.musicPlayer);
    const { favorites, downloadedIds } = useAppSelector((state) => state.library);
    const [isDownloading, setIsDownloading] = useState(false);

    const isFavorite = favorites.some(s => s.id === id);
    const isDownloaded = downloadedIds.includes(id);

    const formatDuration = (sec: string | number) => {
        const minutes = Math.floor(Number(sec) / 60);
        const seconds = Math.floor(Number(sec) % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation();
        const songData: Song = {
            id, name, primaryArtists: parsedArtists, duration,
            image, downloadUrl, album
        };
        dispatch(toggleFavoriteCloud(songData) as any);

        dispatch(showToast({
            message: isFavorite ? 'Removed from favorites' : 'Added to favorites'
        }));
    };

    const handleAddToPlaylist = (e: React.MouseEvent) => {
        e.stopPropagation();
        const songData: Song = {
            id, name, primaryArtists: parsedArtists, duration,
            image, downloadUrl, album
        };
        dispatch(openPlaylistModal(songData));
    };

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (isDownloaded) {
            try {
                await deleteOfflineSong(id);
                dispatch(removeDownloadedId(id));
                dispatch(showToast({ message: 'Removed from downloads' }));
            } catch (error) {
                console.error('Failed to remove download', error);
            }
            return;
        }

        // Check for WiFi setting
        if (downloadSettings.wifiOnly) {
            const connection = (navigator as any).connection;
            if (connection && connection.type && connection.type !== 'wifi') {
                dispatch(showToast({ message: 'Download waiting for Wi-Fi' }));
                return;
            }
        }

        let url = '';
        if (Array.isArray(downloadUrl)) {
            url = downloadUrl.find((d: any) => d.quality === preferredQuality)?.url ||
                downloadUrl[downloadUrl.length - 1]?.url;
        } else {
            url = downloadUrl;
        }

        if (!url) {
            dispatch(showToast({ message: 'Download URL not available' }));
            return;
        }

        setIsDownloading(true);
        try {
            // Fetch audio
            const audioRes = await fetch(url);
            const audioBlob = await audioRes.blob();

            // Fetch image
            const imageUrl = Array.isArray(image) ? image[image.length - 1]?.url : image;
            const imageRes = await fetch(imageUrl);
            const imageBlob = await imageRes.blob();

            const songData: Song = {
                id, name, primaryArtists: parsedArtists, duration,
                image, downloadUrl, album
            };

            await saveSongOffline(songData, audioBlob, imageBlob);
            dispatch(addDownloadedId(id));
            dispatch(showToast({ message: 'Saved for offline' }));
        } catch (error) {
            console.error('Download failed', error);
            dispatch(showToast({ message: 'Download failed' }));
        } finally {
            setIsDownloading(false);
        }
    };

    const isCurrent = currentSong?.id === id;

    const parsedArtists = (artists && typeof artists === 'object')
        ? (artists as any).primary?.map((a: any) => a.name).join(', ') || (artists as any).all?.map((a: any) => a.name).join(', ')
        : (artists || '');

    return (
        <motion.div
            whileHover={{ x: 4 }}
            onClick={() =>
                dispatch(
                    playMusic({
                        name,
                        primaryArtists: parsedArtists,
                        duration,
                        music: downloadUrl,
                        image,
                        id,
                        album,
                    })
                )
            }
            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border border-transparent hover:bg-primary/5 ${
                isCurrent
                    ? 'bg-primary/10 dark:bg-primary/20 border-primary/20 text-primary'
                    : 'hover:border-gray-200 dark:hover:border-gray-800'
            }`}
        >
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 mr-2">
                {isSelectionMode && (
                    <div
                        onClick={(e) => { e.stopPropagation(); onSelect?.(id); }}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-gray-400'}`}
                    >
                        {isSelected && <span className="text-white text-[10px]">✓</span>}
                    </div>
                )}
                <div className="relative group/song flex-shrink-0">
                    <img
                        src={Array.isArray(image) ? image[0]?.url : image}
                        alt={name}
                        loading="lazy"
                        className="w-12 h-12 rounded-lg object-cover shadow-sm"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover/song:opacity-100 transition-opacity rounded-lg">
                        <span className="text-white text-xs">▶</span>
                    </div>
                </div>
                <div className="flex flex-col min-w-0">
                    <p className="font-semibold text-xs sm:text-sm truncate">
                        {decodeHtmlEntities(name)}
                    </p>
                    <p className="text-[9px] sm:text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        {decodeHtmlEntities(parsedArtists)}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <span className="hidden sm:block text-[10px] sm:text-xs font-mono text-gray-400">
                    {formatDuration(duration)}
                </span>

                <div className="flex items-center gap-1">
                    <motion.button
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleFavorite}
                        className={`p-1.5 sm:p-2 rounded-full transition-colors ${isFavorite ? 'text-primary' : 'text-gray-400 hover:text-primary hover:bg-primary/10 dark:hover:bg-red-900/20'}`}
                        title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                    >
                        {isFavorite ? <IoHeart size={16} className="sm:w-[18px] sm:h-[18px]" /> : <IoHeartOutline size={16} className="sm:w-[18px] sm:h-[18px]" />}
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleAddToPlaylist}
                        className="p-1.5 sm:p-2 text-gray-400 hover:text-primary hover:bg-primary/10 dark:hover:bg-red-900/20 rounded-full transition-colors shrink-0"
                        title="Add to Playlist"
                    >
                        <IoAdd size={18} className="sm:w-[20px] sm:h-[20px]" />
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleDownload}
                        className={`p-1.5 sm:p-2 rounded-full transition-colors shrink-0 ${isDownloaded ? 'text-green-500' : 'text-gray-500 hover:text-primary hover:bg-primary/10 dark:hover:bg-red-900/20'}`}
                        aria-label={isDownloaded ? "Remove download" : "Download song"}
                    >
                        {isDownloading ? (
                            <AiOutlineLoading3Quarters className="animate-spin text-sm" />
                        ) : isDownloaded ? (
                            <LuCircleCheck size={16} className="sm:w-[18px] sm:h-[18px]" />
                        ) : (
                            <LuHardDriveDownload size={16} className="sm:w-[18px] sm:h-[18px]" />
                        )}
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};

export default SongsList;
