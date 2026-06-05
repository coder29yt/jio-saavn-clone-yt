import React from 'react';
import { useParams } from 'react-router-dom';
import PageTemplate from '../components/PageTemplate';
import { playlistById } from '../constants';

const PlaylistPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const apiUrl = `${playlistById}${id}`;

    const getImageUrl = (data: any) => {
        if (Array.isArray(data?.image)) {
            return data.image.find((img: any) => img.quality === '500x500')?.url ||
                   data.image[data.image.length - 1]?.url;
        }
        return data?.image || '';
    };

    return <PageTemplate apiUrl={apiUrl} getImageUrl={getImageUrl} />;
};

export default PlaylistPage;
