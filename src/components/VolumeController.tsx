import React, { useRef, useEffect } from 'react';
import { useAppSelector } from '../hooks/redux';

interface VolumeControllerProps {
    isVolumeVisible: boolean;
    audioRef: React.RefObject<HTMLAudioElement>;
}

const VolumeController: React.FC<VolumeControllerProps> = ({ isVolumeVisible, audioRef }) => {
    const [volume, setVolume] = React.useState(0.5);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume, audioRef]);

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
    };

    return (
        <div
            className={`absolute bottom-full right-0 mb-4 p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-xl rounded-2xl border border-white/20 transition-all duration-300 ${
                isVolumeVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
            }`}
        >
            <div className="h-24 flex flex-col items-center gap-2">
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="h-20 appearance-none bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer"
                    style={{ writingMode: 'bt-lr', appearance: 'slider-vertical' } as any}
                />
                <span className="text-[10px] font-bold text-gray-500">{Math.round(volume * 100)}%</span>
            </div>
        </div>
    );
};

export default VolumeController;
