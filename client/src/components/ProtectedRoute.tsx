import { ReactNode } from 'react';
import { useUser } from '@/hooks/use-user';
import { useLocation } from 'wouter';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('admin' | 'manager' | 'staff' | 'receptionist')[];
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles = ['admin', 'manager', 'staff', 'receptionist']
}: ProtectedRouteProps) {
  const { user, isLoading } = useUser();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      // Redirect to login if not authenticated
      setLocation('/login');
    } else if (!isLoading && user && allowedRoles.length > 0) {
      // Check if user has required role
      if (!allowedRoles.includes(user.role as any)) {
        setLocation('/unauthorized');
      }
    }
  }, [user, isLoading, location, allowedRoles]);

  // Show nothing while loading
  if (isLoading) {
    return null;
  }

  // Show children only if authenticated and authorized
  if (!user || (allowedRoles.length > 0 && !allowedRoles.includes(user.role as any))) {
    return null;
  }

  return <>{children}</>;
}
