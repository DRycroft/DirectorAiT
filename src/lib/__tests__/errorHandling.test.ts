import { describe, it, expect } from 'vitest';
import { getUserFriendlyError } from '../errorHandling';

describe('errorHandling', () => {
  describe('getUserFriendlyError', () => {
    it('should return generic message for unknown errors', () => {
      const result = getUserFriendlyError(null);
      expect(result).toBe('An unexpected error occurred. Please try again.');
    });

    it('should handle JWT errors', () => {
      const error = { message: 'JWT expired' };
      const result = getUserFriendlyError(error);
      expect(result).toBe('Your session has expired. Please sign in again.');
    });

    it('should handle RLS policy violations', () => {
      const error = { code: 'PGRST301' };
      const result = getUserFriendlyError(error);
      expect(result).toBe("You don't have permission to perform this action.");
    });

    it('should handle duplicate key violations', () => {
      const error = { code: '23505' };
      const result = getUserFriendlyError(error);
      expect(result).toBe('This record already exists. Please use different information.');
    });

    it('should handle foreign key violations', () => {
      const error = { code: '23503' };
      const result = getUserFriendlyError(error);
      expect(result).toBe('This operation cannot be completed due to related data.');
    });

    it('should handle network errors', () => {
      const error = { message: 'Network fetch failed' };
      const result = getUserFriendlyError(error);
      expect(result).toBe('Network error. Please check your connection and try again.');
    });
  });
});
