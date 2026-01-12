// Lazy-initialized Supabase client - NO module-level env access
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Singleton client - lazily initialized
let _client: SupabaseClient<Database> | null = null;

/**
 * Get the Supabase client instance.
 * Lazily creates the client on first access to avoid module-level env access.
 * @throws Error if environment variables are missing
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (_client) {
    return _client;
  }

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase configuration. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set.'
    );
  }

  console.log('[Supabase] Initializing client...');
  
  _client = createClient<Database>(url, key, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  console.log('[Supabase] Client initialized successfully');
  return _client;
}

/**
 * Legacy export for compatibility - uses lazy getter
 * @deprecated Use getSupabaseClient() instead for explicit initialization
 */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
