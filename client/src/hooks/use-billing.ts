import { useState, useCallback } from 'react';
import { Bill as BaseBill, BillDraft, BillStatus } from '@/types/billing';
import { useToast } from './use-toast';
import { auth } from '@/lib/firebase';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useFirebaseAuth } from '@/hooks/use-firebase-auth';
import { useUser } from '@/hooks/use-user';
import { Bill } from '@/types/billing';

export interface BillItem {
  id: string;
  serviceName: string;
  price: number;
  quantity: number;
  subtotal: number;
  description?: string;
}

export function useBilling() {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();
  const { user } = useUser();

  const fetchBills = async () => {
    if (!user) return [];

    const idToken = await getIdToken();
    const apiBaseUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${apiBaseUrl}/api/billing/all`, {
      headers: {
        Authorization: `Bearer ${idToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch bills');
    }

    return await response.json();
  };

  const getBillById = async (id: string): Promise<Bill | null> => {
    try {
      const billRef = doc(db, 'bills', id);
      const billDoc = await getDoc(billRef);

      if (!billDoc.exists()) {
        console.error(`[BILLING] Bill with ID ${id} not found`);
        return null;
      }

      const data = billDoc.data();

      // Convert timestamps to Dates for consistent handling
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt ? new Date(data.updatedAt) : null;

      const bill: Bill = {
        id: billDoc.id,
        status: data.status,
        createdAt,
        updatedAt,
        customerId: data.customerId,
        customerName: data.customerName,
        appointmentId: data.appointmentId,
        petId: data.petId,
        items: data.items || [],
        subtotal: data.subtotal || 0,
        tax: data.tax || 0,
        totalAmount: data.totalAmount || 0,
        paymentId: data.paymentId,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        paymentLink: data.paymentLink
      };

      return bill;
    } catch (error) {
      console.error('[BILLING] Error fetching bill:', error);
      return null;
    }
  };

  const billsQuery = useQuery<Bill[]>({
    queryKey: ['bills'],
    queryFn: fetchBills,
  });

  const createBillMutation = useMutation({
    mutationFn: async (data: { appointmentId: string }) => {
      const idToken = await getIdToken();
      const apiBaseUrl = import.meta.env.VITE_API_URL || '';

      const response = await fetch(`${apiBaseUrl}/api/billing/generate/${data.appointmentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create bill: ${errorText}`);
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  return {
    bills: billsQuery.data || [],
    isLoading: billsQuery.isLoading,
    isError: billsQuery.isError,
    error: billsQuery.error,
    createBill: createBillMutation.mutateAsync,
    refetch: billsQuery.refetch,
    getBills: fetchBills,
    getBillById,
  };
}