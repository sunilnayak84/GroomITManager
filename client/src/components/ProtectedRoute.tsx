import { ReactNode } from 'react';
import { useUser } from '@/hooks/use-user';
import { useLocation, useNavigate } from 'wouter';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('admin' | 'staff' | 'receptionist')[];
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles = ['admin', 'staff', 'receptionist']
}: ProtectedRouteProps) {
  const { user, isLoading } = useUser();
  const [, navigate] = useNavigate();
  const [location] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      // Redirect to login if not authenticated
      navigate('/login', { 
        replace: true,
        state: { from: location } 
      });
    } else if (!isLoading && user && allowedRoles.length > 0) {
      // Check if user has required role
      if (!allowedRoles.includes(user.role as any)) {
        navigate('/unauthorized', { replace: true });
      }
    }
  }, [user, isLoading, navigate, location, allowedRoles]);

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
