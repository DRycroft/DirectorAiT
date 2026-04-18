import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { runBootstrapFromLocalStorage } from '@/lib/bootstrap';

/** Public/auth paths where forceReauth must NOT redirect (avoid loops / breaking flows). */
const PUBLIC_AUTH_PATHS = [
  '/auth',
  '/signup',
  '/auth/callback',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/invite/',
  '/action/',
  '/',
  '/pricing',
  '/contact',
  '/terms',
  '/privacy',
  '/health',
];

function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some((p) =>
    p.endsWith('/') ? pathname.startsWith(p) : pathname === p
  );
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isBootstrapping: boolean;
  /** True while the profile (onboarding flag) is being read for the current user. */
  profileLoading: boolean;
  /**
   * Tri-state onboarding flag for the current user:
   * - null  : unknown / not yet loaded (or no user)
   * - true  : profile.onboarding_complete = true
   * - false : profile missing OR onboarding_complete = false (fail-safe)
   */
  onboardingComplete: boolean | null;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  /** Phase 4: forced re-auth on true auth death (expired/invalid refresh). De-duplicated. */
  forceReauth: (reason?: string) => Promise<void>;
  /** Re-read profile.onboarding_complete for the current user (e.g. after completing onboarding). */
  refreshOnboardingStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Fail-safe profile read: any error => treated as incomplete (false). */
async function readOnboardingComplete(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) return false;
    return !!data.onboarding_complete;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const queryClient = useQueryClient();
  const reauthInFlightRef = useRef(false);

  useEffect(() => {
    let initialSessionHandled = false;

    // Set up auth state listener FIRST (before checking session)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Synchronous state updates only in callback
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);

      logger.info('Auth state changed', { event, userId: newSession?.user?.id });

      // Phase 3: Clear onboarding state on SIGNED_OUT
      if (event === 'SIGNED_OUT') {
        setOnboardingComplete(null);
        setProfileLoading(false);
        return;
      }

      // Phase 3: load onboarding flag whenever we get a session via SIGNED_IN
      // or the canonical INITIAL_SESSION seed (fires once on mount).
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && newSession?.user) {
        const userId = newSession.user.id;
        setProfileLoading(true);
        setTimeout(async () => {
          const complete = await readOnboardingComplete(userId);
          setOnboardingComplete(complete);
          setProfileLoading(false);
        }, 0);
      } else if (event === 'INITIAL_SESSION' && !newSession) {
        // No restored session — nothing to load.
        setOnboardingComplete(null);
        setProfileLoading(false);
      }

      if (event === 'INITIAL_SESSION') {
        initialSessionHandled = true;
      }

      // Run bootstrap on sign-in using setTimeout to avoid deadlocks
      if (event === 'SIGNED_IN' && newSession?.user) {
        // Phase 1: skip bootstrap when an invite acceptance is in progress.
        // AcceptInvite will link the user to the inviter's org; bootstrapping
        // here would race and risk creating a spurious "My Organization".
        const inviteInProgress =
          typeof window !== 'undefined' &&
          !!sessionStorage.getItem('invite_in_progress');

        if (inviteInProgress) {
          logger.info('Bootstrap skipped: invite acceptance in progress');
        } else {
          setIsBootstrapping(true);
          setTimeout(async () => {
            try {
              await runBootstrapFromLocalStorage();
              logger.info('Bootstrap completed after SIGNED_IN');
            } catch (error) {
              logger.error('Bootstrap failed on SIGNED_IN', error);
              try {
                toast.error('Workspace setup failed. Please reload and try again.');
              } catch {
                // toast is best-effort
              }
            } finally {
              setIsBootstrapping(false);
            }
          }, 0);
        }
      }
    });

    // Safety-net seed: if INITIAL_SESSION never fires (older SDKs / edge cases),
    // fall back to an explicit getSession() read so `loading` is cleared.
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (initialSessionHandled) return;
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);
      logger.info('Auth session initialized (fallback)', { userId: existingSession?.user?.id });
      if (existingSession?.user) {
        const userId = existingSession.user.id;
        setProfileLoading(true);
        readOnboardingComplete(userId).then((complete) => {
          setOnboardingComplete(complete);
          setProfileLoading(false);
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Session timeout check (every minute)
  useEffect(() => {
    if (!session) return;

    const checkSession = () => {
      if (session.expires_at) {
        const expiresAt = new Date(session.expires_at * 1000);
        const now = new Date();
        
        // If session expires in less than 5 minutes, refresh it
        const fiveMinutes = 5 * 60 * 1000;
        if (expiresAt.getTime() - now.getTime() < fiveMinutes) {
          logger.info('Session expiring soon, refreshing...');
          refreshSession();
        }
      }
    };

    const interval = setInterval(checkSession, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [session]);

  /** Clear all client-side auth/session state and React Query cache. */
  const clearLocalAuthState = () => {
    setUser(null);
    setSession(null);
    setOnboardingComplete(null);
    setProfileLoading(false);
    try {
      queryClient.clear();
    } catch (e) {
      logger.error('Failed to clear query cache', e);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      logger.info('User signed out');
    } catch (error) {
      logger.error('Sign out error', error);
    } finally {
      clearLocalAuthState();
    }
  };

  /**
   * Phase 4: forced re-auth on true auth death.
   * De-duplicated via reauthInFlightRef. Safe on public/auth paths (no redirect).
   */
  const forceReauth = async (reason?: string) => {
    if (reauthInFlightRef.current) return;
    reauthInFlightRef.current = true;
    logger.warn('forceReauth triggered', { reason });
    try {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        logger.error('forceReauth signOut error (continuing)', e);
      }
      clearLocalAuthState();

      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (!isPublicAuthPath(path)) {
          try {
            toast.error('Your session has expired. Please sign in again.');
          } catch {
            // toast is best-effort
          }
          const redirectTo = encodeURIComponent(path + window.location.search);
          window.location.replace(`/auth?redirect=${redirectTo}`);
        }
      }
    } finally {
      setTimeout(() => {
        reauthInFlightRef.current = false;
      }, 1000);
    }
  };

  /** True if a Supabase auth error indicates the session is dead (not just RLS/permission). */
  const isAuthDeathError = (error: any): boolean => {
    if (!error) return false;
    const msg = String(error.message || error.error_description || '').toLowerCase();
    const code = String(error.code || error.error || '').toLowerCase();
    return (
      code === 'invalid_grant' ||
      code === 'refresh_token_not_found' ||
      msg.includes('invalid refresh token') ||
      msg.includes('refresh token not found') ||
      msg.includes('jwt expired') ||
      msg.includes('invalid jwt') ||
      msg.includes('token has expired') ||
      msg.includes('user from sub claim in jwt does not exist')
    );
  };

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        logger.error('Failed to refresh session', error);
        if (isAuthDeathError(error)) {
          await forceReauth('refresh_failed');
        }
      } else if (!data.session) {
        await forceReauth('refresh_no_session');
      } else {
        setSession(data.session);
        setUser(data.session?.user ?? null);
        logger.info('Session refreshed');
      }
    } catch (error) {
      logger.error('Session refresh exception', error);
      if (isAuthDeathError(error)) {
        await forceReauth('refresh_exception');
      }
    }
  };

  const refreshOnboardingStatus = async () => {
    if (!user) return;
    setProfileLoading(true);
    const complete = await readOnboardingComplete(user.id);
    setOnboardingComplete(complete);
    setProfileLoading(false);
  };

  const value = {
    user,
    session,
    loading,
    isBootstrapping,
    profileLoading,
    onboardingComplete,
    signOut,
    refreshSession,
    forceReauth,
    refreshOnboardingStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
