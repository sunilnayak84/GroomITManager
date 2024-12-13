import { ReactNode } from 'react';
import { useElementVisibility } from '@/hooks/use-element-visibility';
import { Skeleton } from './ui/skeleton';

interface ProtectedElementProps {
  children: ReactNode;
  requiredPermissions: string | string[];
  fallback?: ReactNode;
  showLoader?: boolean;
}

export function ProtectedElement({ 
  children, 
  requiredPermissions, 
  fallback = null,
  showLoader = false
}: ProtectedElementProps) {
  const { canView, isLoading } = useElementVisibility();

  if (isLoading && showLoader) {
    return <Skeleton className="h-8 w-full" />;
  }

  if (!canView(requiredPermissions)) {
    return fallback;
  }

  return <>{children}</>;
}
