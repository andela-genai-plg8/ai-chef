// src/components/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

import React from 'react';

export function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const location = useLocation();
  const { user } = useAuth(location.pathname);

  if (!user) return <Navigate to="/login" replace />;

  return children;
}
