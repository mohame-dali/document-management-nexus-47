
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isExecutiveDashboardUser } from '@/utils/roleUtils';

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: Array<'Director' | 'Admin' | 'AdminDepartment' | 'AdminTuningDesk' | 'User'>;
  requireExecutiveDashboard?: boolean;
  redirectTo?: string;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = [],
  requireExecutiveDashboard = false,
  redirectTo = '/403',
}) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to landing page if not authenticated (instead of login page)
  if (!currentUser) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Executive dashboard guard (Admin & Director/Directeur only)
  if (requireExecutiveDashboard && !isExecutiveDashboardUser(currentUser)) {
    return <Navigate to={redirectTo === '/403' ? '/dashboard/mail/incoming' : redirectTo} replace />;
  }

  // Check role-based access
  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

