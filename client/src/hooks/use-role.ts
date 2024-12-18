import { useEffect, useState } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { StaffRole } from '@/lib/user-types';
import { useUser } from './use-user';

interface UserRole {
  role: StaffRole;
  permissions: string[];
  updatedAt: number;
}

export function useRole() {
  const { user } = useUser();
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setRole(null);
      setIsLoading(false);
      return;
    }

    const roleRef = ref(database, `roles/${user.id}`);
    
    // Subscribe to role changes
    const unsubscribe = onValue(roleRef, (snapshot) => {
      const roleData = snapshot.val();
      if (roleData) {
        setRole(roleData);
      } else {
        setRole(null);
      }
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching role:', error);
      setError(error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // Check if user has specific permission
  const hasPermission = (permission: string) => {
    if (!role?.permissions) return false;
    return role.permissions.includes(permission);
  };

  // Check if user has any of the given permissions
  const hasAnyPermission = (permissions: string[]) => {
    if (!role?.permissions) return false;
    return permissions.some(permission => role.permissions.includes(permission));
  };

  // Check if user has all of the given permissions
  const hasAllPermissions = (permissions: string[]) => {
    if (!role?.permissions) return false;
    return permissions.every(permission => role.permissions.includes(permission));
  };

  return {
    role: role?.role,
    permissions: role?.permissions || [],
    isLoading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };
}
