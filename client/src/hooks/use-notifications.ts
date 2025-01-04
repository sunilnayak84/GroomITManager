import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, doc, getDocs, updateDoc, addDoc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from "../lib/firebase";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";

interface Notification {
  id: string;
  userId: string;
  appointmentId: string | null;
  type: 'reminder' | 'status_change' | 'cancellation' | 'reschedule';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string | null;
}

interface CreateNotificationData {
  userId: string;
  appointmentId?: string;
  type: 'reminder' | 'status_change' | 'cancellation' | 'reschedule';
  title: string;
  message: string;
}

const notificationsCollection = collection(db, 'notifications');

export function useNotifications(userId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useUser();

  // Only proceed if we have a valid authenticated user
  const isAuthenticated = !!user;

  // Create notification mutation
  const createNotificationMutation = useMutation({
    mutationFn: async (data: CreateNotificationData) => {
      if (!isAuthenticated) {
        throw new Error('User must be authenticated to create notifications');
      }

      try {
        const timestamp = new Date().toISOString();
        const notificationData = {
          ...data,
          isRead: false,
          createdAt: timestamp,
          updatedAt: null
        };

        const docRef = await addDoc(notificationsCollection, notificationData);

        return {
          id: docRef.id,
          ...notificationData
        };
      } catch (error: any) {
        console.error('Error creating notification:', error);
        toast({
          title: "Error",
          description: error.code === 'permission-denied' 
            ? "You don't have permission to create notifications"
            : "Failed to create notification. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    }
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!isAuthenticated) {
        throw new Error('User must be authenticated to update notifications');
      }

      try {
        const notificationRef = doc(notificationsCollection, notificationId);
        const timestamp = new Date().toISOString();

        await updateDoc(notificationRef, {
          isRead: true,
          updatedAt: timestamp
        });

        return notificationId;
      } catch (error: any) {
        console.error('Error marking notification as read:', error);
        toast({
          title: "Error",
          description: error.code === 'permission-denied'
            ? "You don't have permission to update notifications"
            : "Failed to mark notification as read. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    }
  });

  // Set up real-time updates for notifications
  useEffect(() => {
    if (!userId || !isAuthenticated) return;

    console.log('Setting up notifications listener for user:', userId);

    const q = query(
      notificationsCollection,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, {
      next: (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Notification[];
        queryClient.setQueryData(['notifications', userId], notifications);
      },
      error: (error: any) => {
        console.error('Error in notifications subscription:', error);
        if (error.code === 'permission-denied') {
          toast({
            title: "Access Denied",
            description: "You don't have permission to view notifications.",
            variant: "destructive",
          });
        }
      }
    });

    return () => unsubscribe();
  }, [userId, queryClient, toast, isAuthenticated]);

  // Query for fetching notifications
  const notificationsQuery = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!isAuthenticated) {
        console.log('User not authenticated, skipping notifications fetch');
        return [];
      }

      const db = getDatabase();
      const roleRef = ref(db, `roles/${userId}`);
      const roleSnapshot = await get(roleRef);
      const roleData = roleSnapshot.val();
      
      if (!roleData) {
        console.log('No role data found, assuming basic permissions');
        return [];
      }

      // All authenticated users can view their own notifications
      const uid = auth.currentUser?.uid;
      if (!uid) {
        console.log('No authenticated user found');
        return [];
      }

      try {
        console.log('Fetching notifications for user:', userId);
        const q = query(
          notificationsCollection,
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Notification[];
      } catch (error: any) {
        console.error('Error fetching notifications:', error);
        if (error.code === 'permission-denied') {
          toast({
            title: "Access Denied",
            description: "You don't have permission to view notifications.",
            variant: "destructive",
          });
          return []; // Return empty array instead of throwing
        }
        throw error;
      }
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 1000 * 60 // 1 minute
  });

  return {
    notifications: notificationsQuery.data || [],
    unreadCount: notificationsQuery.data?.filter(n => !n.isRead).length || 0,
    isLoading: notificationsQuery.isLoading,
    createNotification: createNotificationMutation.mutate,
    markAsRead: markAsReadMutation.mutate
  };
}