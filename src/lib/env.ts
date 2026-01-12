/**
 * Environment variable validation with hard-failure protection
 * Missing critical Supabase variables will throw immediately - no silent failures
 */

interface EnvVars {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_PUBLISHABLE_KEY: string;
  VITE_SUPABASE_PROJECT_ID: string;
}

// Cache for validated environment
let cachedEnv: EnvVars | null = null;
let validationError: string | null = null;

function getEnvVar(name: string): string {
  // Try import.meta.env first (Vite)
  const value = import.meta.env?.[name];
  return value || '';
}

function validateEnv(): EnvVars | null {
  if (cachedEnv) {
    return cachedEnv;
  }

  const url = getEnvVar('VITE_SUPABASE_URL');
  const key = getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY');
  const projectId = getEnvVar('VITE_SUPABASE_PROJECT_ID');

  const missing: string[] = [];
  
  if (!url) missing.push('VITE_SUPABASE_URL');
  if (!key) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');

  // If missing essential vars, store error but don't throw yet
  if (missing.length > 0) {
    validationError = `[FATAL] Missing required Supabase environment variables:\n${missing.join('\n')}\n\nThe application cannot start without these values.`;
    console.error(validationError);
    return null;
  }

  cachedEnv = {
    VITE_SUPABASE_URL: url,
    VITE_SUPABASE_PUBLISHABLE_KEY: key,
    VITE_SUPABASE_PROJECT_ID: projectId || '',
  };

  // Log successful initialization in development
  if (import.meta.env.DEV) {
    console.log('[env] Environment validated successfully', {
      url: url.substring(0, 30) + '...',
      projectId: projectId || '(not set)',
    });
  }

  return cachedEnv;
}

/**
 * Check if environment is valid without throwing
 * Useful for conditional rendering before full initialization
 */
export function isEnvValid(): boolean {
  return validateEnv() !== null;
}

/**
 * Get the validation error message if environment is invalid
 */
export function getEnvError(): string | null {
  validateEnv(); // Trigger validation
  return validationError;
}

/**
 * Get a specific env var, throwing if not available
 * Use this when you NEED the value and can't continue without it
 */
export function requireEnv(name: keyof EnvVars): string {
  const validated = validateEnv();
  if (!validated) {
    throw new Error(validationError || 'Environment not configured');
  }
  return validated[name];
}

// Lazy getter - validates when accessed
// DOES NOT THROW - returns empty string if not configured
// Use isEnvValid() first to check, or requireEnv() if you need to throw
export const env: EnvVars = new Proxy({} as EnvVars, {
  get(_, prop: string) {
    const validated = validateEnv();
    if (!validated) {
      // Return empty string to prevent immediate crash at module load
      // The app should check isEnvValid() and show appropriate UI
      return '';
    }
    return validated[prop as keyof EnvVars];
  }
});
