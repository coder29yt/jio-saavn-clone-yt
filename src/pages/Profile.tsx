import React from 'react';
import { useAppSelector } from '../hooks/redux';
import { motion } from 'framer-motion';
import { IoHeartOutline, IoLibraryOutline, IoTimeOutline, IoPersonCircleOutline } from 'react-icons/io5';
import PageTemplate from '../components/PageTemplate';

const Profile: React.FC = () => {
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const { favorites, playlists } = useAppSelector((state) => state.library);
    const { recentlyPlayed } = useAppSelector((state) => state.musicPlayer);

    if (!isAuthenticated || !user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
                <IoPersonCircleOutline size={80} className="text-gray-300 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Profile</h2>
                <p className="text-gray-500">Please sign in to view your profile and statistics.</p>
            </div>
        );
    }

    const stats = [
        { label: 'Favorites', value: favorites.length, icon: <IoHeartOutline className="text-red-500" /> },
        { label: 'Playlists', value: playlists.length, icon: <IoLibraryOutline className="text-blue-500" /> },
        { label: 'Recently Played', value: recentlyPlayed.length, icon: <IoTimeOutline className="text-green-500" /> },
    ];

    return (
        <PageTemplate title="My Profile">
            <div className="space-y-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-center gap-6 p-8 bg-gray-50 dark:bg-gray-800/40 rounded-3xl backdrop-blur-sm border border-white/10">
                    <img
                        src={user.user_metadata?.avatar_url || '/android/android-launchericon-192-192.png'}
                        alt="Profile"
                        className="w-32 h-32 rounded-full border-4 border-primary shadow-2xl object-cover"
                    />
                    <div className="text-center md:text-left">
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1">
                            {user.user_metadata?.full_name || 'VibeOn User'}
                        </h1>
                        <p className="text-gray-500 font-medium">{user.email}</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm flex items-center gap-4"
                        >
                            <div className="text-3xl p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                {stat.icon}
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-0.5">{stat.label}</p>
                                <p className="text-2xl font-black">{stat.value}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Listening Activity section can be expanded later */}
            </div>
        </PageTemplate>
    );
};

export default Profile;
