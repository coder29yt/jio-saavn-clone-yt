import React from 'react';
import { useParams } from 'react-router-dom';
import PageTemplate from '../components/PageTemplate';
import { albumById } from '../constants';

const AlbumDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const apiUrl = `${albumById}${id}`;

    const getImageUrl = (data: any) => {
        if (Array.isArray(data?.image)) {
            return data.image.find((img: any) => img.quality === '500x500')?.url ||
                   data.image[data.image.length - 1]?.url;
        }
        return data?.image || '';
    };

    return <PageTemplate apiUrl={apiUrl} getImageUrl={getImageUrl} />;
};

export default AlbumDetails;
