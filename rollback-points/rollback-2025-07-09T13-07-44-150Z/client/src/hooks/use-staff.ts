import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, updateDoc, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { db } from '../lib/firebase';
import type { User, InsertUser } from '@/lib/user-types';

const STAFF_COLLECTION = 'users';
const ROLES_COLLECTION = 'roles';

export function useStaff() {
  const queryClient = useQueryClient();
  const auth = getAuth();

  const { data: staffMembers = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      console.log('FETCH_STAFF: Starting to fetch staff members');
      try {
        const q = query(
          collection(db, STAFF_COLLECTION),
          where('role', 'in', ['staff', 'groomer', 'pet_walker'])
        );
        const snapshot = await getDocs(q);
        const staff = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as User[];

        console.log('FETCH_STAFF: Successfully fetched staff members:', staff);
        return staff;
      } catch (error) {
        console.error('FETCH_STAFF: Error fetching staff:', error);
        throw error;
      }
    }
  });

  const addStaffMember = useMutation({
    mutationFn: async (data: InsertUser) => {
      console.log('Adding staff member with data:', data);

      try {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          data.email,
          data.password || 'Welcome123!' // Default password if not provided
        );

        const { uid } = userCredential.user;
        const timestamp = new Date().toISOString();

        // Set specialties automatically for groomers
        const specialties = data.role === 'groomer'
          ? ['groomer', ...(data.specialties || [])]
          : data.specialties || [];

        // Prepare user data
        const userData = {
          email: data.email,
          name: data.name,
          role: data.role,
          phone: data.phone.startsWith('+') ? data.phone : `+91${data.phone}`,
          specialties,
          experienceYears: data.experienceYears || 0,
          maxDailyAppointments: data.maxDailyAppointments || 8,
          walkingPreferences: data.role === 'pet_walker' ? {
            maxDistance: data.walkingPreferences?.maxDistance || 5,
            preferredAreas: data.walkingPreferences?.preferredAreas || [],
            availableTimeSlots: data.walkingPreferences?.availableTimeSlots || [],
            simultaneousWalks: data.walkingPreferences?.simultaneousWalks || 1
          } : null,
          branch: 'null', // Default branch
          isActive: true, // Default to active
          createdAt: timestamp,
          updatedAt: timestamp,
          metadata: {}, // Empty metadata object
          schedule: [], // Empty schedule array
          isGroomer: data.role === 'groomer' // Additional flag for groomer role
        };

        // Save user data in Firestore
        await setDoc(doc(db, STAFF_COLLECTION, uid), userData);

        // Set role in roles collection
        await setDoc(doc(db, ROLES_COLLECTION, uid), {
          role: data.role,
          permissions: getRolePermissions(data.role),
          updatedAt: timestamp
        });

        console.log('Staff member created successfully:', { uid, userData });
        return { uid, ...userData };
      } catch (error) {
        console.error('Error in addStaffMember:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    }
  });

  const updateStaffMember = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      console.log('Updating staff member:', id, 'with data:', data);
      const docRef = doc(db, STAFF_COLLECTION, id);

      // Set specialties automatically for groomers if role is being updated
      const specialties = data.role === 'groomer'
        ? ['groomer', ...(data.specialties || [])]
        : data.specialties;

      const updateData = {
        ...data,
        specialties,
        updatedAt: new Date().toISOString(),
        isGroomer: data.role === 'groomer',
        walkingPreferences: data.role === 'pet_walker' ? {
          maxDistance: data.walkingPreferences?.maxDistance || 5,
          preferredAreas: data.walkingPreferences?.preferredAreas || [],
          availableTimeSlots: data.walkingPreferences?.availableTimeSlots || [],
          simultaneousWalks: data.walkingPreferences?.simultaneousWalks || 1
        } : null
      };

      await updateDoc(docRef, updateData);

      // Update role if changed
      if (data.role) {
        const roleRef = doc(db, ROLES_COLLECTION, id);
        await setDoc(roleRef, {
          role: data.role,
          permissions: getRolePermissions(data.role),
          updatedAt: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    }
  });

  const deleteStaffMember = useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting staff member:', id);
      const docRef = doc(db, STAFF_COLLECTION, id);
      await deleteDoc(docRef);
      // Also delete role
      const roleRef = doc(db, ROLES_COLLECTION, id);
      await deleteDoc(roleRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    }
  });

  return {
    staffMembers,
    isLoading,
    addStaffMember: addStaffMember.mutateAsync,
    updateStaffMember: updateStaffMember.mutateAsync,
    deleteStaffMember: deleteStaffMember.mutateAsync
  };
}

// Helper function to get default permissions based on role
function getRolePermissions(role: string): string[] {
  const DEFAULT_PERMISSIONS = {
    staff: [
      'view_appointments',
      'manage_own_schedule',
      'view_customers'
    ],
    groomer: [
      'view_appointments',
      'manage_own_schedule',
      'view_customers',
      'manage_appointments'
    ],
    pet_walker: [
      'view_appointments',
      'manage_own_schedule',
      'view_customers',
      'manage_walks'
    ]
  };

  return DEFAULT_PERMISSIONS[role as keyof typeof DEFAULT_PERMISSIONS] || DEFAULT_PERMISSIONS.staff;
}