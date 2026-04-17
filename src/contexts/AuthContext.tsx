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
              // Don't throw - bootstrap failure shouldn't block auth
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

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setOnboardingComplete(null);
      setProfileLoading(false);
      logger.info('User signed out');
    } catch (error) {
      logger.error('Sign out error', error);
      // Still clear local state on error
      setUser(null);
      setSession(null);
      setOnboardingComplete(null);
      setProfileLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        logger.error('Failed to refresh session', error);
      } else {
        setSession(data.session);
        setUser(data.session?.user ?? null);
        logger.info('Session refreshed');
      }
    } catch (error) {
      logger.error('Session refresh exception', error);
    }
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
