
import { ReactNode } from 'react';
import { useUser } from '@/hooks/use-user';
import { useLocation } from 'wouter';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('admin' | 'manager' | 'staff' | 'receptionist' | 'customer')[];
  requiresUserManagement?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles = [],
  requiresUserManagement = false
}: ProtectedRouteProps) {
  const { user, isLoading } = useUser();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setLocation('/login');
        return;
      }

      // Customer specific routing
      if (user.role === 'customer') {
        if (!location.startsWith('/customer')) {
          setLocation('/customer');
          return;
        }
      }

      // Role-based access check
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        setLocation('/unauthorized');
        return;
      }

      // Manager restrictions for user management
      if (user.role === 'manager' && requiresUserManagement) {
        setLocation('/unauthorized');
        return;
      }
    }
  }, [user, isLoading, location, allowedRoles, requiresUserManagement]);

  if (isLoading || !user) {
    return null;
  }

  return <>{children}</>;
}
