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

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const missing: string[] = [];
  if (!url) missing.push('VITE_SUPABASE_URL');
  if (!key) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');

  if (missing.length > 0) {
    _validationResult = {
      valid: false,
      error: `Missing required environment variables:\n${missing.join('\n')}\n\nPlease configure these in your deployment settings.`,
    };
  } else {
    _validationResult = {
      valid: true,
      env: {
        VITE_SUPABASE_URL: url,
        VITE_SUPABASE_PUBLISHABLE_KEY: key,
      },
    };
    console.log('[env] Supabase config loaded');
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
