import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { runBootstrapFromLocalStorage } from '@/lib/bootstrap';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isBootstrapping: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST (before checking session)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Synchronous state updates only in callback
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
      
      logger.info('Auth state changed', { event, userId: newSession?.user?.id });
      
      // Run bootstrap on sign-in using setTimeout to avoid deadlocks
      if (event === 'SIGNED_IN' && newSession?.user) {
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
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);
      logger.info('Auth session initialized', { userId: existingSession?.user?.id });
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
      logger.info('User signed out');
    } catch (error) {
      logger.error('Sign out error', error);
      // Still clear local state on error
      setUser(null);
      setSession(null);
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
