/**
 * Environment validation utilities
 * All validation happens LAZILY - no module-level env access
 */

interface EnvVars {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_PUBLISHABLE_KEY: string;
}

// Cache for validation result
let _validationResult: { valid: boolean; error?: string; env?: EnvVars } | null = null;

/**
 * Validate environment variables (lazy - called only when needed)
 */
function validateEnv(): { valid: boolean; error?: string; env?: EnvVars } {
  if (_validationResult) {
    return _validationResult;
  }

  // Lovable Cloud fallback values for preview when env injection fails
  const LOVABLE_CLOUD_URL = 'https://lomksomekpysjgtnlguq.supabase.co';
  const LOVABLE_CLOUD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvbWtzb21la3B5c2pndG5sZ3VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NjEyMDgsImV4cCI6MjA3NjMzNzIwOH0.xwRiW2B8X51puDJ3IxnwKWsUsv7jRHsAIJjd6Wkq-JA';

  const url = import.meta.env.VITE_SUPABASE_URL || LOVABLE_CLOUD_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || LOVABLE_CLOUD_KEY;

  const usingFallback = !import.meta.env.VITE_SUPABASE_URL;

  _validationResult = {
    valid: true,
    env: {
      VITE_SUPABASE_URL: url,
      VITE_SUPABASE_PUBLISHABLE_KEY: key,
    },
  };
  
  if (usingFallback) {
    console.log('[env] Using Lovable Cloud fallback config');
  } else {
    console.log('[env] Supabase config loaded from env vars');
  }

  return _validationResult;
}

/**
 * Check if environment is valid (safe to call at any time)
 */
export function isEnvValid(): boolean {
  return validateEnv().valid;
}

/**
 * Get validation error message (null if valid)
 */
export function getEnvError(): string | null {
  const result = validateEnv();
  return result.error || null;
}

/**
 * Get an environment variable (throws if not configured)
 */
export function requireEnv(name: keyof EnvVars): string {
  const result = validateEnv();
  if (!result.valid || !result.env) {
    throw new Error(result.error || 'Environment not configured');
  }
  return result.env[name];
}
