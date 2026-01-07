
/**
 * Performance Monitoring Utilities
 * 
 * Provides utilities for measuring and tracking application performance.
 * Includes Web Vitals tracking, custom performance marks, and bundle analysis helpers.
 */

import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';

/**
 * Performance metric data structure
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

/**
 * Send performance metrics to analytics service
 * In production, this would send to your analytics platform (e.g., Google Analytics, Mixpanel)
 */
function sendToAnalytics(metric: Metric) {
  // Only log in development
  if (import.meta.env.DEV) {
    console.log(`[Performance] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
    });
  }

  // In production, send to analytics service
  if (import.meta.env.PROD) {
    // Example: Send to Google Analytics
    // gtag('event', metric.name, {
    //   value: Math.round(metric.value),
    //   metric_rating: metric.rating,
    //   metric_delta: metric.delta,
    // });
  }
}

/**
 * Initialize Web Vitals tracking
 * Call this once in your app's entry point
 * 
 * Note: FID has been replaced with INP (Interaction to Next Paint) in web-vitals v3+
 */
export function initWebVitals() {
  onCLS(sendToAnalytics);
  onINP(sendToAnalytics); // Replaces FID in web-vitals v3+
  onFCP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}

/**
 * Measure the performance of a synchronous function
 * 
 * @param metricName - Name of the metric to track
 * @param fn - Function to measure
 * @returns Result of the function
 * 
 * @example
 * ```typescript
 * const result = measurePerformance('calculateDashboard', () => {
 *   return calculateComplexMetrics(data);
 * });
 * ```
 */
export function measurePerformance<T>(metricName: string, fn: () => T): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  const duration = end - start;

  if (import.meta.env.DEV) {
    console.log(`[Performance] ${metricName}: ${duration.toFixed(2)}ms`);
  }

  // Track slow operations
  if (duration > 100) {
    console.warn(`[Performance Warning] ${metricName} took ${duration.toFixed(2)}ms`);
  }

  return result;
}

/**
 * Measure the performance of an async function
 * 
 * @param metricName - Name of the metric to track
 * @param fn - Async function to measure
 * @returns Promise with the result of the function
 * 
 * @example
 * ```typescript
 * const data = await measurePerformanceAsync('fetchBoardPapers', async () => {
 *   return await supabase.from('board_papers').select('*');
 * });
 * ```
 */
export async function measurePerformanceAsync<T>(
  metricName: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const duration = end - start;

  if (import.meta.env.DEV) {
    console.log(`[Performance] ${metricName}: ${duration.toFixed(2)}ms`);
  }

  // Track slow operations
  if (duration > 500) {
    console.warn(`[Performance Warning] ${metricName} took ${duration.toFixed(2)}ms`);
  }

  return result;
}

/**
 * Create a performance mark for custom measurements
 * 
 * @param markName - Name of the performance mark
 * 
 * @example
 * ```typescript
 * markPerformance('dashboard-render-start');
 * // ... render logic
 * markPerformance('dashboard-render-end');
 * measureBetweenMarks('dashboard-render', 'dashboard-render-start', 'dashboard-render-end');
 * ```
 */
export function markPerformance(markName: string) {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(markName);
  }
}

/**
 * Measure the time between two performance marks
 * 
 * @param measureName - Name of the measurement
 * @param startMark - Name of the start mark
 * @param endMark - Name of the end mark
 * @returns Duration in milliseconds
 */
export function measureBetweenMarks(
  measureName: string,
  startMark: string,
  endMark: string
): number | null {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      performance.measure(measureName, startMark, endMark);
      const measure = performance.getEntriesByName(measureName)[0];
      
      if (import.meta.env.DEV) {
        console.log(`[Performance] ${measureName}: ${measure.duration.toFixed(2)}ms`);
      }
      
      return measure.duration;
    } catch (error) {
      console.error(`Failed to measure performance between ${startMark} and ${endMark}:`, error);
      return null;
    }
  }
  return null;
}

/**
 * Get current memory usage (if available)
 * Only works in browsers that support performance.memory
 */
export function getMemoryUsage(): {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
} | null {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    };
  }
  return null;
}

/**
 * Log memory usage in a readable format
 */
export function logMemoryUsage() {
  const memory = getMemoryUsage();
  if (memory) {
    const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
    const totalMB = (memory.totalJSHeapSize / 1024 / 1024).toFixed(2);
    const limitMB = (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2);
    
    console.log(`[Memory] Used: ${usedMB}MB / Total: ${totalMB}MB / Limit: ${limitMB}MB`);
  }
}
