/** Supabase Auth implementation: email + password, hashed server-side. */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthProvider, AuthUser } from '../repository';

export class SupabaseAuth implements AuthProvider {
  constructor(private readonly sb: SupabaseClient) {}

  async getUser(): Promise<AuthUser | null> {
    const { data } = await this.sb.auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email } : null;
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    await this.sb.auth.signOut();
  }

  onChange(cb: (user: AuthUser | null) => void): () => void {
    const { data } = this.sb.auth.onAuthStateChange((_event, session) => {
      cb(session?.user ? { id: session.user.id, email: session.user.email } : null);
    });
    return () => data.subscription.unsubscribe();
  }
}
