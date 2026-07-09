/**
 * No-backend auth stub. Without Supabase there is no secure admin, so admin
 * features are simply unavailable (sign-in is rejected). The real, secure auth
 * is SupabaseAuth.
 */
import type { AuthProvider, AuthUser } from '../repository';

export class LocalAuth implements AuthProvider {
  async getUser(): Promise<AuthUser | null> {
    return null;
  }
  async signIn(): Promise<void> {
    throw new Error('Admin sign-in requires the cloud backend (Supabase).');
  }
  async signOut(): Promise<void> {
    /* no-op */
  }
  onChange(): () => void {
    return () => {};
  }
}
