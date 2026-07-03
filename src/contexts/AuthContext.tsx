import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authError: string | null;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Non-sensitive debug logger. Never logs tokens, emails, passwords or user IDs.
 * Enabled in dev, or when `localStorage.setItem('auth-debug','1')` is set.
 */
const authDebug = (event: string, meta: Record<string, unknown> = {}) => {
  try {
    const enabled =
      import.meta.env.DEV ||
      (typeof window !== 'undefined' && window.localStorage.getItem('auth-debug') === '1');
    if (!enabled) return;
    // Whitelist safe primitives only.
    const safe: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(meta)) {
      if (v == null) safe[k] = v;
      else if (typeof v === 'boolean' || typeof v === 'number') safe[k] = v;
      else if (typeof v === 'string') safe[k] = v.length > 40 ? `${v.slice(0, 8)}…(${v.length})` : v;
      else safe[k] = typeof v;
    }
    // eslint-disable-next-line no-console
    console.debug(`[auth] ${event}`, safe);
  } catch {
    /* ignore */
  }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    authDebug('provider:mount');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;
        authDebug('state-change', { event, hasSession: !!newSession });
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession()
      .then(({ data: { session: initial }, error }) => {
        if (!mounted) return;
        if (error) {
          authDebug('get-session:error', { code: (error as any)?.status ?? 'unknown' });
          setAuthError("Impossible de vérifier votre session. Veuillez vous reconnecter.");
          toast({
            title: 'Erreur de session',
            description: 'Nous n\'avons pas pu vérifier votre connexion. Veuillez réessayer.',
            variant: 'destructive',
          });
        } else {
          authDebug('get-session:ok', { hasSession: !!initial });
        }
        setSession(initial);
        setUser(initial?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        authDebug('get-session:exception');
        setAuthError('Problème de connexion au service d\'authentification.');
        setLoading(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      authDebug('provider:unmount');
    };
  }, []);

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    authDebug('signUp:start');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { first_name: firstName, last_name: lastName },
      },
    });
    authDebug('signUp:done', { ok: !error });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    authDebug('signIn:start');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    authDebug('signIn:done', { ok: !error });
    return { error };
  };

  const signOut = async () => {
    authDebug('signOut');
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, authError, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
