import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { setEqualizerOpen } from '../features/ui/uiSlice';
import {
    setEqualizerEnabled,
    setEqualizerBand,
    setEqualizerPreset
} from '../features/musicplayer/musicPlayerSlice';
import { IoClose, IoToggle, IoToggleOutline } from 'react-icons/io5';
import { PRESETS, FREQUENCIES } from '../constants/equalizer';

const Equalizer: React.FC = () => {
    const dispatch = useAppDispatch();
    const { isEqualizerOpen } = useAppSelector((state) => state.ui);
    const { equalizerSettings } = useAppSelector((state) => state.musicPlayer);

    const formatFreq = (freq: number) => {
        return freq >= 1000 ? `${freq / 1000}k` : freq;
    };

    return (
        <AnimatePresence>
            {isEqualizerOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => dispatch(setEqualizerOpen(false))}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000]"
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 max-h-[90vh] bg-white dark:bg-gray-900 rounded-t-3xl z-[1010] shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-4">
                                <h2 className="text-xl font-bold dark:text-white">Equalizer</h2>
                                <button
                                    onClick={() => dispatch(setEqualizerEnabled(!equalizerSettings.enabled))}
                                    className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-medium transition-colors"
                                >
                                    {equalizerSettings.enabled ? (
                                        <IoToggle className="text-primary text-2xl" />
                                    ) : (
                                        <IoToggleOutline className="text-gray-400 text-2xl" />
                                    )}
                                    <span className={equalizerSettings.enabled ? 'text-primary' : 'text-gray-500'}>
                                        {equalizerSettings.enabled ? 'ON' : 'OFF'}
                                    </span>
                                </button>
                            </div>
                            <button
                                onClick={() => dispatch(setEqualizerOpen(false))}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            >
                                <IoClose size={24} className="dark:text-white" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Presets */}
                            <div className="space-y-3">
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Presets</p>
                                <div className="flex flex-wrap gap-2">
                                    {Object.keys(PRESETS).map((name) => (
                                        <button
                                            key={name}
                                            onClick={() => dispatch(setEqualizerPreset({ name, bands: PRESETS[name] }))}
                                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                                equalizerSettings.preset === name
                                                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                            }`}
                                        >
                                            {name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Bands */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-end h-64 gap-2 sm:gap-4">
                                    {equalizerSettings.bands.map((value, index) => (
                                        <div key={index} className="flex-1 flex flex-col items-center gap-4 h-full">
                                            <div className="flex-1 w-full relative flex justify-center">
                                                <input
                                                    type="range"
                                                    min="-12"
                                                    max="12"
                                                    step="0.5"
                                                    value={value}
                                                    disabled={!equalizerSettings.enabled}
                                                    onChange={(e) => dispatch(setEqualizerBand({ index, value: parseFloat(e.target.value) }))}
                                                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 -rotate-90 appearance-none bg-transparent cursor-pointer disabled:cursor-not-allowed [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-gray-200 dark:[&::-webkit-slider-runnable-track]:bg-gray-800 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-primary/50 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white dark:[&::-webkit-slider-thumb]:border-gray-900 ${!equalizerSettings.enabled && 'opacity-50'}`}
                                                />
                                            </div>
                                            <div className="text-center space-y-1">
                                                <p className="text-[10px] font-bold text-primary">{value > 0 ? `+${value}` : value}dB</p>
                                                <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{formatFreq(FREQUENCIES[index])}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default Equalizer;
