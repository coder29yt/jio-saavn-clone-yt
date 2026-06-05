import React from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { reorderQueue, removeFromQueue, playMusic, clearQueue } from '../features/musicplayer/musicPlayerSlice';
import { motion, Reorder, AnimatePresence, useDragControls } from 'framer-motion';
import { IoClose, IoReorderThreeOutline, IoTrashOutline } from 'react-icons/io5';
import { Song } from '../types/music';

import { setQueueOpen } from '../features/musicplayer/musicPlayerSlice';

interface QueueItemProps {
    song: Song;
    isActive: boolean;
    onPlay: (song: Song) => void;
    onRemove: (id: string) => void;
}

const QueueItem: React.FC<QueueItemProps> = ({ song, isActive, onPlay, onRemove }) => {
    const dragControls = useDragControls();

    return (
        <Reorder.Item
            value={song}
            dragListener={false}
            dragControls={dragControls}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`flex items-center gap-3 p-2 rounded-xl group mb-1 transition-colors ${
                isActive ? 'bg-primary/10 dark:bg-primary/20 text-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-800/40'
            }`}
        >
            <div
                onPointerDown={(e) => {
                    dragControls.start(e);
                }}
                style={{ touchAction: 'none' }}
                className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors shrink-0"
            >
                <IoReorderThreeOutline size={20} className={isActive ? 'text-red-400' : 'text-gray-400'} />
            </div>
            <div className="flex flex-1 items-center gap-3 min-w-0 cursor-pointer" onClick={() => onPlay(song)}>
                <img
                    src={Array.isArray(song.image) ? song.image[song.image.length - 1]?.url : song.image}
                    alt=""
                    className="w-10 h-10 rounded object-cover"
                />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{song.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{song.primaryArtists}</p>
                </div>
            </div>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove(song.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-opacity"
            >
                <IoClose size={16} />
            </button>
        </Reorder.Item>
    );
};

export const QueueContent: React.FC = () => {
    const { songs, currentSong, recommendations } = useAppSelector((state) => state.musicPlayer);
    const dispatch = useAppDispatch();

    return (
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            <Reorder.Group axis="y" values={songs} onReorder={(newSongs) => dispatch(reorderQueue(newSongs))} className="space-y-1">
                <AnimatePresence initial={false}>
                    {songs.map((song) => (
                        <QueueItem
                            key={song.id}
                            song={song}
                            isActive={currentSong?.id === song.id}
                            onPlay={(s) => dispatch(playMusic(s))}
                            onRemove={(id) => dispatch(removeFromQueue(id))}
                        />
                    ))}
                </AnimatePresence>
            </Reorder.Group>

            {recommendations.length > 0 && (
                <div className="mt-6 mb-4 px-2">
                    <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 px-2 uppercase tracking-wider">
                        Suggested Songs
                    </h3>
                    {recommendations.map((song) => (
                        <div
                            key={song.id}
                            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 mb-1 group"
                            onClick={() => dispatch(playMusic(song))}
                        >
                            <img
                                src={Array.isArray(song.image) ? song.image[song.image.length - 1]?.url : song.image}
                                alt=""
                                className="w-10 h-10 rounded object-cover"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{song.name}</p>
                                <p className="text-[10px] text-gray-500 truncate">{song.primaryArtists}</p>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    dispatch(reorderQueue([...songs, song]));
                                }}
                                className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 bg-primary/10 dark:bg-red-900/20 md:bg-transparent text-primary rounded transition-opacity text-xs font-bold"
                            >
                                ADD
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const Queue: React.FC = () => {
    const { songs, isQueueOpen } = useAppSelector((state) => state.musicPlayer);
    const dispatch = useAppDispatch();

    return (
        <AnimatePresence>
            {isQueueOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => dispatch(setQueueOpen(false))}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-full xs:w-80 bg-white dark:bg-gray-900 shadow-2xl z-[110] border-l border-gray-200 dark:border-gray-800 flex flex-col"
                    >
                        <div className="p-5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                            <div>
                                <h2 className="text-xl font-bold">Queue</h2>
                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{songs.length} Songs</p>
                            </div>
                            <div className="flex items-center gap-1">
                                {songs.length > 0 && (
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Clear all songs from queue?')) {
                                                dispatch(clearQueue());
                                            }
                                        }}
                                        className="p-2 text-gray-400 hover:text-primary transition-colors"
                                        title="Clear Queue"
                                    >
                                        <IoTrashOutline size={20} />
                                    </button>
                                )}
                                <button onClick={() => dispatch(setQueueOpen(false))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                                    <IoClose size={24} />
                                </button>
                            </div>
                        </div>

                        <QueueContent />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default Queue;
