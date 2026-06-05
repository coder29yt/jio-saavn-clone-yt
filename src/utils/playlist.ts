import { Song } from '../types/music';

export const getNextSong = (
    currentSong: Song | null,
    songs: Song[],
    shuffle: boolean,
    repeatMode: 'none' | 'all' | 'one',
    isManual: boolean = true
): Song | null => {
    if (songs.length === 0) return null;
    if (!currentSong) return songs[0];

    const currentIndex = songs.findIndex((song) => song.id === currentSong.id);

    if (!isManual && repeatMode === 'one') {
        return currentSong;
    }

    let nextIndex;
    if (shuffle) {
        nextIndex = Math.floor(Math.random() * songs.length);
        if (nextIndex === currentIndex && songs.length > 1) {
            nextIndex = (nextIndex + 1) % songs.length;
        }
    } else {
        nextIndex = (currentIndex + 1) % songs.length;
        if (!isManual && currentIndex === songs.length - 1 && repeatMode === 'none') {
            return null;
        }
    }

    return songs[nextIndex];
};

export const getPrevSong = (
    currentSong: Song | null,
    songs: Song[],
    shuffle: boolean
): Song | null => {
    if (songs.length === 0) return null;
    if (!currentSong) return songs[songs.length - 1];

    const currentIndex = songs.findIndex((song) => song.id === currentSong.id);

    let prevIndex;
    if (shuffle) {
        prevIndex = Math.floor(Math.random() * songs.length);
        if (prevIndex === currentIndex && songs.length > 1) {
            prevIndex = (prevIndex - 1 + songs.length) % songs.length;
        }
    } else {
        prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    }

    return songs[prevIndex];
};
