
/**
 * Mobile Utilities Tests
 */

import { describe, it, expect, vi } from 'vitest';
import {
  isMobileDevice,
  getViewportDimensions,
  isPortrait,
  isLandscape,
  hapticFeedback,
} from '../mobile';

describe('Mobile Utilities', () => {
  describe('isMobileDevice', () => {
    it('should detect mobile user agent', () => {
      // Mock mobile user agent
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true,
      });
      
      expect(isMobileDevice()).toBe(true);
    });

    it('should detect desktop user agent', () => {
      // Mock desktop user agent
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        configurable: true,
      });
      
      expect(isMobileDevice()).toBe(false);
    });
  });

  describe('getViewportDimensions', () => {
    it('should return viewport dimensions', () => {
      const dimensions = getViewportDimensions();
      
      expect(dimensions).toHaveProperty('width');
      expect(dimensions).toHaveProperty('height');
      expect(typeof dimensions.width).toBe('number');
      expect(typeof dimensions.height).toBe('number');
    });
  });

  describe('isPortrait', () => {
    it('should detect portrait orientation', () => {
      // Mock portrait viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, configurable: true });
      
      expect(isPortrait()).toBe(true);
      expect(isLandscape()).toBe(false);
    });

    it('should detect landscape orientation', () => {
      // Mock landscape viewport
      Object.defineProperty(window, 'innerWidth', { value: 667, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 375, configurable: true });
      
      expect(isPortrait()).toBe(false);
      expect(isLandscape()).toBe(true);
    });
  });

  describe('hapticFeedback', () => {
    it('should call vibrate API if available', () => {
      const vibrateMock = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: vibrateMock,
        configurable: true,
      });
      
      hapticFeedback(10);
      expect(vibrateMock).toHaveBeenCalledWith(10);
    });

    it('should handle missing vibrate API gracefully', () => {
      const originalVibrate = navigator.vibrate;
      // @ts-expect-error - Testing missing vibrate API
      delete navigator.vibrate;
      
      expect(() => hapticFeedback(10)).not.toThrow();
      
      // Restore
      if (originalVibrate) {
        Object.defineProperty(navigator, 'vibrate', {
          value: originalVibrate,
          configurable: true,
        });
      }
    });
  });
});
