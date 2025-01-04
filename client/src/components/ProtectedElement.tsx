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
  const { 
    hasPermission, 
    hasAllPermissions, 
    hasAnyPermission, 
    isLoading, 
    error,
    role 
  } = useRole();

  // Show loader while checking permissions
  if (isLoading && showLoader) {
    return <Skeleton className="h-8 w-full" />;
  }

  // Handle errors gracefully
  if (error) {
    console.error('Permission check error:', error);
    return <>{fallback}</>;
  }

  // Admin or users with 'view_notifications' permission have access
  if (role?.role === 'admin' || 
      (requiredPermissions === 'view_notifications' && role?.permissions?.includes('view_notifications'))) {
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
