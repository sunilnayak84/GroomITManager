import { useUser } from './use-user';

export function useElementVisibility() {
  const { user, isLoading } = useUser();

  const canView = (requiredPermissions: string | string[]): boolean => {
    if (isLoading || !user) {
      return false;
    }

    // Admin has access to everything
    if (user.role === 'admin') {
      return true;
    }

    const permissions = Array.isArray(requiredPermissions) 
      ? requiredPermissions 
      : [requiredPermissions];

    // Check if user has all required permissions
    return permissions.every(permission => 
      user.permissions?.includes(permission)
    );
  };

  return {
    canView,
    isLoading,
    userRole: user?.role
  };
}
