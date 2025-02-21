import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuth, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { toast } from '@/components/ui/use-toast';

interface Role {
  id: string;
  name: string;
  permissions: string[];
  description?: string;
}

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: string;
  disabled?: boolean;
  lastSignInTime?: string;
  createdAt?: string;
}

const db = getFirestore();
const auth = getAuth();

async function fetchRoles(): Promise<Role[]> {
  try {
    console.log('[ROLES] Fetching roles from Firestore...');
    const rolesSnapshot = await getDocs(collection(db, 'role-definitions'));
    const roles = rolesSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.id,
      ...doc.data()
    } as Role));
    console.log('[ROLES] Fetched roles:', roles);
    return roles;
  } catch (error) {
    console.error('[ROLES] Error fetching roles:', error);
    throw error;
  }
}

async function fetchUsers(): Promise<User[]> {
  try {
    console.log('[USERS] Fetching users from Firestore...');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    // Get additional user details from Firebase Auth
    const authDetails = await admin.auth().listUsers();
    const authMap = new Map(authDetails.users.map(user => [user.uid, user]));

    // Map Firestore users with Auth details
    const users = usersSnapshot.docs.map(doc => {
      const data = doc.data();
      const authData = authMap.get(doc.id);
      
      return {
        uid: doc.id,
        email: data.email,
        displayName: data.displayName || data.email?.split('@')[0] || 'N/A',
        role: data.role || 'user',
        lastSignInTime: authData?.metadata?.lastSignInTime || 'Never',
        createdAt: data.createdAt || null,
        disabled: data.disabled || false
      } as User;
    });

    // Map Firestore users to our User interface
    const users = usersSnapshot.docs.map((doc, index) => {
      const data = doc.data();
      const authUser = authDetails[index];

      return {
        uid: doc.id,
        email: data.email,
        displayName: data.displayName || data.email?.split('@')[0] || 'N/A',
        role: data.role || 'user', // Default role if not set
        lastSignInTime: data.lastSignInTime ? new Date(data.lastSignInTime).toISOString() : 'Never',
        createdAt: data.createdAt || null,
        disabled: data.disabled || false
      } as User;
    });

    console.log('[USERS] Fetched users:', users);
    return users;
  } catch (error) {
    console.error('[USERS] Error fetching users:', error);
    throw error;
  }
}

async function createRole(data: { name: string; permissions: string[] }): Promise<Role> {
  try {
    console.log('[ROLES] Creating role:', data);
    const roleRef = doc(db, 'role-definitions', data.name);
    await setDoc(roleRef, {
      ...data,
      createdAt: new Date().toISOString()
    });
    const role = {
      id: data.name,
      ...data
    };
    console.log('[ROLES] Created role:', role);
    return role;
  } catch (error) {
    console.error('[ROLES] Error creating role:', error);
    throw error;
  }
}

async function updateRole({ roleId, ...data }: { roleId: string; name: string; permissions: string[] }): Promise<Role> {
  try {
    console.log('[ROLES] Updating role:', { roleId, ...data });
    const roleRef = doc(db, 'role-definitions', roleId);
    await updateDoc(roleRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
    const role = {
      id: roleId,
      ...data
    };
    console.log('[ROLES] Updated role:', role);
    return role;
  } catch (error) {
    console.error('[ROLES] Error updating role:', error);
    throw error;
  }
}

async function updateUserRole(params: { userId: string; role: string }): Promise<void> {
  try {
    console.log('[USERS] Updating user role:', params);
    const userRef = doc(db, 'users', params.userId);
    await updateDoc(userRef, {
      role: params.role,
      updatedAt: new Date().toISOString()
    });
    console.log('[USERS] Updated user role successfully');
  } catch (error) {
    console.error('[USERS] Error updating user role:', error);
    throw error;
  }
}

export function useRoles() {
  const queryClient = useQueryClient();

  const { 
    data: roles, 
    isLoading: isLoadingRoles, 
    error: rolesError 
  } = useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
    retry: 1
  });

  const { 
    data: users, 
    isLoading: isLoadingUsers, 
    error: usersError 
  } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    retry: 1
  });

  const createRoleMutation = useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({
        title: 'Success',
        description: 'Role created successfully'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: updateRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast({
        title: 'Success',
        description: 'Role updated successfully'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: updateUserRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Success',
        description: 'User role updated successfully'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    roles: roles || [],
    isLoadingRoles,
    users: users || [],
    isLoadingUsers,
    createRole: createRoleMutation.mutate,
    updateRole: updateRoleMutation.mutate,
    isCreating: createRoleMutation.isPending,
    isUpdating: updateRoleMutation.isPending,
    updateUserRole: updateUserRoleMutation.mutate,
    isUpdatingUserRole: updateUserRoleMutation.isPending,
    error: rolesError || usersError
  };
}