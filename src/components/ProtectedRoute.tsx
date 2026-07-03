import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user && import.meta.env.DEV) {
      // Non-sensitive: log only the protected pathname (no query, no user data).
      // eslint-disable-next-line no-console
      console.debug('[auth] redirect->/auth', { from: location.pathname });
    }
  }, [loading, user, location.pathname]);

  // The global <AuthSplash> already covers the initial auth-loading state,
  // so we don't render a second spinner here (prevents flash).
  if (loading) return null;

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
