import { ReactNode } from 'react';
import { useUser } from '@/hooks/use-user';
import { useLocation } from 'wouter';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('admin' | 'manager' | 'staff' | 'receptionist')[];
  requiresUserManagement?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles = ['admin', 'manager', 'staff', 'receptionist'],
  requiresUserManagement = false
}: ProtectedRouteProps) {
  const { user, isLoading } = useUser();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      // Redirect to login if not authenticated
      setLocation('/login');
    } else if (!isLoading && user && allowedRoles.length > 0) {
      // Special check for manager and user management pages
      if (user.role === 'manager') {
        const userManagementPaths = [
          '/users', 
          '/roles', 
          '/permissions', 
          '/staff-management',
          '/auth/admin',
          '/auth/setup',
          '/user-management',
          '/role-management',
          '/settings/role-management'
        ];
        const isUserManagementPath = userManagementPaths.some(path => location.startsWith(path));
        if (isUserManagementPath || requiresUserManagement) {
          setLocation('/unauthorized');
          return;
        }
      }
      
      // Check if user has required role
      if (!allowedRoles.includes(user.role as any)) {
        setLocation('/unauthorized');
      }
    }
  }, [user, isLoading, location, allowedRoles, requiresUserManagement]);

  // Show nothing while loading
  if (isLoading) {
    return null;
  }

  // Special check for user management pages
  if (requiresUserManagement && user?.role === 'manager') {
    return null;
  }

  // Show children only if authenticated and authorized
  if (!user) {
    return null;
  }

  // Additional check for role-based access
  if (allowedRoles.length > 0) {
    const userRole = user.role as 'admin' | 'manager' | 'staff' | 'receptionist';
    if (!allowedRoles.includes(userRole)) {
      return null;
    }
  }

  return <>{children}</>;
}