import React from 'react';
import { useNavigate } from 'react-router-dom';
import { decodeHtmlEntities } from '../utils/decodeHtml';

interface SongItemProps {
    id: string;
    title: string;
    image: any;
    type?: string;
    primaryArtists?: string;
}

const SongItem: React.FC<SongItemProps> = ({
    id,
    title,
    image,
    type,
    primaryArtists,
}) => {
    const navigate = useNavigate();

    const handleClick = () => {
        if (type === 'playlist') {
            navigate(`/playlists/${id}`);
        } else if (type === 'artist') {
            navigate(`/artists/${id}`);
        } else {
            navigate(`/albums/${id}`);
        }
    };

    const imageUrl = Array.isArray(image) ? image[image.length - 1]?.url : (image || '');

    return (
        <div
            onClick={handleClick}
            className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer group"
        >
            <div className="relative w-full aspect-square mb-3 overflow-hidden rounded-lg shadow-lg">
                <img
                    src={imageUrl}
                    alt={title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
            </div>
            <p className="text-sm font-semibold text-center truncate w-full">{decodeHtmlEntities(title)}</p>
            {primaryArtists && (
                <p className="text-xs text-gray-500 text-center truncate w-full">
                    {decodeHtmlEntities(primaryArtists)}
                </p>
            )}
        </div>
    );
};

export default SongItem;
