/**
 * Maps internal errors to user-friendly messages
 * Prevents exposure of database structure and internal logic
 */
export function getUserFriendlyError(error: unknown): string {
  if (!error) {
    return "An unexpected error occurred. Please try again.";
  }

  // Handle Supabase/Postgres errors
  if (typeof error === 'object' && error !== null) {
    const err = error as any;
    
    // Auth-specific errors
    if (err.message?.includes('Invalid login credentials') || 
        err.message?.includes('invalid_credentials') ||
        err.code === 'invalid_credentials') {
      return "Invalid email or password. Please check your credentials and try again.";
    }
    
    if (err.message?.includes('Email not confirmed')) {
      return "Please confirm your email address before signing in.";
    }
    
    if (err.message?.includes('User not found') || 
        err.message?.includes('user_not_found')) {
      return "No account found with this email. Please sign up first.";
    }
    
    if (err.message?.includes('Email rate limit exceeded')) {
      return "Too many attempts. Please wait a few minutes and try again.";
    }
    
    // JWT/Auth errors
    if (err.message?.includes('JWT') || err.message?.includes('token')) {
      return "Your session has expired. Please sign in again.";
    }
    
    // RLS policy violations
    if (err.code === 'PGRST301' || err.message?.includes('row-level security')) {
      return "You don't have permission to perform this action.";
    }
    
    // Unique constraint violations
    if (err.code === '23505' || err.message?.includes('duplicate key')) {
      return "This record already exists. Please use different information.";
    }
    
    // Foreign key violations
    if (err.code === '23503') {
      return "This operation cannot be completed due to related data.";
    }
    
    // Network errors
    if (err.message?.includes('fetch') || err.message?.includes('network')) {
      return "Network error. Please check your connection and try again.";
    }
  }

  // Generic fallback
  return "An unexpected error occurred. Please contact support if this persists.";
}

/**
 * Logs errors for debugging (only in development)
 * Strips sensitive information in production
 */
export function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
  } else {
    // In production, only log minimal info
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${context}] Error occurred:`, message.substring(0, 100));
  }
}
