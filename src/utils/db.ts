import { Song } from '../types/music';

/**
 * Database configuration for offline storage.
 */
const DB_NAME = 'vibeon_offline';
const DB_VERSION = 1;
const STORE_NAME = 'songs';

/**
 * Interface representing a song stored in IndexedDB.
 */
export interface OfflineSong extends Song {
    audioBlob: Blob;
    imageBlob: Blob;
    downloadedAt: number;
    size: number;
}

/**
 * Initializes the IndexedDB database.
 * @returns {Promise<IDBDatabase>} A promise that resolves to the database instance.
 */
export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Saves a song and its media blobs to offline storage.
 * @param {Song} song - The song metadata.
 * @param {Blob} audioBlob - The audio file blob.
 * @param {Blob} imageBlob - The cover art image blob.
 * @returns {Promise<void>}
 */
export const saveSongOffline = async (song: Song, audioBlob: Blob, imageBlob: Blob): Promise<void> => {
    const db = await initDB();
    const offlineSong: OfflineSong = {
        ...song,
        audioBlob,
        imageBlob,
        downloadedAt: Date.now(),
        size: audioBlob.size + imageBlob.size,
    };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(offlineSong);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

/**
 * Retrieves all songs from offline storage.
 * @returns {Promise<OfflineSong[]>}
 */
export const getOfflineSongs = async (): Promise<OfflineSong[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Retrieves a specific song from offline storage by ID.
 * @param {string} id - The unique identifier of the song.
 * @returns {Promise<OfflineSong | undefined>}
 */
export const getOfflineSong = async (id: string): Promise<OfflineSong | undefined> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Deletes a song from offline storage.
 * @param {string} id - The ID of the song to delete.
 * @returns {Promise<void>}
 */
export const deleteOfflineSong = async (id: string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

/**
 * Clears all songs from offline storage.
 * @returns {Promise<void>}
 */
export const deleteAllDownloads = async (): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

/**
 * Calculates storage statistics for downloaded content.
 * @returns {Promise<{ count: number; totalSize: number }>}
 */
export const getDownloadStorageInfo = async (): Promise<{ count: number; totalSize: number }> => {
    const songs = await getOfflineSongs();
    const totalSize = songs.reduce((acc, song) => acc + (song.size || 0), 0);
    return {
        count: songs.length,
        totalSize,
    };
};
