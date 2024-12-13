import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, doc, getDocs, updateDoc, addDoc, onSnapshot, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from "../lib/firebase";
import { toast } from '@/components/ui/use-toast';
import { useEffect } from "react";

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

  // Create notification mutation
  const createNotificationMutation = useMutation({
    mutationFn: async (data: CreateNotificationData) => {
      try {
        const timestamp = new Date().toISOString();
        const notificationData = {
          ...data,
          isRead: false,
          createdAt: timestamp,
          updatedAt: null
        };

        const docRef = await addDoc(notificationsCollection, notificationData);
        
        console.log('Notification created:', docRef.id);
        return {
          id: docRef.id,
          ...notificationData
        };
      } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create notification"
      });
    }
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      try {
        const notificationRef = doc(notificationsCollection, notificationId);
        const timestamp = new Date().toISOString();
        
        await updateDoc(notificationRef, {
          isRead: true,
          updatedAt: timestamp
        });

        return notificationId;
      } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark notification as read"
      });
    }
  });

  // Set up real-time updates for notifications
  useEffect(() => {
    const q = query(
      notificationsCollection,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];

      queryClient.setQueryData(['notifications', userId], notifications);
    });

    return () => unsubscribe();
  }, [userId, queryClient]);

  // Query for fetching notifications
  const notificationsQuery = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      try {
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
      } catch (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }
    },
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
