import React from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { Song } from '../types/music';
import { playMusic, pauseMusic, nextSong, prevSong } from '../features/musicplayer/musicPlayerSlice';
import { IoPlay, IoPause, IoPlaySkipBack, IoPlaySkipForward, IoClose } from 'react-icons/io5';
import { motion, AnimatePresence } from 'framer-motion';
import { decodeHtmlEntities } from '../utils/decodeHtml';

interface MiniPlayerProps {
    onClose: () => void;
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({ onClose }) => {
    const { currentSong, isPlaying } = useAppSelector(state => state.musicPlayer);
    const dispatch = useAppDispatch();

    if (!currentSong) return null;

    const imageUrl = Array.isArray(currentSong.image)
        ? (currentSong.image[1]?.url || currentSong.image[0]?.url)
        : currentSong.image;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-6 w-64 bg-white dark:bg-gray-900 shadow-2xl rounded-3xl overflow-hidden border border-white/10 z-[60] hidden lg:block"
        >
            <div className="relative aspect-square group">
                <img src={imageUrl} alt={currentSong.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button
                        onClick={() => dispatch(prevSong())}
                        className="text-white hover:scale-110 transition-transform"
                    >
                        <IoPlaySkipBack size={24} />
                    </button>
                    <button
                        onClick={() => isPlaying ? dispatch(pauseMusic()) : dispatch(playMusic(currentSong))}
                        className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                    >
                        {isPlaying ? <IoPause size={24} /> : <IoPlay size={24} className="ml-1" />}
                    </button>
                    <button
                        onClick={() => dispatch(nextSong())}
                        className="text-white hover:scale-110 transition-transform"
                    >
                        <IoPlaySkipForward size={24} />
                    </button>
                </div>
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <IoClose size={16} />
                </button>
            </div>
            <div className="p-4 bg-white/5 backdrop-blur-md">
                <p className="font-bold text-sm truncate">{decodeHtmlEntities(currentSong.name)}</p>
                <p className="text-[10px] text-gray-500 truncate mt-0.5">{decodeHtmlEntities(currentSong.primaryArtists)}</p>
            </div>
        </motion.div>
    );
};

export default MiniPlayer;
