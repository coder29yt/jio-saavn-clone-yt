import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAppSelector } from '../hooks/redux';
import Slider from './Slider';
import DailyMix from './DailyMix';
import { motion } from 'framer-motion';
import { IoCloudOffline, IoArrowForward } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import { modules, songs as songsUrl, playlistSearch, searchArtist, playlistById } from '../constants';

const MainSection: React.FC = () => {
    const navigate = useNavigate();
    const { language } = useAppSelector((state) => state.language);
    const { recentlyPlayed, recentlyPlayedAlbums } = useAppSelector((state) => state.musicPlayer);
    const [data, setData] = useState<{
        albums: any[];
        songs: any[];
        playlists: any[];
        artists: any[];
        meditation: any[];
        work: any[];
        devPicks: any[];
        chill: any[];
        workout: any[];
    }>({
        albums: [],
        songs: [],
        playlists: [],
        artists: [],
        meditation: [],
        work: [],
        devPicks: [],
        chill: [],
        workout: []
    });
    const [loading, setLoading] = useState(true);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        if (isOffline) return;
        const fetchData = async () => {
            try {
                setLoading(true);

                // Curated artists per language
                const curatedArtists: Record<string, string[]> = {
                    telugu: ['Sid Sriram', 'Thaman S', 'Devi Sri Prasad', 'Mani Sharma', 'S. P. Balasubrahmanyam', 'Karthik', 'Anurag Kulkarni', 'Ram Miriyala', 'Mangli', 'Armaan Malik', 'Geetha Madhuri', 'S. Janaki'],
                    hindi: ['Arijit Singh', 'Shreya Ghoshal', 'Badshah', 'Pritam', 'Anirudh Ravichander', 'Jubin Nautiyal', 'Neha Kakkar', 'Atif Aslam', 'Sunidhi Chauhan', 'Vishal Dadlani', 'Amit Trivedi', 'Mohit Chauhan'],
                    punjabi: ['Sidhu Moose Wala', 'Diljit Dosanjh', 'Karan Aujla', 'AP Dhillon', 'Guru Randhawa', 'Hardy Sandhu', 'Ammy Virk', 'Jasmine Sandlas', 'Nimrat Khaira', 'Sharry Maan', 'Satinder Sartaaj', 'B Praak'],
                    tamil: ['Anirudh Ravichander', 'A. R. Rahman', 'Yuvan Shankar Raja', 'Santhosh Narayanan', 'G. V. Prakash', 'Harris Jayaraj', 'D. Imman', 'Vijay Antony', 'Hiphop Tamizha', 'Shweta Mohan', 'Sujatha', 'Haricharan'],
                    english: ['Taylor Swift', 'The Weeknd', 'Drake', 'Ed Sheeran', 'Justin Bieber', 'Dua Lipa', 'Bruno Mars', 'Ariana Grande', 'Billie Eilish', 'Post Malone', 'Kendrick Lamar', 'Rihanna', 'Eminem', 'Sia']
                };

                const artistsToFetch = curatedArtists[language.toLowerCase()] || [language];

                // Helper to sanitize base URLs for limit parameter
                const getSanitizedUrl = (baseUrl: string) => {
                    return baseUrl.includes('limit=')
                        ? baseUrl.split('limit=')[0].slice(0, -1)
                        : baseUrl;
                };

                const sanitizedPlaylistSearch = getSanitizedUrl(playlistSearch);
                const sanitizedSearchArtist = getSanitizedUrl(searchArtist);

                const results = await Promise.allSettled([
                    axios.get(`${modules}${language}&page=0&limit=25`),
                    axios.get(`${songsUrl}?query=${language}&page=0&limit=25`),
                    axios.get(`${playlistSearch}${language}`),
                    axios.get(`${sanitizedPlaylistSearch}${sanitizedPlaylistSearch.includes('?') ? '&' : '?'}query=${encodeURIComponent(language + ' Meditation')}&limit=15`),
                    axios.get(`${sanitizedPlaylistSearch}${sanitizedPlaylistSearch.includes('?') ? '&' : '?'}query=${encodeURIComponent(language + ' Work')}&limit=15`),
                    axios.get(`${playlistById}158224644`),
                    axios.get(`${sanitizedPlaylistSearch}${sanitizedPlaylistSearch.includes('?') ? '&' : '?'}query=${encodeURIComponent(language + ' Chill')}&limit=15`),
                    axios.get(`${sanitizedPlaylistSearch}${sanitizedPlaylistSearch.includes('?') ? '&' : '?'}query=${encodeURIComponent(language + ' Workout')}&limit=15`),
                    ...artistsToFetch.map(name => {
                        return axios.get(`${sanitizedSearchArtist}${sanitizedSearchArtist.includes('?') ? '&' : '?'}query=${encodeURIComponent(name)}&limit=1`);
                    })
                ]);

                const albumsRes = results[0];
                const songsRes = results[1];
                const playlistsRes = results[2];
                const meditationRes = results[3];
                const workRes = results[4];
                const devPicksRes = results[5];
                const chillRes = results[6];
                const workoutRes = results[7];
                const artistsResults = results.slice(8);

                const artistList = artistsResults
                    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
                    .map(r => r.value.data.data.results?.[0])
                    .filter(Boolean);

                setData({
                    albums: albumsRes.status === 'fulfilled' ? (albumsRes.value.data.data.results || []) : [],
                    songs: songsRes.status === 'fulfilled' ? (songsRes.value.data.data.results || []) : [],
                    playlists: playlistsRes.status === 'fulfilled' ? (playlistsRes.value.data.data.results || []) : [],
                    artists: artistList,
                    meditation: meditationRes.status === 'fulfilled' ? (meditationRes.value.data.data.results || []) : [],
                    work: workRes.status === 'fulfilled' ? (workRes.value.data.data.results || []) : [],
                    devPicks: devPicksRes.status === 'fulfilled' ? (devPicksRes.value.data.data.songs || []) : [],
                    chill: chillRes.status === 'fulfilled' ? (chillRes.value.data.data.results || []) : [],
                    workout: workoutRes.status === 'fulfilled' ? (workoutRes.value.data.data.results || []) : []
                });
            } catch (error) {
                console.error('Error in fetchData:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [language]);

    if (isOffline) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] px-6 text-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 text-gray-400"
                >
                    <IoCloudOffline size={48} />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">You're Offline</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
                    Check your internet connection or listen to your downloaded songs while you wait.
                </p>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/library?tab=offline')}
                    className="flex items-center gap-2 bg-primary hover:bg-red-600 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-primary/30 transition-all"
                >
                    Go to Downloads <IoArrowForward />
                </motion.button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="pb-32 pt-8 px-4"
        >
            <DailyMix />

            {recentlyPlayed && recentlyPlayed.length > 0 && (
                <motion.div variants={itemVariants} className="mb-12">
                    <Slider data={recentlyPlayed} title="Recently Played Songs" />
                </motion.div>
            )}
            {recentlyPlayedAlbums && recentlyPlayedAlbums.length > 0 && (
                <motion.div variants={itemVariants} className="mb-12">
                    <Slider data={recentlyPlayedAlbums} title="Recently Played Albums" />
                </motion.div>
            )}
            {data.songs && data.songs.length > 0 && (
                <motion.div variants={itemVariants} className="mb-12">
                    <Slider data={data.songs} title="Trending Songs" />
                </motion.div>
            )}
            {data.albums && data.albums.length > 0 && (
                <motion.div variants={itemVariants} className="mb-12">
                    <Slider data={data.albums} title="Trending Albums" />
                </motion.div>
            )}
            {data.artists && data.artists.length > 0 && (
                <motion.div variants={itemVariants} className="mb-12">
                    <Slider data={data.artists} title="Featured Artists" />
                </motion.div>
            )}
            {data.playlists && data.playlists.length > 0 && (
                <motion.div variants={itemVariants} className="mb-12">
                    <Slider data={data.playlists} title="Top Playlists" />
                </motion.div>
            )}

            {data.meditation && data.meditation.length > 0 && (
                <motion.div variants={itemVariants} className="mb-12">
                    <Slider data={data.meditation} title="Meditation" />
                </motion.div>
            )}

            {data.work && data.work.length > 0 && (
                <motion.div variants={itemVariants} className="mb-12">
                    <Slider data={data.work} title="Work" />
                </motion.div>
            )}

            {data.devPicks && data.devPicks.length > 0 && (
                <motion.div variants={itemVariants} className="mb-12">
                    <Slider data={data.devPicks} title="Developer's Picks" />
                </motion.div>
            )}

            {data.chill && data.chill.length > 0 && (
                <motion.div variants={itemVariants} className="mb-12">
                    <Slider data={data.chill} title="Chill" />
                </motion.div>
            )}

            {data.workout && data.workout.length > 0 && (
                <motion.div variants={itemVariants} className="mb-12">
                    <Slider data={data.workout} title="Workout" />
                </motion.div>
            )}

        </motion.div>
    );
};

export default MainSection;
