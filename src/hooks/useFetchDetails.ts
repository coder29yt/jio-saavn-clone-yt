import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface FetchDetailsResult<T> {
    details: T | null;
    loading: boolean;
    error: string | null;
    image: string;
}

const useFetchDetails = <T extends { name?: string; title?: string }>(
    apiUrl: string,
    getImageUrl: (data: T) => string
): FetchDetailsResult<T> => {
    const [details, setDetails] = useState<T | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [image, setImage] = useState<string>('');

    const stableGetImageUrl = useCallback(getImageUrl, []);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!apiUrl) return;
            try {
                setLoading(true);
                setError(null);
                const response = await axios.get(apiUrl);
                const data = response.data?.data;
                if (!data) {
                    throw new Error('No data received from server');
                }
                setDetails(data);
                setImage(stableGetImageUrl(data));
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Failed to fetch details.');
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [apiUrl, stableGetImageUrl]);

    return { details, loading, error, image };
};

export default useFetchDetails;
