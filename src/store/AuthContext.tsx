/** App-wide authentication state, backed by the AuthProvider (Supabase). */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getAuth, isSupabaseConfigured } from '@/data';
import type { AuthUser } from '@/data/repository';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /** Whether a secure admin backend is available at all. */
  adminAvailable: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useMemo(() => getAuth(), []);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    auth
      .getUser()
      .then((u) => alive && setUser(u))
      .finally(() => alive && setLoading(false));
    const unsub = auth.onChange((u) => setUser(u));
    return () => {
      alive = false;
      unsub();
    };
  }, [auth]);

  const signIn = useCallback(
    (email: string, password: string) => auth.signIn(email, password),
    [auth],
  );
  const signOut = useCallback(() => auth.signOut(), [auth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      adminAvailable: isSupabaseConfigured,
      signIn,
      signOut,
    }),
    [user, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
