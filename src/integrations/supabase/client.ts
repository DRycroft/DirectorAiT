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

  // Primary: Use Vite env vars (injected at build time by Vercel/Lovable)
  // Fallback: Use Lovable Cloud values for preview when env injection fails
  const LOVABLE_CLOUD_URL = 'https://lomksomekpysjgtnlguq.supabase.co';
  const LOVABLE_CLOUD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvbWtzb21la3B5c2pndG5sZ3VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NjEyMDgsImV4cCI6MjA3NjMzNzIwOH0.xwRiW2B8X51puDJ3IxnwKWsUsv7jRHsAIJjd6Wkq-JA';

  const url = import.meta.env.VITE_SUPABASE_URL || LOVABLE_CLOUD_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || LOVABLE_CLOUD_KEY;

  // Log which source is being used (helpful for debugging)
  const usingFallback = !import.meta.env.VITE_SUPABASE_URL;
  if (usingFallback) {
    console.log('[Supabase] Using Lovable Cloud fallback (VITE_* env vars not injected)');
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
