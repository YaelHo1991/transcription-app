/**
 * Safe storage utility that handles localStorage/sessionStorage with fallback
 */

interface StorageAPI {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

class SafeStorage implements StorageAPI {
  private storage: Storage | null = null;
  private memoryStorage: Map<string, string> = new Map();

  constructor(type: 'local' | 'session' = 'local') {
    if (typeof window !== 'undefined') {
      try {
        const testKey = '__storage_test__';
        const storage = type === 'local' ? window.localStorage : window.sessionStorage;
        
        // Test if storage is available and working
        storage.setItem(testKey, 'test');
        storage.removeItem(testKey);
        
        this.storage = storage;
        console.log(`✅ Using ${type}Storage`);
      } catch (error) {
        console.warn(`⚠️ ${type}Storage not available, using memory fallback:`, error);
        this.storage = null;
      }
    }
  }

  getItem(key: string): string | null {
    try {
      if (this.storage) {
        return this.storage.getItem(key);
      }
      return this.memoryStorage.get(key) || null;
    } catch (error) {
      console.error('Error getting item from storage:', error);
      return this.memoryStorage.get(key) || null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      if (this.storage) {
        this.storage.setItem(key, value);
      } else {
        this.memoryStorage.set(key, value);
      }
    } catch (error) {
      console.error('Error setting item in storage:', error);
      // Fallback to memory storage
      this.memoryStorage.set(key, value);
    }
  }

  removeItem(key: string): void {
    try {
      if (this.storage) {
        this.storage.removeItem(key);
      }
      this.memoryStorage.delete(key);
    } catch (error) {
      console.error('Error removing item from storage:', error);
      this.memoryStorage.delete(key);
    }
  }

  clear(): void {
    try {
      if (this.storage) {
        this.storage.clear();
      }
      this.memoryStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      this.memoryStorage.clear();
    }
  }

  // Helper method to get all keys
  getAllKeys(): string[] {
    if (this.storage) {
      const keys: string[] = [];
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key) keys.push(key);
      }
      return keys;
    }
    return Array.from(this.memoryStorage.keys());
  }
}

// Create singleton instances
export const safeLocalStorage = new SafeStorage('local');
export const safeSessionStorage = new SafeStorage('session');

// Helper functions for JSON storage
export function getJsonItem<T>(key: string, defaultValue: T): T {
  try {
    const item = safeLocalStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error parsing JSON for key ${key}:`, error);
    return defaultValue;
  }
}

export function setJsonItem<T>(key: string, value: T): void {
  try {
    safeLocalStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error storing JSON for key ${key}:`, error);
  }
}

// Session storage JSON helpers
export function getSessionJsonItem<T>(key: string, defaultValue: T): T {
  try {
    const item = safeSessionStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error parsing session JSON for key ${key}:`, error);
    return defaultValue;
  }
}

export function setSessionJsonItem<T>(key: string, value: T): void {
  try {
    safeSessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error storing session JSON for key ${key}:`, error);
  }
}