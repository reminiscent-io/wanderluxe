import { Trip } from '@/types/trip';

const DB_NAME = 'wanderluxe-offline';
const STORE_NAME = 'trips';
const VERSION = 1;

let db: IDBDatabase | null = null;

const initDB = async (): Promise<IDBDatabase> => {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'trip_id' });
      }
    };
  });
};

export const offlineCacheService = {
  async cacheTrip(trip: Trip): Promise<void> {
    try {
      const database = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(trip);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.warn('Failed to cache trip:', error);
      // Silently fail - offline caching is optional
    }
  },

  async getCachedTrip(tripId: string): Promise<Trip | null> {
    try {
      const database = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(tripId);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
      });
    } catch (error) {
      console.warn('Failed to retrieve cached trip:', error);
      return null;
    }
  },

  async deleteCachedTrip(tripId: string): Promise<void> {
    try {
      const database = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(tripId);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.warn('Failed to delete cached trip:', error);
    }
  },

  async getAllCachedTrips(): Promise<Trip[]> {
    try {
      const database = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
      });
    } catch (error) {
      console.warn('Failed to retrieve all cached trips:', error);
      return [];
    }
  },

  async clearAllCache(): Promise<void> {
    try {
      const database = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }
};
