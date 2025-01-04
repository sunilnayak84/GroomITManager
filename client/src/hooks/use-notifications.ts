import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, doc, getDocs, updateDoc, addDoc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from "../lib/firebase";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

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

        return {
          id: docRef.id,
          ...notificationData
        };
      } catch (error: any) {
        console.error('Error creating notification:', error);
        toast({
          title: "Error",
          description: "Failed to create notification. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
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
      } catch (error: any) {
        console.error('Error marking notification as read:', error);
        toast({
          title: "Error",
          description: "Failed to mark notification as read. Please try again.",
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
    if (!userId) return;

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
  }, [userId, queryClient, toast]);

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