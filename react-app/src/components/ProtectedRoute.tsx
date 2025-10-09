// src/components/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const location = useLocation();
  const { user } = useAuth(location.pathname);

  if (user?.uid !== undefined && user?.uid !== null) {
    return children;
  }

  return <Navigate to="/login" replace />;
}
