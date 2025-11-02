
/**
 * Cache Utilities Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setCache,
  getCache,
  removeCache,
  clearCache,
  getCacheOrSet,
  clearExpiredCache,
} from '../cache';

describe('Cache Utilities', () => {
  beforeEach(() => {
    // Clear all caches before each test
    clearCache('memory');
    clearCache('localStorage');
    clearCache('sessionStorage');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setCache and getCache', () => {
    it('should store and retrieve data from memory cache', () => {
      const testData = { name: 'Test', value: 42 };
      setCache('test-key', testData, 60000, 'memory');

      const retrieved = getCache('test-key', 'memory');
      expect(retrieved).toEqual(testData);
    });

    it('should store and retrieve data from localStorage', () => {
      const testData = { name: 'Test', value: 42 };
      setCache('test-key', testData, 60000, 'localStorage');

      const retrieved = getCache('test-key', 'localStorage');
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', () => {
      const retrieved = getCache('non-existent', 'memory');
      expect(retrieved).toBeNull();
    });

    it('should return null for expired cache', async () => {
      setCache('expired-key', 'test-data', 10, 'memory'); // 10ms TTL

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 20));

      const retrieved = getCache('expired-key', 'memory');
      expect(retrieved).toBeNull();
    });
  });

  describe('removeCache', () => {
    it('should remove data from cache', () => {
      setCache('test-key', 'test-data', 60000, 'memory');
      expect(getCache('test-key', 'memory')).toBe('test-data');

      removeCache('test-key', 'memory');
      expect(getCache('test-key', 'memory')).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should clear all data from cache', () => {
      setCache('key1', 'data1', 60000, 'memory');
      setCache('key2', 'data2', 60000, 'memory');

      clearCache('memory');

      expect(getCache('key1', 'memory')).toBeNull();
      expect(getCache('key2', 'memory')).toBeNull();
    });
  });

  describe('getCacheOrSet', () => {
    it('should return cached data if available', async () => {
      const factory = vi.fn(() => Promise.resolve('fresh-data'));
      
      setCache('test-key', 'cached-data', 60000, 'memory');

      const result = await getCacheOrSet('test-key', factory, 60000, 'memory');

      expect(result).toBe('cached-data');
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result on cache miss', async () => {
      const factory = vi.fn(() => Promise.resolve('fresh-data'));

      const result = await getCacheOrSet('new-key', factory, 60000, 'memory');

      expect(result).toBe('fresh-data');
      expect(factory).toHaveBeenCalledTimes(1);

      // Verify data was cached
      const cached = getCache('new-key', 'memory');
      expect(cached).toBe('fresh-data');
    });

    it('should work with synchronous factory functions', async () => {
      const factory = () => 'sync-data';

      const result = await getCacheOrSet('sync-key', factory, 60000, 'memory');

      expect(result).toBe('sync-data');
    });
  });

  describe('clearExpiredCache', () => {
    it('should remove only expired entries', async () => {
      setCache('fresh-key', 'fresh-data', 60000, 'memory');
      setCache('expired-key', 'expired-data', 10, 'memory');

      // Wait for one to expire
      await new Promise(resolve => setTimeout(resolve, 20));

      clearExpiredCache('memory');

      expect(getCache('fresh-key', 'memory')).toBe('fresh-data');
      expect(getCache('expired-key', 'memory')).toBeNull();
    });
  });
});
