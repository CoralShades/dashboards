
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

type UserRole = 'admin' | 'role_a' | 'role_b';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  requiredRole?: UserRole;
}

const ProtectedRoute = ({ children, fallback, requiredRole }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check authentication first
  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  // Check role-based access if requiredRole is specified
  if (requiredRole && role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h2>
            <p className="text-red-600 mb-4">
              You don't have permission to access this page. 
              {requiredRole && ` This page requires ${requiredRole} role.`}
            </p>
            <Navigate to="/" replace />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
