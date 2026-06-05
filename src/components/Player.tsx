import { BiRepeat } from 'react-icons/bi';
import { IoMdSkipBackward, IoMdSkipForward } from 'react-icons/io';
import { PiShuffleBold, PiRepeatOnceBold } from 'react-icons/pi';
import { FaPlay, FaPause } from 'react-icons/fa';
import { HiSpeakerWave } from 'react-icons/hi2';
import { LuHardDriveDownload } from 'react-icons/lu';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { IoEllipsisVertical } from 'react-icons/io5';
import { RiShareForwardLine } from 'react-icons/ri';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import {
    playMusic,
    decrementSleepTimer,
    setCurrentTime,
    setSongRadioEnabled,
    setVisualizerStyle,
    toggleRepeatMode,
    toggleShuffle,
    nextSong,
    prevSong as prevSongAction,
} from '../features/musicplayer/musicPlayerSlice';
import { useNavigate } from 'react-router-dom';
import SleepTimer from './SleepTimer';
import VolumeController from './VolumeController';
import { motion, AnimatePresence } from 'framer-motion';
import { HiQueueList } from 'react-icons/hi2';
import { MdOutlineGraphicEq, MdOutlineCloseFullscreen, MdBarChart, MdShowChart, MdBubbleChart, MdDonutLarge, MdApps } from 'react-icons/md';
import { MdOutlineLyrics } from 'react-icons/md';
import { IoHeartOutline, IoHeart, IoAddCircleOutline, IoClose } from 'react-icons/io5';
import { suggestions } from '../constants';
import { decodeHtmlEntities } from '../utils/decodeHtml';
import { setRecommendations, setQueueOpen } from '../features/musicplayer/musicPlayerSlice';
import { getOfflineSong } from '../utils/db';
import Visualizer from './Visualizer';
import MobileNowPlaying from './MobileNowPlaying';
import Lyrics from './Lyrics';
import { toggleFavoriteCloud } from '../features/library/libraryActions';
import { openPlaylistModal, setEqualizerOpen, setLyricsOpen, setAccentColor, setPlayerExpanded } from '../features/ui/uiSlice';
import { Song } from '../types/music';
import { getDominantColor } from '../utils/colorExtractor';
import { getNextSong, getPrevSong } from '../utils/playlist';

const Player = ({ onShowMiniPlayer }: { onShowMiniPlayer?: () => void }) => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [isDownloading, setIsDownloading] = useState(false);
    const [isVolumeVisible, setIsVolumeVisible] = useState(false);
    const [seekAnimation, setSeekAnimation] = useState<'forward' | 'backward' | null>(null);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const [userVolume, setUserVolume] = useState(0.7);

    const {
        currentSong, isPlaying, songs, sleepTimer, preferredQuality, isQueueOpen,
        isGaplessEnabled, crossfadeDuration, recommendations, isSongRadioEnabled,
        visualizerStyle, repeatMode, shuffle, recommendationsCache
    } = useAppSelector((state) => state.musicPlayer);

    const { isLyricsOpen, isPlayerExpanded, theme: uiTheme } = useAppSelector((state) => state.ui);
    const { favorites } = useAppSelector((state) => state.library);

    const [imageUrl, setImageUrl] = useState<string>('');
    const isFavorite = favorites.some(s => s.id === currentSong?.id);
    const lastProcessedSongId = useRef<string | null>(null);

    const currentBlobUrlsRef = useRef<{ audio?: string; image?: string }>({});

    const revokeAudioBlob = useCallback(() => {
        if (currentBlobUrlsRef.current.audio) {
            URL.revokeObjectURL(currentBlobUrlsRef.current.audio);
            currentBlobUrlsRef.current.audio = undefined;
        }
    }, []);

    const revokeImageBlob = useCallback(() => {
        if (currentBlobUrlsRef.current.image) {
            URL.revokeObjectURL(currentBlobUrlsRef.current.image);
            currentBlobUrlsRef.current.image = undefined;
        }
    }, []);

    useEffect(() => {
        return () => {
            revokeAudioBlob();
            revokeImageBlob();
        };
    }, [revokeAudioBlob, revokeImageBlob]);

    // Dual buffer system
    const audioRefA = useRef<HTMLAudioElement>(new Audio(''));
    const audioRefB = useRef<HTMLAudioElement>(new Audio(''));
    const [activeBuffer, setActiveBuffer] = useState<'A' | 'B'>('A');
    const [isCrossfading, setIsCrossfading] = useState(false);

    const getActiveAudio = () => activeBuffer === 'A' ? audioRefA.current : audioRefB.current;
    const getInactiveAudio = () => activeBuffer === 'A' ? audioRefB.current : audioRefA.current;

    useEffect(() => {
        [audioRefA.current, audioRefB.current].forEach(audio => {
            audio.crossOrigin = 'anonymous';
            audio.preload = 'auto';
        });
    }, []);

    const getSongUrl = useCallback(async (song: Song | null, isPreload = false) => {
        if (!song) return '';

        // Check if song is offline
        const offlineSong = await getOfflineSong(song.id);
        if (offlineSong?.audioBlob) {
            const url = URL.createObjectURL(offlineSong.audioBlob);
            if (!isPreload) {
                revokeAudioBlob();
                currentBlobUrlsRef.current.audio = url;
            }
            return url;
        }

        const musicData = song.music || song.downloadUrl;
        if (Array.isArray(musicData)) {
            return musicData.find((d: any) => d.quality === preferredQuality)?.url || musicData[musicData.length - 1]?.url;
        }
        return musicData || '';
    }, [preferredQuality, revokeAudioBlob]);

    const playNextInQueue = useCallback((isManual = true) => {
        if (!isManual && repeatMode === 'one') {
            const activeAudio = getActiveAudio();
            activeAudio.currentTime = 0;
            activeAudio.play().catch(e => console.warn("Playback failed", e));
            return;
        }

        if (!isManual && isGaplessEnabled && !isCrossfading) {
            // Logic for end of queue without repeat is handled in timeupdate
            return;
        }

        dispatch(nextSong({ isManual }));
    }, [dispatch, isGaplessEnabled, isCrossfading, repeatMode, shuffle]);

    const prevSong = useCallback(() => {
        dispatch(prevSongAction());
    }, [dispatch]);

    // Handle Metadata, Recommendations & Theme
    useEffect(() => {
        if (currentSong) {
            setImageUrl(''); // Clear current image to avoid double-processing with old image
            // Resolve Image URL (Offline first)
            getOfflineSong(currentSong.id).then(offlineSong => {
                let url = '';
                if (offlineSong?.imageBlob) {
                    revokeImageBlob();
                    url = URL.createObjectURL(offlineSong.imageBlob);
                    currentBlobUrlsRef.current.image = url;
                } else {
                    url = typeof currentSong.image === 'string'
                        ? currentSong.image
                        : currentSong.image?.[currentSong.image?.length - 1]?.url || '';
                }
                setImageUrl(url);
            });
        }
    }, [currentSong?.id, revokeImageBlob]);

    useEffect(() => {
        if (currentSong && currentSong.id !== lastProcessedSongId.current) {
            lastProcessedSongId.current = currentSong.id;

            // Update Theme Color & Media Session when image is ready (or if it's already there)
            // But we fetch suggestions strictly once based on ID
            const cached = recommendationsCache[currentSong.id];
            const oneHour = 60 * 60 * 1000;
            const isCacheValid = cached && (Date.now() - cached.timestamp < oneHour);

            if (isCacheValid) {
                dispatch(setRecommendations({ songId: currentSong.id, recommendations: cached.songs }));
            } else {
                fetch(suggestions(currentSong.id))
                    .then(res => res.json())
                    .then(data => {
                        if (data.status === 'SUCCESS' && data.data) {
                            dispatch(setRecommendations({ songId: currentSong.id, recommendations: data.data }));
                        }
                    }).catch(err => console.error('Error fetching recommendations:', err));
            }
        }

        if (currentSong && imageUrl) {
            // Update Theme Color
            getDominantColor(imageUrl).then(color => {
                if (uiTheme.accentColor !== color) {
                    dispatch(setAccentColor(color));
                }
            });

            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new window.MediaMetadata({
                  title: currentSong?.name,
                  artist: currentSong?.primaryArtists,
                  album: typeof currentSong?.album === 'string' ? currentSong?.album : currentSong?.album?.name,
                  artwork: [{ src: imageUrl || '', sizes: '512x512', type: 'image/png' }]
                });
                navigator.mediaSession.setActionHandler('previoustrack', prevSong);
                navigator.mediaSession.setActionHandler('nexttrack', () => playNextInQueue(true));
            }
        }
    }, [currentSong?.id, dispatch, imageUrl, prevSong, playNextInQueue, recommendationsCache, uiTheme.accentColor]);

    // Handle Playback State
    useEffect(() => {
        const activeAudio = getActiveAudio();

        getSongUrl(currentSong).then(songUrl => {
            if (songUrl && activeAudio.src !== songUrl) {
                activeAudio.src = songUrl;
                setIsCrossfading(false);
            }

            if (isPlaying) {
                activeAudio.play().catch(e => console.warn("Playback failed", e));
            } else {
                activeAudio.pause();
                getInactiveAudio().pause();
            }
        });
    }, [currentSong?.id, activeBuffer, getSongUrl]);

    useEffect(() => {
        const activeAudio = getActiveAudio();
        if (isPlaying) {
            activeAudio.play().catch(e => console.warn("Playback failed", e));
        } else {
            activeAudio.pause();
            getInactiveAudio().pause();
        }
    }, [isPlaying]);

    // Preload next song
    useEffect(() => {
        if (isGaplessEnabled && currentSong && songs.length > 0) {
            const next = getNextSong(currentSong, songs, shuffle, repeatMode, false);

            if (next) {
                getSongUrl(next, true).then(nextUrl => {
                    const inactiveAudio = getInactiveAudio();
                    if (nextUrl && inactiveAudio.src !== nextUrl) {
                        inactiveAudio.src = nextUrl;
                        inactiveAudio.load();
                    }
                });
            }
        }
    }, [currentSong?.id, songs, isGaplessEnabled, activeBuffer, getSongUrl, shuffle, repeatMode]);

    // Crossfade Logic
    useEffect(() => {
        const activeAudio = getActiveAudio();
        const inactiveAudio = getInactiveAudio();

        const handleTimeUpdate = () => {
            if (!currentSong) return;
            const duration = activeAudio.duration;
            const currentTime = activeAudio.currentTime;

            dispatch(setCurrentTime(currentTime));

            // Update Progress Bar
            const progress = (currentTime / (duration || 1)) * 100;
            const progressElement = document.getElementById('progress') as HTMLInputElement;
            if (progressElement) {
                progressElement.value = progress.toString();
                const value = progress;
                const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#ef4444';
                progressElement.style.background = `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${value}%, #e5e7eb ${value}%, #e5e7eb 100%)`;
            }

            // Crossfade Trigger
            if (isGaplessEnabled && !isCrossfading && duration > 0 && currentTime > (duration - crossfadeDuration)) {
                if (repeatMode === 'one') {
                    // Don't crossfade into the same song
                } else if (repeatMode === 'none' && !shuffle && songs.findIndex(s => s.id === currentSong?.id) === songs.length - 1) {
                    // Don't crossfade at the very end if repeat is none
                } else {
                    setIsCrossfading(true);
                    startCrossfade();
                }
            }
        };

        const startCrossfade = () => {
            const next = getNextSong(currentSong, songs, shuffle, repeatMode, false);

            if (!next) {
                setIsCrossfading(false);
                return;
            }

            getSongUrl(next, true).then(url => {
                inactiveAudio.src = url;
            });

            inactiveAudio.volume = 0;
            inactiveAudio.play().then(() => {
                // Ramp volumes
                const steps = 20;
                const interval = (crossfadeDuration * 1000) / steps;
                let step = 0;

                const fade = setInterval(() => {
                    step++;
                    const progress = step / steps;

                    // Simple linear fade for now
                    activeAudio.volume = userVolume * (1 - progress);
                    inactiveAudio.volume = userVolume * progress;

                    if (step >= steps) {
                        clearInterval(fade);
                        // Complete transition
                        activeAudio.pause();
                        activeAudio.currentTime = 0;
                        setActiveBuffer(activeBuffer === 'A' ? 'B' : 'A');
                        setIsCrossfading(false);

                        // Update Redux state to the new song
                        dispatch(playMusic({
                            ...next,
                            albumId: next?.album && typeof next.album !== 'string' ? next.album.id : undefined,
                            forcePlay: true, // Ensure it plays and handles state update correctly
                        }));
                    }
                }, interval);
            }).catch(err => {
                console.error("Crossfade play failed", err);
                setIsCrossfading(false);
            });
        };

        const handleSongEnd = () => {
            if (!isCrossfading) {
                if (repeatMode === 'one') {
                    const activeAudio = getActiveAudio();
                    activeAudio.currentTime = 0;
                    activeAudio.play().catch(e => console.warn("Playback failed", e));
                } else {
                    const index = songs.findIndex((song) => song.id === currentSong?.id);
                    const isLastSong = index === songs.length - 1;

                    if (isLastSong && repeatMode === 'none') {
                        if (isSongRadioEnabled && recommendations.length > 0) {
                            const randomSong = recommendations[Math.floor(Math.random() * Math.min(5, recommendations.length))];
                            dispatch(playMusic(randomSong));
                        } else {
                            // If it's the end and no radio/repeat, just pause or handle as end of queue
                            dispatch(playMusic(currentSong!)); // Re-set to same song but...
                            // In a real app we might want to just stop.
                        }
                    } else {
                        playNextInQueue(false);
                    }
                }
            }
        };

        activeAudio.addEventListener('timeupdate', handleTimeUpdate);
        activeAudio.addEventListener('ended', handleSongEnd);

        return () => {
            activeAudio.removeEventListener('timeupdate', handleTimeUpdate);
            activeAudio.removeEventListener('ended', handleSongEnd);
        };
    }, [activeBuffer, currentSong, isGaplessEnabled, isCrossfading, crossfadeDuration, songs, userVolume, dispatch, playNextInQueue, repeatMode, shuffle, isSongRadioEnabled, recommendations]);

    // Update individual audio volumes based on user global volume
    useEffect(() => {
        if (!isCrossfading) {
            audioRefA.current.volume = userVolume;
            audioRefB.current.volume = userVolume;
        }
    }, [userVolume, isCrossfading]);

    const handleSeek = (time: number) => {
        const activeAudio = getActiveAudio();
        if (time >= 0) {
            activeAudio.currentTime = time;
        }
    };

    const handleProgressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const activeAudio = getActiveAudio();
        const newPercentage = parseFloat(event.target.value);
        const newTime = (newPercentage / 100) * (activeAudio.duration || 0);
        handleSeek(newTime);
    };

    const handlePlayPause = () => {
        dispatch(playMusic(currentSong));
    };

    const handleDoubleTap = (side: 'left' | 'right') => {
        const activeAudio = getActiveAudio();
        const seekAmount = side === 'left' ? -10 : 10;
        activeAudio.currentTime = Math.max(0, Math.min(activeAudio.duration, activeAudio.currentTime + seekAmount));
        setSeekAnimation(side === 'left' ? 'backward' : 'forward');
        setTimeout(() => setSeekAnimation(null), 500);
    };

    const handleDownloadSong = async (url: string) => {
        if (!url) return;
        setIsDownloading(true);
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${currentSong?.name}.mp3`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.warn('Error downloading the song', error);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleShare = async () => {
        const songUrl = window.location.origin + `/albums/${currentSong?.albumId}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: currentSong?.name,
                    text: `Check out ${currentSong?.name} by ${currentSong?.primaryArtists} on VibeOn!`,
                    url: songUrl,
                });
            } catch (error) { console.log('Error sharing', error); }
        } else {
            navigator.clipboard.writeText(songUrl);
            alert('Link copied to clipboard!');
        }
    };

    return (
        <>
        <AnimatePresence>
            {currentSong && (
                <motion.div
                    key="mini-player"
                    data-testid="mini-player"
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className={`dark:text-white fixed bottom-0 right-0 left-0 bg-white/80 backdrop-blur-lg border-t border-white/20 dark:border-gray-800/20 flex flex-col z-[210] ${uiTheme?.isOled ? 'dark:bg-black/80' : 'dark:bg-gray-900/80'}`}
                >
                    <div className="absolute inset-0 z-0 pointer-events-none">
                        <Visualizer audioRefs={[audioRefA, audioRefB]} isPlaying={isPlaying} />
                    </div>
                    <input
                        type="range"
                        id="progress"
                        min={0}
                        max={100}
                        step="0.1"
                        defaultValue={0}
                        onChange={handleProgressChange}
                        className="w-full h-[3px] cursor-pointer appearance-none bg-gray-200 dark:bg-gray-700"
                    />
                    <div className="flex justify-between items-center py-3 px-4 lg:px-8 cursor-pointer" onClick={(e) => {
                        // Prevent opening mobile player if a button was clicked
                        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
                        dispatch(setPlayerExpanded(true));
                    }}>
                        {/* 1st div */}
                        <div className="flex justify-start items-center gap-4 lg:w-[30vw]">
                            <motion.div
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                onDragEnd={(_, info) => {
                                    if (info.offset.x > 100) prevSong();
                                    else if (info.offset.x < -100) playNextInQueue(true);
                                }}
                                className="relative group cursor-grab active:cursor-grabbing"
                            >
                                <motion.img
                                    layoutId="player-album-art"
                                    src={imageUrl}
                                    alt=""
                                    width={55}
                                    height={55}
                                    className="rounded-xl shadow-lg"
                                    loading="lazy"
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const x = e.clientX - rect.left;
                                        handleDoubleTap(x < rect.width / 2 ? 'left' : 'right');
                                    }}
                                />
                                <AnimatePresence>
                                    {seekAnimation && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.5 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.5 }}
                                            className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10 ${seekAnimation === 'backward' ? 'pr-8' : 'pl-8'}`}
                                        >
                                            <div className="bg-black/40 text-white px-2 py-1 rounded-full text-[10px] font-bold">
                                                {seekAnimation === 'backward' ? '-10s' : '+10s'}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 rounded-full transition-opacity flex items-center justify-center pointer-events-none">
                                    <span className="text-[8px] text-white font-bold uppercase">Swipe</span>
                                </div>
                            </motion.div>
                            <div
                                className="hidden md:block overflow-hidden max-w-[100px] xs:max-w-[150px] sm:max-w-[200px]"
                            >
                                <motion.p
                                    layoutId="player-song-name"
                                    className="font-semibold text-sm sm:text-base truncate"
                                >
                                    {decodeHtmlEntities(currentSong?.name)}
                                </motion.p>
                                <motion.p
                                    layoutId="player-song-artist"
                                    className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate"
                                >
                                    {decodeHtmlEntities(currentSong?.primaryArtists)}
                                </motion.p>
                            </div>
                            <div className="flex gap-2 items-center ml-2 lg:flex">
                                <div className="hidden lg:flex gap-2">
                                    <motion.button
                                        whileTap={{ scale: 0.8 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            dispatch(toggleFavoriteCloud(currentSong!) as any);
                                        }}
                                    >
                                        {isFavorite ? (
                                            <IoHeart
                                                className="text-primary cursor-pointer text-xl"
                                            />
                                        ) : (
                                            <IoHeartOutline
                                                className="text-gray-500 hover:text-primary cursor-pointer text-xl"
                                            />
                                        )}
                                    </motion.button>
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                dispatch(openPlaylistModal(currentSong!));
                                            }}
                                            className="flex items-center"
                                        >
                                            <IoAddCircleOutline
                                                className="text-gray-500 hover:text-primary cursor-pointer text-xl"
                                                title="Add to Playlist"
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2nd div */}
                        <div className="flex text-2xl lg:text-3xl gap-6 lg:gap-8 lg:w-[40vw] justify-center items-center">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    dispatch(toggleShuffle());
                                }}
                                className="hidden sm:block"
                            >
                                <PiShuffleBold
                                    style={shuffle ? { color: uiTheme.accentColor } : {}}
                                    className={`${shuffle ? '' : 'text-gray-400'} cursor-pointer hover:text-primary transition-colors`}
                                />
                            </button>
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    prevSong();
                                }}
                            >
                                <IoMdSkipBackward
                                    className="text-gray-700 dark:text-gray-200 hover:text-primary cursor-pointer transition-colors"
                                />
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlayPause();
                                }}
                                className="w-12 h-12 flex items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-red-600 transition-colors"
                            >
                                {isPlaying ? <FaPause size={20} /> : <FaPlay size={20} className="ml-1" />}
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    playNextInQueue(true);
                                }}
                            >
                                <IoMdSkipForward
                                    className="text-gray-700 dark:text-gray-200 hover:text-primary cursor-pointer transition-colors"
                                />
                            </motion.button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    dispatch(toggleRepeatMode());
                                }}
                                className="hidden sm:block"
                            >
                                {repeatMode === 'one' ? (
                                    <PiRepeatOnceBold style={{ color: uiTheme.accentColor }} className="cursor-pointer transition-colors" />
                                ) : (
                                    <BiRepeat
                                        style={repeatMode === 'all' ? { color: uiTheme.accentColor } : {}}
                                        className={`${repeatMode === 'all' ? '' : 'text-gray-400'} cursor-pointer hover:text-primary transition-colors`}
                                    />
                                )}
                            </button>
                        </div>

                        {/* 3rd div */}
                        <div className="flex lg:w-[30vw] justify-end items-center gap-3 lg:gap-5">
                            {/* Desktop Visualizer Selector */}
                            <div className="hidden xl:flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1 gap-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        dispatch(setVisualizerStyle('bars'));
                                    }}
                                    className={`p-1.5 rounded-full transition-all ${visualizerStyle === 'bars' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-primary'}`}
                                    title="Bars Visualizer"
                                >
                                    <MdBarChart size={18} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        dispatch(setVisualizerStyle('waveform'));
                                    }}
                                    className={`p-1.5 rounded-full transition-all ${visualizerStyle === 'waveform' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-primary'}`}
                                    title="Waveform Visualizer"
                                >
                                    <MdShowChart size={18} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        dispatch(setVisualizerStyle('particles'));
                                    }}
                                    className={`p-1.5 rounded-full transition-all ${visualizerStyle === 'particles' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-primary'}`}
                                    title="Particles Visualizer"
                                >
                                    <MdBubbleChart size={18} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        dispatch(setVisualizerStyle('circular'));
                                    }}
                                    className={`p-1.5 rounded-full transition-all ${visualizerStyle === 'circular' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-primary'}`}
                                    title="Circular Visualizer"
                                >
                                    <MdDonutLarge size={18} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        dispatch(setVisualizerStyle('pixel'));
                                    }}
                                    className={`p-1.5 rounded-full transition-all ${visualizerStyle === 'pixel' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-primary'}`}
                                    title="Pixel Visualizer"
                                >
                                    <MdApps size={18} />
                                </button>
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                className="hidden lg:block"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    dispatch(setLyricsOpen(!isLyricsOpen));
                                }}
                            >
                                <MdOutlineLyrics
                                    className={`text-2xl cursor-pointer hover:text-primary transition-colors ${isLyricsOpen ? 'text-primary' : 'text-gray-700 dark:text-gray-200'}`}
                                />
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    dispatch(setQueueOpen(!isQueueOpen));
                                }}
                            >
                                <HiQueueList
                                    className={`text-2xl cursor-pointer hover:text-primary transition-colors ${isQueueOpen ? 'text-primary' : 'text-gray-700 dark:text-gray-200'}`}
                                />
                            </motion.button>
                            <div className="hidden lg:block" onClick={(e) => e.stopPropagation()}>
                                <SleepTimer />
                            </div>

                            <div className="relative">
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsMoreMenuOpen(!isMoreMenuOpen);
                                    }}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full cursor-pointer transition-colors flex items-center justify-center"
                                >
                                    <IoEllipsisVertical className="text-xl text-gray-700 dark:text-gray-200" />
                                </motion.button>

                                <AnimatePresence>
                                    {isMoreMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                            className="absolute bottom-full right-0 mb-4 w-56 bg-white dark:bg-gray-800 shadow-2xl rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden py-2 z-[60]"
                                        >
                                            <div className="lg:hidden px-2 pb-2 mb-2 border-b border-gray-100 dark:border-gray-700">
                                                <div className="flex items-center gap-3 p-2">
                                                    <img src={imageUrl} alt="" className="w-10 h-10 rounded-lg shadow-sm" />
                                                    <div className="overflow-hidden">
                                                        <p className="text-sm font-bold truncate">{decodeHtmlEntities(currentSong?.name)}</p>
                                                        <p className="text-[10px] text-gray-500 truncate">{decodeHtmlEntities(currentSong?.primaryArtists)}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    dispatch(toggleFavoriteCloud(currentSong!) as any);
                                                    setIsMoreMenuOpen(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                {isFavorite ? <IoHeart className="text-primary" size={20} /> : <IoHeartOutline size={20} />}
                                                {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                                            </button>

                                            <button
                                                onClick={() => {
                                                    onShowMiniPlayer?.();
                                                    setIsMoreMenuOpen(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hidden lg:flex"
                                            >
                                                <MdOutlineCloseFullscreen size={20} /> Mini Player
                                            </button>

                                            <button
                                                onClick={() => {
                                                    dispatch(openPlaylistModal(currentSong!));
                                                    setIsMoreMenuOpen(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                title="Add to Playlist"
                                            >
                                                <IoAddCircleOutline size={20} /> Add to Playlist
                                            </button>

                                            <button
                                                onClick={() => {
                                                    dispatch(setEqualizerOpen(true));
                                                    setIsMoreMenuOpen(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <MdOutlineGraphicEq size={20} /> Equalizer
                                            </button>

                                            <div className="xl:hidden border-t border-gray-100 dark:border-gray-700 my-1 pt-1">
                                                <p className="px-4 py-1 text-[10px] font-bold text-gray-400 uppercase">Visualizer Mode</p>
                                                <div className="flex px-4 py-2 gap-4">
                                                    <button
                                                        onClick={() => {
                                                            dispatch(setVisualizerStyle('bars'));
                                                            setIsMoreMenuOpen(false);
                                                        }}
                                                        className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${visualizerStyle === 'bars' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                                    >
                                                        <MdBarChart size={20} />
                                                        <span className="text-[10px] font-bold uppercase">Bars</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            dispatch(setVisualizerStyle('waveform'));
                                                            setIsMoreMenuOpen(false);
                                                        }}
                                                        className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${visualizerStyle === 'waveform' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                                    >
                                                        <MdShowChart size={20} />
                                                        <span className="text-[10px] font-bold uppercase">Wave</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            dispatch(setVisualizerStyle('particles'));
                                                            setIsMoreMenuOpen(false);
                                                        }}
                                                        className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${visualizerStyle === 'particles' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                                    >
                                                        <MdBubbleChart size={20} />
                                                        <span className="text-[10px] font-bold uppercase">Particles</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            dispatch(setVisualizerStyle('circular'));
                                                            setIsMoreMenuOpen(false);
                                                        }}
                                                        className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${visualizerStyle === 'circular' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                                    >
                                                        <MdDonutLarge size={20} />
                                                        <span className="text-[10px] font-bold uppercase">Ring</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            dispatch(setVisualizerStyle('pixel'));
                                                            setIsMoreMenuOpen(false);
                                                        }}
                                                        className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${visualizerStyle === 'pixel' ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                                    >
                                                        <MdApps size={20} />
                                                        <span className="text-[10px] font-bold uppercase">Grid</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => {
                                                    dispatch(setLyricsOpen(true));
                                                    setIsMoreMenuOpen(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors lg:hidden"
                                            >
                                                <MdOutlineLyrics size={20} /> Lyrics
                                            </button>

                                            <button
                                                onClick={() => {
                                                    handleShare();
                                                    setIsMoreMenuOpen(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <RiShareForwardLine size={20} /> Share Song
                                            </button>

                                            <button
                                                onClick={() => {
                                                    dispatch(setSongRadioEnabled(!isSongRadioEnabled));
                                                    setIsMoreMenuOpen(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                <PiShuffleBold className={isSongRadioEnabled ? 'text-primary' : ''} size={20} />
                                                Song Radio: {isSongRadioEnabled ? 'ON' : 'OFF'}
                                            </button>

                                            <div className="lg:hidden border-t border-gray-100 dark:border-gray-700 mt-1">
                                                <SleepTimer showLabel />
                                            </div>

                                            {isDownloading ? (
                                                <div className="px-4 py-3 flex items-center gap-3 text-sm text-gray-400">
                                                    <AiOutlineLoading3Quarters className="animate-spin text-primary" />
                                                    Downloading...
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={async () => {
                                                        // For simple browser download, we can use the resolved URL
                                                        const songUrl = await getSongUrl(currentSong);
                                                        handleDownloadSong(songUrl || '');
                                                        setIsMoreMenuOpen(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    <LuHardDriveDownload size={20} /> Download Song
                                                </button>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div
                                className="relative"
                                onMouseEnter={() => setIsVolumeVisible(true)}
                                onMouseLeave={() => setIsVolumeVisible(false)}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <HiSpeakerWave className="text-gray-700 dark:text-gray-200 hover:text-primary text-2xl lg:text-3xl cursor-pointer hidden lg:block transition-colors" />
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
                                            value={userVolume}
                                            onChange={(e) => setUserVolume(parseFloat(e.target.value))}
                                            className="h-20 appearance-none bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer"
                                            style={{ writingMode: 'bt-lr', appearance: 'slider-vertical' } as any}
                                        />
                                        <span className="text-[10px] font-bold text-gray-500">{Math.round(userVolume * 100)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
        <MobileNowPlaying
            isOpen={isPlayerExpanded}
            onClose={() => dispatch(setPlayerExpanded(false))}
            handlePlayPause={handlePlayPause}
            handleProgressChange={handleProgressChange}
            handleSeek={handleSeek}
            imageUrl={imageUrl || ''}
            audioRefs={[audioRefA, audioRefB]}
        />

        <AnimatePresence>
            {isLyricsOpen && currentSong && !isPlayerExpanded && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className={`fixed inset-0 z-[150] bg-black/60 backdrop-blur-xl flex flex-col ${uiTheme?.isOled ? 'dark:bg-black/90' : 'dark:bg-gray-900/90'}`}
                >
                    <div className="flex justify-between items-center p-6 border-b border-white/10">
                        <div className="flex items-center gap-4">
                            <img src={imageUrl} alt="" className="w-12 h-12 rounded-lg shadow-lg" />
                            <div>
                                <h2 className="text-xl font-bold">{decodeHtmlEntities(currentSong.name)}</h2>
                                <p className="text-sm text-gray-400">{decodeHtmlEntities(currentSong.primaryArtists)}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => dispatch(setLyricsOpen(false))}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                        >
                            <IoClose size={32} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden relative">
                         <div className="absolute inset-0 opacity-20 pointer-events-none">
                             <Visualizer audioRefs={[audioRefA, audioRefB]} isPlaying={isPlaying} />
                         </div>
                         <Lyrics
                            isOpen={true}
                            onClose={() => dispatch(setLyricsOpen(false))}
                            songId={currentSong.id}
                            songName={currentSong.name}
                            artistName={currentSong.primaryArtists}
                            onSeek={handleSeek}
                        />
                    </div>
                    {/* Bottom bar space for player visibility */}
                    <div className="h-24 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                </motion.div>
            )}
        </AnimatePresence>
        </>
    );
};

export default Player;
