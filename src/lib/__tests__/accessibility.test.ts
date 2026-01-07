
/**
 * Accessibility Utilities Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateA11yId,
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  announceToScreenReader,
} from '../accessibility';

describe('Accessibility Utilities', () => {
  describe('generateA11yId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateA11yId();
      const id2 = generateA11yId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^a11y-\d+-\d+$/);
    });

    it('should use custom prefix', () => {
      const id = generateA11yId('custom');
      expect(id).toMatch(/^custom-\d+-\d+$/);
    });
  });

  describe('getContrastRatio', () => {
    it('should calculate contrast ratio for black and white', () => {
      const ratio = getContrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('should calculate contrast ratio for same colors', () => {
      const ratio = getContrastRatio('#000000', '#000000');
      expect(ratio).toBe(1);
    });

    it('should calculate contrast ratio for gray colors', () => {
      const ratio = getContrastRatio('#767676', '#FFFFFF');
      expect(ratio).toBeGreaterThan(4.5);
    });
  });

  describe('meetsWCAGAA', () => {
    it('should pass for sufficient contrast (normal text)', () => {
      expect(meetsWCAGAA(4.5)).toBe(true);
      expect(meetsWCAGAA(7)).toBe(true);
    });

    it('should fail for insufficient contrast (normal text)', () => {
      expect(meetsWCAGAA(4)).toBe(false);
      expect(meetsWCAGAA(3)).toBe(false);
    });

    it('should pass for sufficient contrast (large text)', () => {
      expect(meetsWCAGAA(3, true)).toBe(true);
      expect(meetsWCAGAA(4, true)).toBe(true);
    });

    it('should fail for insufficient contrast (large text)', () => {
      expect(meetsWCAGAA(2.5, true)).toBe(false);
    });
  });

  describe('meetsWCAGAAA', () => {
    it('should pass for sufficient contrast (normal text)', () => {
      expect(meetsWCAGAAA(7)).toBe(true);
      expect(meetsWCAGAAA(10)).toBe(true);
    });

    it('should fail for insufficient contrast (normal text)', () => {
      expect(meetsWCAGAAA(6)).toBe(false);
      expect(meetsWCAGAAA(4.5)).toBe(false);
    });

    it('should pass for sufficient contrast (large text)', () => {
      expect(meetsWCAGAAA(4.5, true)).toBe(true);
      expect(meetsWCAGAAA(7, true)).toBe(true);
    });

    it('should fail for insufficient contrast (large text)', () => {
      expect(meetsWCAGAAA(4, true)).toBe(false);
    });
  });

  describe('announceToScreenReader', () => {
    beforeEach(() => {
      // Clear any existing announcements
      document.body.innerHTML = '';
    });

    afterEach(() => {
      vi.clearAllTimers();
    });

    it('should create announcement element', () => {
      announceToScreenReader('Test message');
      
      const announcement = document.querySelector('[role="status"]');
      expect(announcement).toBeTruthy();
      expect(announcement?.textContent).toBe('Test message');
    });

    it('should set correct ARIA attributes', () => {
      announceToScreenReader('Test message', 'assertive');
      
      const announcement = document.querySelector('[role="status"]');
      expect(announcement?.getAttribute('aria-live')).toBe('assertive');
      expect(announcement?.getAttribute('aria-atomic')).toBe('true');
    });

    it('should use polite priority by default', () => {
      announceToScreenReader('Test message');
      
      const announcement = document.querySelector('[role="status"]');
      expect(announcement?.getAttribute('aria-live')).toBe('polite');
    });
  });
});
