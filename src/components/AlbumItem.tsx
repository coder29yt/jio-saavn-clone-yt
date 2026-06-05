import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppDispatch } from '../hooks/redux';
import { playMusic } from '../features/musicplayer/musicPlayerSlice';
import { decodeHtmlEntities } from '../utils/decodeHtml';

interface AlbumItemProps {
    id: string;
    image: string;
    name: string;
    artists?: string;
    type?: string;
    data?: any;
}

const AlbumItem: React.FC<AlbumItemProps> = (props) => {
    const { id, image, name, artists, type, data } = props;
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const handleClick = () => {
        if ((type === 'song' || data?.type === 'song') && data) {
            dispatch(playMusic(data));
            return;
        }

        if (type === 'playlist' || data?.type === 'playlist') {
            navigate(`/playlists/${id}`);
        } else if (type === 'artist') {
            navigate(`/artists/${id}`);
        } else {
            navigate(`/albums/${id}`);
        }
    };

    return (
        <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={handleClick}
            className="flex flex-col items-start gap-2.5 p-2.5 rounded-2xl bg-white/5 dark:bg-gray-800/5 hover:bg-white/10 dark:hover:bg-gray-800/10 border border-transparent hover:border-white/20 dark:hover:border-gray-700/20 cursor-pointer transition-all w-36 shrink-0 group shadow-sm hover:shadow-xl"
        >
            <div className={`relative w-32 h-32 overflow-hidden shadow-inner ${type === 'artist' ? 'rounded-full' : 'rounded-xl'}`}>
                <img
                    src={image}
                    alt={name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                        ▶
                    </div>
                </div>
            </div>
            <div className="w-full px-1">
                <p className="font-bold text-sm truncate group-hover:text-primary transition-colors leading-tight">{decodeHtmlEntities(name)}</p>
                {artists && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{decodeHtmlEntities(artists)}</p>
                )}
            </div>
        </motion.div>
    );
};

export default AlbumItem;
