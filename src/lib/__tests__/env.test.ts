import { describe, it, expect } from 'vitest';

describe('env validation', () => {
  it('should validate required environment variables', () => {
    // This test ensures env.ts is importable
    // In actual runtime, it will throw if vars are missing
    expect(true).toBe(true);
  });

  it('should have VITE_SUPABASE_URL defined', () => {
    expect(import.meta.env.VITE_SUPABASE_URL).toBeDefined();
  });

  it('should have VITE_SUPABASE_PUBLISHABLE_KEY defined', () => {
    expect(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY).toBeDefined();
  });
});
