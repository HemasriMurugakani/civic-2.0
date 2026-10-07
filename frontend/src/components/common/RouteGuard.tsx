import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { UserRole } from '@/lib/types';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAF9F6] dark:bg-[#141211]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#800000] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-[#FAF9F6] dark:bg-[#141211]">
        <h2 className="text-xl font-bold text-stone-900 dark:text-white">403 - Access Forbidden</h2>
        <p className="mt-2 text-sm text-stone-500">
          Your current role ({user.role}) does not have permission to access this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
