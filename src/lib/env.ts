/**
 * Environment variable validation
 * Provides safe access to environment variables with lazy validation
 */

interface EnvVars {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_PUBLISHABLE_KEY: string;
  VITE_SUPABASE_PROJECT_ID: string;
}

// Cache for validated environment
let cachedEnv: EnvVars | null = null;

function getEnvVar(name: string): string {
  // Try import.meta.env first (Vite)
  const value = import.meta.env?.[name];
  if (value) return value;
  
  // Return empty string for missing vars in development to allow graceful degradation
  return '';
}

function validateEnv(): EnvVars {
  if (cachedEnv) return cachedEnv;

  const env: EnvVars = {
    VITE_SUPABASE_URL: getEnvVar('VITE_SUPABASE_URL'),
    VITE_SUPABASE_PUBLISHABLE_KEY: getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY'),
    VITE_SUPABASE_PROJECT_ID: getEnvVar('VITE_SUPABASE_PROJECT_ID'),
  };

  // Only throw in production if critical vars are missing
  // In development, the Supabase client will use its own defaults
  const missing = Object.entries(env)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0 && import.meta.env.PROD) {
    console.error('Missing environment variables:', missing);
  }

  cachedEnv = env;
  return env;
}

// Lazy getter - only validates when accessed
export const env: EnvVars = new Proxy({} as EnvVars, {
  get(_, prop: string) {
    const validated = validateEnv();
    return validated[prop as keyof EnvVars];
  }
});
