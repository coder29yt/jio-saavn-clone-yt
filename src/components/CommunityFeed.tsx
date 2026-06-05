import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { Song } from '../types/music';

// Mock data for community activity
const MOCK_ACTIVITY = [
    { id: '1', user: 'Aditi', song: 'Neeve', action: 'is listening to', time: 'Just now', image: 'https://www.jiosaavn.com/favicon.ico' },
    { id: '2', user: 'Rahul', song: 'Kesariya', action: 'added to favorites', time: '2m ago', image: 'https://www.jiosaavn.com/favicon.ico' },
    { id: '3', user: 'Sneha', song: 'Pasoori', action: 'is listening to', time: '5m ago', image: 'https://www.jiosaavn.com/favicon.ico' },
    { id: '4', user: 'Vikram', song: 'Blinding Lights', action: 'created a playlist', time: '12m ago', image: 'https://www.jiosaavn.com/favicon.ico' },
];

const CommunityFeed: React.FC = () => {
    const [activities, setActivities] = useState(MOCK_ACTIVITY);

    useEffect(() => {
        // Simulate real-time updates
        const interval = setInterval(() => {
            const users = ['Arjun', 'Priya', 'Karthik', 'Ishani', 'Rohan'];
            const songs = ['Naatu Naatu', 'Heat Waves', 'Levitating', 'Starboy', 'Dynamite'];
            const actions = ['is listening to', 'liked', 'added to queue'];

            const newActivity = {
                id: Date.now().toString(),
                user: users[Math.floor(Math.random() * users.length)],
                song: songs[Math.floor(Math.random() * songs.length)],
                action: actions[Math.floor(Math.random() * actions.length)],
                time: 'Just now',
                image: 'https://www.jiosaavn.com/favicon.ico'
            };

            setActivities(prev => [newActivity, ...prev.slice(0, 7)]);
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-white/5 dark:bg-gray-800/20 backdrop-blur-md rounded-3xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Community Pulse
                </h3>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-widest">Live</span>
            </div>

            <div className="space-y-4">
                <AnimatePresence initial={false}>
                    {activities.map((activity) => (
                        <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors group cursor-pointer"
                        >
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/20 overflow-hidden">
                                <img src={activity.image} alt="" className="w-6 h-6 object-contain opacity-50 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm">
                                    <span className="font-bold text-primary">{activity.user}</span>
                                    <span className="text-gray-500 mx-1">{activity.action}</span>
                                    <span className="font-semibold truncate block md:inline">{decodeHtmlEntities(activity.song)}</span>
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{activity.time}</p>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <button className="w-full mt-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-widest transition-all border border-white/5 hover:border-white/10">
                View All Activity
            </button>
        </div>
    );
};

export default CommunityFeed;
