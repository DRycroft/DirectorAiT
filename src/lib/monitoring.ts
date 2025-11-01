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
      return;
    }

    try {
      // Dynamically import Sentry only in production
      const Sentry = await import('@sentry/react');

      Sentry.init({
        dsn: this.config.dsn,
        environment: this.config.environment,
        tracesSampleRate: this.config.sampleRate,
        
        // Filter out sensitive data
        beforeSend(event) {
          // Remove cookies and headers
          if (event.request) {
            delete event.request.cookies;
            delete event.request.headers;
          }
          
          // Remove sensitive query params
          if (event.request?.url) {
            const url = new URL(event.request.url);
            url.searchParams.delete('token');
            url.searchParams.delete('key');
            url.searchParams.delete('password');
            event.request.url = url.toString();
          }
          
          return event;
        },

        // Ignore certain errors
        ignoreErrors: [
          // Browser extensions
          'top.GLOBALS',
          'chrome-extension://',
          'moz-extension://',
          // Network errors that are expected
          'NetworkError',
          'Failed to fetch',
          // User cancelled actions
          'AbortError',
        ],
      });

      this.initialized = true;
      console.log('Monitoring initialized');
    } catch (error) {
      console.error('Failed to initialize monitoring:', error);
    }
  }

  /**
   * Capture an error
   */
  captureError(error: Error, context?: Record<string, unknown>) {
    if (!this.config.enabled) {
      console.error('Error:', error, context);
      return;
    }

    import('@sentry/react').then((Sentry) => {
      if (context) {
        Sentry.setContext('additional', context);
      }
      Sentry.captureException(error);
    });
  }

  /**
   * Capture a message
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    if (!this.config.enabled) {
      console.log(`[${level}]`, message);
      return;
    }

    import('@sentry/react').then((Sentry) => {
      Sentry.captureMessage(message, level);
    });
  }

  /**
   * Set user context
   */
  setUser(user: { id: string; email?: string; username?: string } | null) {
    if (!this.config.enabled) return;

    import('@sentry/react').then((Sentry) => {
      Sentry.setUser(user);
    });
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, data?: Record<string, unknown>) {
    if (!this.config.enabled) return;

    import('@sentry/react').then((Sentry) => {
      Sentry.addBreadcrumb({
        message,
        data,
        timestamp: Date.now() / 1000,
      });
    });
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
  import('web-vitals').then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
    const sendToAnalytics = (metric: { name: string; value: number; id: string }) => {
      // Send to your analytics service
      monitoring.addBreadcrumb('Web Vital', {
        metric: metric.name,
        value: metric.value,
        id: metric.id,
      });
    };

    onCLS(sendToAnalytics);
    onFID(sendToAnalytics);
    onFCP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
  }).catch(() => {
    // web-vitals not installed, skip
  });
}
