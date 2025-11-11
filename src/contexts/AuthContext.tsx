import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { runBootstrapFromLocalStorage } from '@/lib/bootstrap';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      logger.info('Auth session initialized', { userId: session?.user?.id });
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      logger.info('Auth state changed', { event: _event, userId: session?.user?.id });
      
      // Run bootstrap on sign-in to complete any pending org setup
      if (_event === 'SIGNED_IN') {
        try {
          await runBootstrapFromLocalStorage();
        } catch (error) {
          logger.error('Bootstrap failed on SIGNED_IN', error);
        }
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
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    logger.info('User signed out');
  };

  const refreshSession = async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      logger.error('Failed to refresh session', error);
    } else {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      logger.info('Session refreshed');
    }
  };

  const value = {
    user,
    session,
    loading,
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
