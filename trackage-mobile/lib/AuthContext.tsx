import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { getOrganiserMe, Organiser } from './api';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  organiser: Organiser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  organiser: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [organiser, setOrganiser] = useState<Organiser | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadOrganiser(s: Session) {
    try {
      const org = await getOrganiserMe(s.access_token);
      setOrganiser(org);
    } catch (err) {
      console.error('[AuthContext] loadOrganiser failed:', err);
      setOrganiser(null);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) {
        loadOrganiser(s).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        loadOrganiser(s);
      } else {
        setOrganiser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setOrganiser(null);
  }

  return (
    <AuthContext.Provider value={{ session, organiser, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
