// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@utils/useAuth';

import React from 'react';

export function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const user = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
