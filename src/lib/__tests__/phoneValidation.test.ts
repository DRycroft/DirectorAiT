import { describe, it, expect } from 'vitest';
import { validatePhoneNumber, COUNTRY_CODES } from '../phoneValidation';

describe('phoneValidation', () => {
  describe('validatePhoneNumber', () => {
    it('should validate NZ phone numbers', () => {
      const result = validatePhoneNumber('212345678', '+64');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('+64212345678');
      expect(result.message).toBe('');
    });

    it('should reject invalid NZ phone numbers', () => {
      const result = validatePhoneNumber('12345', '+64');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid');
    });

    it('should validate US phone numbers', () => {
      const result = validatePhoneNumber('2025551234', '+1');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('+12025551234');
    });

    it('should validate UK phone numbers', () => {
      const result = validatePhoneNumber('2012345678', '+44');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('+442012345678');
    });

    it('should validate Australian phone numbers', () => {
      const result = validatePhoneNumber('212345678', '+61');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('+61212345678');
    });

    it('should handle empty phone numbers', () => {
      const result = validatePhoneNumber('', '+64');
      expect(result.valid).toBe(true);
      expect(result.message).toBe('');
    });

    it('should handle phone numbers with spaces', () => {
      const result = validatePhoneNumber('21 234 5678', '+64');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('+64212345678');
    });

    it('should handle phone numbers with dashes', () => {
      const result = validatePhoneNumber('21-234-5678', '+64');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('+64212345678');
    });

    it('should handle phone numbers with parentheses', () => {
      const result = validatePhoneNumber('(21) 234 5678', '+64');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('+64212345678');
    });

    it('should reject invalid country code', () => {
      const result = validatePhoneNumber('212345678', '+999');
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Invalid country code');
    });

    it('should validate all supported country codes exist', () => {
      expect(COUNTRY_CODES.length).toBe(16);
      
      const countryCodes = COUNTRY_CODES.map(c => c.code);
      expect(countryCodes).toContain('+1');   // US/CA
      expect(countryCodes).toContain('+44');  // UK
      expect(countryCodes).toContain('+61');  // AU
      expect(countryCodes).toContain('+64');  // NZ
      expect(countryCodes).toContain('+33');  // FR
      expect(countryCodes).toContain('+49');  // DE
      expect(countryCodes).toContain('+81');  // JP
      expect(countryCodes).toContain('+86');  // CN
      expect(countryCodes).toContain('+91');  // IN
    });
  });
});
