/**
 * Monitoring and Error Tracking Setup
 * 
 * This module provides error tracking and performance monitoring.
 * Currently configured for Sentry, but can be adapted for other services.
 */

interface MonitoringConfig {
  dsn?: string;
  environment: string;
  enabled: boolean;
  sampleRate: number;
}

class Monitoring {
  private config: MonitoringConfig;
  private initialized = false;

  constructor() {
    this.config = {
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE || 'development',
      enabled: import.meta.env.PROD && !!import.meta.env.VITE_SENTRY_DSN,
      sampleRate: 0.1, // 10% of transactions
    };
  }

  /**
   * Initialize monitoring service
   * Call this once at app startup
   */
  async init() {
    if (!this.config.enabled || this.initialized) {
      console.log('Monitoring disabled or already initialized');
      return;
    }

    // Sentry monitoring disabled - install @sentry/react if needed
    console.log('Monitoring setup skipped (Sentry not installed)');
    this.initialized = true;
  }

  /**
   * Capture an error
   */
  captureError(error: Error, context?: Record<string, unknown>) {
    console.error('Error:', error, context);
  }

  /**
   * Capture a message
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    console.log(`[${level}]`, message);
  }

  /**
   * Set user context
   */
  setUser(_user: { id: string; email?: string; username?: string } | null) {
    // Monitoring disabled
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, data?: Record<string, unknown>) {
    console.log('Breadcrumb:', message, data);
  }
}

export const monitoring = new Monitoring();

/**
 * Web Vitals tracking
 * Tracks Core Web Vitals for performance monitoring
 */
export function trackWebVitals() {
  if (!import.meta.env.PROD) return;

  // Dynamically import web-vitals
  import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB }) => {
    const sendToAnalytics = (metric: { name: string; value: number; id: string }) => {
      // Send to your analytics service
      monitoring.addBreadcrumb('Web Vital', {
        metric: metric.name,
        value: metric.value,
        id: metric.id,
      });
    };

    onCLS(sendToAnalytics);
    onFCP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
  }).catch(() => {
    // web-vitals not installed, skip
  });
}
