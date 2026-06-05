import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setSleepTimer } from '../features/musicplayer/musicPlayerSlice';
import { MdOutlineTimer } from 'react-icons/md';

interface SleepTimerProps {
    showLabel?: boolean;
}

const SleepTimer: React.FC<SleepTimerProps> = ({ showLabel }) => {
    const dispatch = useAppDispatch();
    const { sleepTimer } = useAppSelector((state) => state.musicPlayer);
    const [isOpen, setIsOpen] = useState(false);

    const options = [
        { label: 'Off', value: null },
        { label: '1 min', value: 1 },
        { label: '5 min', value: 5 },
        { label: '15 min', value: 15 },
        { label: '30 min', value: 30 },
        { label: '1 hour', value: 60 },
    ];

    return (
        <div className="relative w-full">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center gap-3 transition-colors ${
                    showLabel
                        ? 'px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700'
                        : 'p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                } ${sleepTimer ? 'text-primary' : ''}`}
                title="Sleep Timer"
            >
                <div className="relative">
                    <MdOutlineTimer className="text-2xl" />
                    {sleepTimer && !showLabel && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-white">
                            {sleepTimer}
                        </span>
                    )}
                </div>
                {showLabel && (
                    <span className="flex-1 text-left">
                        Sleep Timer {sleepTimer ? `(${sleepTimer}m)` : ''}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className={`absolute bottom-full ${showLabel ? 'left-0' : 'right-0'} mb-2 w-48 rounded-lg bg-white dark:bg-gray-800 shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50`}>
                    <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="text-sm font-semibold">Sleep Timer</h3>
                    </div>
                    <div className="py-1">
                        {options.map((option) => (
                            <button
                                key={option.label}
                                onClick={() => {
                                    dispatch(setSleepTimer(option.value));
                                    setIsOpen(false);
                                }}
                                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                    sleepTimer === option.value ? 'text-primary font-medium' : ''
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SleepTimer;
