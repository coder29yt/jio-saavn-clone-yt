import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { addToPlaylistCloud, addBulkToPlaylistCloud, createPlaylistCloud } from '../../features/library/libraryActions';
import { Song } from '../../types/music';
import { IoAdd, IoClose, IoMusicalNote } from 'react-icons/io5';

interface AddToPlaylistModalProps {
    song: Song | null;
    bulkSongs?: Song[];
    onClose: () => void;
    onSuccess: (playlistName: string) => void;
    onError: (message: string) => void;
}

const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({ song, bulkSongs, onClose, onSuccess, onError }) => {
    const { playlists } = useAppSelector((state) => state.library);
    const dispatch = useAppDispatch();
    const [isCreating, setIsCreating] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');

    if (!song) return null;

    const handleAddToPlaylist = (playlistId: string, playlistName: string) => {
        const playlist = playlists.find(p => p.id === playlistId);
        if (!playlist) return;

        if (bulkSongs && bulkSongs.length > 0) {
            dispatch(addBulkToPlaylistCloud({ playlistId, songs: bulkSongs }) as any);
            onSuccess(`${bulkSongs.length} songs added to ${playlistName}`);
        } else {
            if (playlist.songs.find(s => s.id === song.id)) {
                onError(`Already in ${playlistName}`);
                return;
            }
            dispatch(addToPlaylistCloud({ playlistId, song }) as any);
            onSuccess(playlistName);
        }

        onClose();
    };

    const handleCreatePlaylist = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPlaylistName.trim()) {
            const name = newPlaylistName.trim();
            const songs = bulkSongs && bulkSongs.length > 0 ? bulkSongs : (song ? [song] : []);

            dispatch(createPlaylistCloud({ name, songs }) as any);

            onSuccess(bulkSongs && bulkSongs.length > 0 ? `${songs.length} songs added to ${name}` : name);
            setNewPlaylistName('');
            setIsCreating(false);
            onClose();
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <h3 className="text-xl font-bold">Add to Playlist</h3>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                            <IoClose size={20} />
                        </button>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto p-2">
                        {playlists.length === 0 && !isCreating && (
                            <div className="py-10 text-center text-gray-500">
                                <IoMusicalNote size={40} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No playlists yet</p>
                            </div>
                        )}

                        {playlists.map((playlist) => (
                            <button
                                key={playlist.id}
                                onClick={() => handleAddToPlaylist(playlist.id, playlist.name)}
                                className="w-full flex items-center gap-4 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors text-left"
                            >
                                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-400">
                                    {playlist.songs.length > 0 ? (
                                        <img
                                            src={Array.isArray(playlist.songs[0].image) ? playlist.songs[0].image[0].url : playlist.songs[0].image}
                                            className="w-full h-full object-cover rounded-lg"
                                            alt=""
                                        />
                                    ) : (
                                        <IoMusicalNote />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold truncate text-sm">{playlist.name}</p>
                                    <p className="text-xs text-gray-500">{playlist.songs.length} songs</p>
                                </div>
                            </button>
                        ))}

                        {isCreating ? (
                            <form onSubmit={handleCreatePlaylist} className="p-3">
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Playlist Name"
                                    value={newPlaylistName}
                                    onChange={(e) => setNewPlaylistName(e.target.value)}
                                    className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-xl px-4 py-2 mb-2 focus:ring-2 focus:ring-primary outline-none text-sm"
                                />
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreating(false)}
                                        className="flex-1 py-2 text-xs font-semibold text-gray-500"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-2 bg-primary text-white text-xs font-bold rounded-lg"
                                    >
                                        Create
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <button
                                onClick={() => setIsCreating(true)}
                                className="w-full flex items-center gap-4 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-colors text-primary font-semibold text-sm"
                            >
                                <div className="w-10 h-10 border-2 border-dashed border-red-200 dark:border-red-900/30 rounded-lg flex items-center justify-center">
                                    <IoAdd size={20} />
                                </div>
                                Create New Playlist
                            </button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AddToPlaylistModal;
