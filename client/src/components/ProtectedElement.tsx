import { ReactNode } from 'react';
import { useRole } from '@/hooks/use-role';
import { Skeleton } from './ui/skeleton';

interface ProtectedElementProps {
  children: ReactNode;
  requiredPermissions: string | string[];
  fallback?: ReactNode;
  showLoader?: boolean;
  requireAll?: boolean;
}

export function ProtectedElement({ 
  children, 
  requiredPermissions, 
  fallback = null,
  showLoader = true,
  requireAll = false
}: ProtectedElementProps): JSX.Element {
  const { hasPermission, hasAllPermissions, hasAnyPermission, isLoading, error } = useRole();

  // Show loader while checking permissions
  if (isLoading && showLoader) {
    return <Skeleton className="h-8 w-full" />;
  }

  // Handle errors gracefully
  if (error) {
    console.error('Permission check error:', error);
    return <>{fallback}</>;
  }

  const { role } = useRole();
  
  // Admin always has access
  if (role?.role === 'admin') {
    return <>{children}</>;
  }

  // For non-admin users, check specific permissions
  const hasAccess = Array.isArray(requiredPermissions)
    ? requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions)
    : hasPermission(requiredPermissions);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
