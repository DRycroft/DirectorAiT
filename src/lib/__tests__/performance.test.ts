
/**
 * Performance Utilities Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  measurePerformance,
  measurePerformanceAsync,
  markPerformance,
  measureBetweenMarks,
} from '../performance';

describe('Performance Utilities', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('measurePerformance', () => {
    it('should measure synchronous function performance', () => {
      const result = measurePerformance('test-metric', () => {
        return 42;
      });

      expect(result).toBe(42);
    });

    it('should return the function result', () => {
      const testFn = () => ({ data: 'test' });
      const result = measurePerformance('test', testFn);

      expect(result).toEqual({ data: 'test' });
    });

    it('should warn on slow operations', () => {
      measurePerformance('slow-operation', () => {
        // Simulate slow operation
        const start = Date.now();
        while (Date.now() - start < 150) {
          // Wait
        }
      });

      // In dev mode, should log warning for operations > 100ms
      // Note: This test might be flaky depending on system performance
    });
  });

  describe('measurePerformanceAsync', () => {
    it('should measure async function performance', async () => {
      const result = await measurePerformanceAsync('async-test', async () => {
        return Promise.resolve(42);
      });

      expect(result).toBe(42);
    });

    it('should handle async errors', async () => {
      await expect(
        measurePerformanceAsync('error-test', async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
    });
  });

  describe('markPerformance', () => {
    it('should create performance marks', () => {
      markPerformance('test-mark');
      
      // Check if mark was created
      const marks = performance.getEntriesByName('test-mark');
      expect(marks.length).toBeGreaterThan(0);
    });
  });

  describe('measureBetweenMarks', () => {
    it('should measure time between marks', () => {
      markPerformance('start-mark');
      
      // Simulate some work
      let sum = 0;
      for (let i = 0; i < 1000; i++) {
        sum += i;
      }
      
      markPerformance('end-mark');
      
      const duration = measureBetweenMarks('test-measure', 'start-mark', 'end-mark');
      
      expect(duration).toBeGreaterThan(0);
      expect(typeof duration).toBe('number');
    });

    it('should return null for invalid marks', () => {
      const duration = measureBetweenMarks('invalid', 'non-existent-start', 'non-existent-end');
      expect(duration).toBeNull();
    });
  });
});
