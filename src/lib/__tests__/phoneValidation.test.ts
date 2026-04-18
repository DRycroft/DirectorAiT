import { describe, it, expect } from 'vitest';
import { validatePhoneNumber, phoneSchema } from '../phoneValidation';

describe('phoneValidation', () => {
  describe('validatePhoneNumber', () => {
    it('accepts a valid NZ E.164 mobile', () => {
      const result = validatePhoneNumber('+64211234567');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBe('+64211234567');
    });

    it('accepts a valid US E.164 number', () => {
      const result = validatePhoneNumber('+12025551234');
      expect(result.valid).toBe(true);
    });

    it('accepts a valid UK E.164 mobile', () => {
      const result = validatePhoneNumber('+447911123456');
      expect(result.valid).toBe(true);
    });

    it('treats empty string as valid (optional)', () => {
      const result = validatePhoneNumber('');
      expect(result.valid).toBe(true);
      expect(result.message).toBe('');
    });

    it('rejects numbers without + prefix', () => {
      const result = validatePhoneNumber('64211234567');
      expect(result.valid).toBe(false);
    });

    it('rejects clearly invalid numbers', () => {
      const result = validatePhoneNumber('+123');
      expect(result.valid).toBe(false);
    });
  });

  describe('phoneSchema', () => {
    it('accepts empty', () => {
      expect(phoneSchema.safeParse('').success).toBe(true);
    });
    it('accepts valid E.164', () => {
      expect(phoneSchema.safeParse('+64211234567').success).toBe(true);
    });
    it('rejects garbage', () => {
      expect(phoneSchema.safeParse('not a number').success).toBe(false);
    });
  });
});
