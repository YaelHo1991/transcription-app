/**
 * IndexedDB cache for waveform data
 * Stores processed waveform data to avoid reprocessing the same files
 */

import { WaveformData } from '../types';

interface CachedWaveform {
  url: string;
  fileSize: number;
  data: WaveformData;
  timestamp: number;
  version: string;
}

const DB_NAME = 'WaveformCache';
const DB_VERSION = 1;
const STORE_NAME = 'waveforms';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const CACHE_VERSION = '1.0.0'; // Bump this to invalidate all caches

export class WaveformCache {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the IndexedDB database
   */
  private async initDB(): Promise<void> {
    if (this.db) return;
    
    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    // Check if IndexedDB is available (browser environment only)
    if (typeof window === 'undefined' || !window.indexedDB) {
      throw new Error('IndexedDB not supported in this environment');
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('WaveformCache: IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('fileSize', 'fileSize', { unique: false });
          console.log('WaveformCache: Object store created');
        }
      };
    });

    await this.initPromise;
  }

  /**
   * Generate a cache key from URL and file size
   */
  private getCacheKey(url: string, fileSize?: number): string {
    // For blob URLs, include size in the key since the same blob URL 
    // might be reused for different files
    if (url.startsWith('blob:') && fileSize) {
      return `${url}_${fileSize}`;
    }
    return url;
  }

  /**
   * Get cached waveform data
   */
  async get(url: string, fileSize?: number): Promise<WaveformData | null> {
    try {
      await this.initDB();
      if (!this.db) return null;

      const key = this.getCacheKey(url, fileSize);
      
      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
          const cached = request.result as CachedWaveform | undefined;
          
          if (!cached) {
            console.log('WaveformCache: No cached data found for', key);
            resolve(null);
            return;
          }

          // Check if cache is expired
          const age = Date.now() - cached.timestamp;
          if (age > CACHE_DURATION) {
            console.log('WaveformCache: Cached data expired for', key);
            // Delete expired cache
            this.delete(url, fileSize);
            resolve(null);
            return;
          }

          // Check version compatibility
          if (cached.version !== CACHE_VERSION) {
            console.log('WaveformCache: Version mismatch, invalidating cache for', key);
            this.delete(url, fileSize);
            resolve(null);
            return;
          }

          console.log(`WaveformCache: Found cached data for ${key} (age: ${Math.round(age / 1000 / 60)} minutes)`);
          resolve(cached.data);
        };

        request.onerror = () => {
          console.error('WaveformCache: Failed to get cached data:', request.error);
          resolve(null);
        };
      });
    } catch (error) {
      console.error('WaveformCache: Error getting cached data:', error);
      return null;
    }
  }

  /**
   * Store waveform data in cache
   */
  async set(url: string, data: WaveformData, fileSize?: number): Promise<boolean> {
    try {
      await this.initDB();
      if (!this.db) return false;

      const key = this.getCacheKey(url, fileSize);
      
      const cached: CachedWaveform = {
        url: key,
        fileSize: fileSize || 0,
        data,
        timestamp: Date.now(),
        version: CACHE_VERSION
      };

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(cached);

        request.onsuccess = () => {
          console.log('WaveformCache: Data cached successfully for', key);
          resolve(true);
        };

        request.onerror = () => {
          console.error('WaveformCache: Failed to cache data:', request.error);
          resolve(false);
        };
      });
    } catch (error) {
      console.error('WaveformCache: Error caching data:', error);
      return false;
    }
  }

  /**
   * Delete cached waveform data
   */
  async delete(url: string, fileSize?: number): Promise<boolean> {
    try {
      await this.initDB();
      if (!this.db) return false;

      const key = this.getCacheKey(url, fileSize);

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key);

        request.onsuccess = () => {
          console.log('WaveformCache: Cached data deleted for', key);
          resolve(true);
        };

        request.onerror = () => {
          console.error('WaveformCache: Failed to delete cached data:', request.error);
          resolve(false);
        };
      });
    } catch (error) {
      console.error('WaveformCache: Error deleting cached data:', error);
      return false;
    }
  }

  /**
   * Clear all cached waveform data
   */
  async clear(): Promise<boolean> {
    try {
      await this.initDB();
      if (!this.db) return false;

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          console.log('WaveformCache: All cached data cleared');
          resolve(true);
        };

        request.onerror = () => {
          console.error('WaveformCache: Failed to clear cached data:', request.error);
          resolve(false);
        };
      });
    } catch (error) {
      console.error('WaveformCache: Error clearing cached data:', error);
      return false;
    }
  }

  /**
   * Clean up expired cache entries
   */
  async cleanup(): Promise<number> {
    try {
      await this.initDB();
      if (!this.db) return 0;

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('timestamp');
        
        const maxAge = Date.now() - CACHE_DURATION;
        const range = IDBKeyRange.upperBound(maxAge);
        const request = index.openCursor(range);
        
        let deletedCount = 0;

        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            store.delete(cursor.primaryKey);
            deletedCount++;
            cursor.continue();
          } else {
            console.log(`WaveformCache: Cleaned up ${deletedCount} expired entries`);
            resolve(deletedCount);
          }
        };

        request.onerror = () => {
          console.error('WaveformCache: Failed to cleanup:', request.error);
          resolve(0);
        };
      });
    } catch (error) {
      console.error('WaveformCache: Error during cleanup:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ count: number; totalSize: number; oldestEntry: number }> {
    try {
      await this.initDB();
      if (!this.db) return { count: 0, totalSize: 0, oldestEntry: 0 };

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const countRequest = store.count();
        
        let stats = { count: 0, totalSize: 0, oldestEntry: Date.now() };

        countRequest.onsuccess = () => {
          stats.count = countRequest.result;
          
          const cursorRequest = store.openCursor();
          
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            if (cursor) {
              const cached = cursor.value as CachedWaveform;
              
              // Estimate size (rough calculation)
              if (cached.data && cached.data.peaks) {
                stats.totalSize += cached.data.peaks.length * 4; // 4 bytes per float
              }
              
              if (cached.timestamp < stats.oldestEntry) {
                stats.oldestEntry = cached.timestamp;
              }
              
              cursor.continue();
            } else {
              resolve(stats);
            }
          };

          cursorRequest.onerror = () => {
            console.error('WaveformCache: Failed to get stats:', cursorRequest.error);
            resolve(stats);
          };
        };

        countRequest.onerror = () => {
          console.error('WaveformCache: Failed to get count:', countRequest.error);
          resolve(stats);
        };
      });
    } catch (error) {
      console.error('WaveformCache: Error getting stats:', error);
      return { count: 0, totalSize: 0, oldestEntry: 0 };
    }
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
      console.log('WaveformCache: Database connection closed');
    }
  }
}

// Export singleton instance (client-side only)
let waveformCacheInstance: WaveformCache | null = null;

export const waveformCache = {
  async get(url: string, fileSize?: number): Promise<WaveformData | null> {
    if (typeof window === 'undefined') return null;
    if (!waveformCacheInstance) {
      waveformCacheInstance = new WaveformCache();
    }
    return waveformCacheInstance.get(url, fileSize);
  },

  async set(url: string, data: WaveformData, fileSize?: number): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!waveformCacheInstance) {
      waveformCacheInstance = new WaveformCache();
    }
    return waveformCacheInstance.set(url, data, fileSize);
  },

  async delete(url: string, fileSize?: number): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!waveformCacheInstance) {
      waveformCacheInstance = new WaveformCache();
    }
    return waveformCacheInstance.delete(url, fileSize);
  },

  async clear(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!waveformCacheInstance) {
      waveformCacheInstance = new WaveformCache();
    }
    return waveformCacheInstance.clear();
  },

  async cleanup(): Promise<number> {
    if (typeof window === 'undefined') return 0;
    if (!waveformCacheInstance) {
      waveformCacheInstance = new WaveformCache();
    }
    return waveformCacheInstance.cleanup();
  },

  async getStats(): Promise<{ count: number; totalSize: number; oldestEntry: number }> {
    if (typeof window === 'undefined') return { count: 0, totalSize: 0, oldestEntry: 0 };
    if (!waveformCacheInstance) {
      waveformCacheInstance = new WaveformCache();
    }
    return waveformCacheInstance.getStats();
  },

  close(): void {
    if (waveformCacheInstance) {
      waveformCacheInstance.close();
      waveformCacheInstance = null;
    }
  }
};