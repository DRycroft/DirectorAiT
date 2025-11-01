
/**
 * Caching Utilities
 * 
 * Provides utilities for caching data in localStorage, sessionStorage, and memory.
 * Includes TTL (time-to-live) support and automatic cache invalidation.
 */

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

/**
 * Cache storage types
 */
export type CacheStorage = 'localStorage' | 'sessionStorage' | 'memory';

/**
 * In-memory cache for runtime data
 */
const memoryCache = new Map<string, CacheEntry<any>>();

/**
 * Get the appropriate storage based on type
 */
function getStorage(storageType: CacheStorage): Storage | Map<string, CacheEntry<any>> {
  switch (storageType) {
    case 'localStorage':
      return localStorage;
    case 'sessionStorage':
      return sessionStorage;
    case 'memory':
      return memoryCache;
    default:
      return memoryCache;
  }
}

/**
 * Set a value in cache with TTL
 * 
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttl - Time to live in milliseconds (default: 5 minutes)
 * @param storageType - Type of storage to use
 * 
 * @example
 * ```typescript
 * // Cache for 5 minutes
 * setCache('user-preferences', preferences, 5 * 60 * 1000);
 * 
 * // Cache in session storage
 * setCache('temp-data', data, 60 * 1000, 'sessionStorage');
 * ```
 */
export function setCache<T>(
  key: string,
  value: T,
  ttl: number = 5 * 60 * 1000,
  storageType: CacheStorage = 'memory'
): void {
  const entry: CacheEntry<T> = {
    data: value,
    timestamp: Date.now(),
    ttl,
  };

  try {
    const storage = getStorage(storageType);
    
    if (storage instanceof Map) {
      storage.set(key, entry);
    } else {
      storage.setItem(key, JSON.stringify(entry));
    }
  } catch (error) {
    console.error(`Failed to set cache for key "${key}":`, error);
  }
}

/**
 * Get a value from cache
 * Returns null if cache is expired or doesn't exist
 * 
 * @param key - Cache key
 * @param storageType - Type of storage to use
 * @returns Cached value or null
 * 
 * @example
 * ```typescript
 * const preferences = getCache<UserPreferences>('user-preferences');
 * if (preferences) {
 *   // Use cached preferences
 * } else {
 *   // Fetch fresh data
 * }
 * ```
 */
export function getCache<T>(
  key: string,
  storageType: CacheStorage = 'memory'
): T | null {
  try {
    const storage = getStorage(storageType);
    let entry: CacheEntry<T> | null = null;

    if (storage instanceof Map) {
      entry = storage.get(key) || null;
    } else {
      const item = storage.getItem(key);
      if (item) {
        entry = JSON.parse(item);
      }
    }

    if (!entry) {
      return null;
    }

    // Check if cache is expired
    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > entry.ttl) {
      // Cache expired, remove it
      removeCache(key, storageType);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error(`Failed to get cache for key "${key}":`, error);
    return null;
  }
}

/**
 * Remove a value from cache
 * 
 * @param key - Cache key
 * @param storageType - Type of storage to use
 */
export function removeCache(key: string, storageType: CacheStorage = 'memory'): void {
  try {
    const storage = getStorage(storageType);
    
    if (storage instanceof Map) {
      storage.delete(key);
    } else {
      storage.removeItem(key);
    }
  } catch (error) {
    console.error(`Failed to remove cache for key "${key}":`, error);
  }
}

/**
 * Clear all cache entries
 * 
 * @param storageType - Type of storage to clear
 */
export function clearCache(storageType: CacheStorage = 'memory'): void {
  try {
    const storage = getStorage(storageType);
    
    if (storage instanceof Map) {
      storage.clear();
    } else {
      storage.clear();
    }
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

/**
 * Clear expired cache entries
 * Useful for periodic cleanup
 * 
 * @param storageType - Type of storage to clean
 */
export function clearExpiredCache(storageType: CacheStorage = 'memory'): void {
  try {
    const storage = getStorage(storageType);
    const now = Date.now();

    if (storage instanceof Map) {
      for (const [key, entry] of storage.entries()) {
        const age = now - entry.timestamp;
        if (age > entry.ttl) {
          storage.delete(key);
        }
      }
    } else {
      // For localStorage/sessionStorage, iterate through all keys
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) keys.push(key);
      }

      keys.forEach(key => {
        try {
          const item = storage.getItem(key);
          if (item) {
            const entry: CacheEntry<any> = JSON.parse(item);
            const age = now - entry.timestamp;
            if (age > entry.ttl) {
              storage.removeItem(key);
            }
          }
        } catch {
          // Invalid cache entry, remove it
          storage.removeItem(key);
        }
      });
    }
  } catch (error) {
    console.error('Failed to clear expired cache:', error);
  }
}

/**
 * Get or set cache with a factory function
 * If cache exists and is valid, return it. Otherwise, call factory function and cache the result.
 * 
 * @param key - Cache key
 * @param factory - Function to generate the value if cache miss
 * @param ttl - Time to live in milliseconds
 * @param storageType - Type of storage to use
 * @returns Cached or freshly generated value
 * 
 * @example
 * ```typescript
 * const data = await getCacheOrSet(
 *   'board-papers',
 *   async () => {
 *     const { data } = await supabase.from('board_papers').select('*');
 *     return data;
 *   },
 *   5 * 60 * 1000 // 5 minutes
 * );
 * ```
 */
export async function getCacheOrSet<T>(
  key: string,
  factory: () => Promise<T> | T,
  ttl: number = 5 * 60 * 1000,
  storageType: CacheStorage = 'memory'
): Promise<T> {
  // Try to get from cache
  const cached = getCache<T>(key, storageType);
  if (cached !== null) {
    return cached;
  }

  // Cache miss, generate new value
  const value = await factory();
  setCache(key, value, ttl, storageType);
  return value;
}

/**
 * Initialize cache cleanup interval
 * Clears expired cache entries every interval
 * 
 * @param intervalMs - Cleanup interval in milliseconds (default: 5 minutes)
 */
export function initCacheCleanup(intervalMs: number = 5 * 60 * 1000): () => void {
  const interval = setInterval(() => {
    clearExpiredCache('memory');
    clearExpiredCache('localStorage');
    clearExpiredCache('sessionStorage');
  }, intervalMs);

  // Return cleanup function
  return () => clearInterval(interval);
}
