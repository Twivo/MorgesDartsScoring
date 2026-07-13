import { Navigate } from 'react-router-dom';
import { useAuth } from '@/store/AuthContext';
import { useT } from '@/store/LangContext';
import { AdminLogin } from '@/features/admin/AdminLogin';

/** Standalone sign-in page: shows the login form, then returns home. */
export function LoginRoute() {
  const { user, loading } = useAuth();
  const { t } = useT();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--color-text-dim)]">
        {t('common.loading')}
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;
  return <AdminLogin />;
}
