import { useState, useCallback } from 'react';
import { Bill, BillDraft, BillStatus } from '@/types/billing';
import { useToast } from './use-toast';
import { auth } from '@/lib/firebase';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useFirebaseAuth } from '@/hooks/use-firebase-auth';
import { useUser } from '@/hooks/use-user';

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
    const response = await fetch(`${apiBaseUrl}/api/billing/bills`, {
      headers: {
        Authorization: `Bearer ${idToken}`
      }
    });

    if (!response.ok) {
      console.error('[BILLING] Failed to fetch bills:', await response.text());
      throw new Error('Failed to fetch bills');
    }

    return await response.json();
  };

  const getBillById = async (id: string): Promise<Bill | null> => {
    try {
      console.log(`[BILLING] Getting bill with ID: ${id}`);
      const billRef = doc(db, 'bills', id);
      const billDoc = await getDoc(billRef);

      if (!billDoc.exists()) {
        console.error(`[BILLING] Bill with ID ${id} not found`);
        return null;
      }

      console.log(`[BILLING] Bill document found: ${id}`);
      const data = billDoc.data();

      // Convert timestamps to Dates for consistent handling
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
      const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt ? new Date(data.updatedAt) : null;

      // Handle both old and new bill structures for backward compatibility
      const bill: Bill = {
        id: billDoc.id,
        billNumber: data.billNumber,
        status: data.status,
        createdAt,
        updatedAt,
        customerId: data.customerId,
        customerName: data.customerName,
        appointmentId: data.appointmentId,
        petId: data.petId,
        items: data.items || [],
        subtotal: data.subtotal || 0,
        discount: data.discount,
        discountAmount: data.discountAmount || 0,
        // Handle GST details (new structure) or fallback to old tax field
        gstDetails: data.gstDetails || {
          cgst: (data.tax || 0) / 2,
          sgst: (data.tax || 0) / 2,
          igst: 0,
          totalGST: data.tax || 0,
          gstNumber: data.gstNumber
        },
        totalTaxAmount: data.totalTaxAmount || data.tax || 0,
        totalAmount: data.totalAmount || 0,
        currency: data.currency || "INR",
        paymentId: data.paymentId,
        paymentMethod: data.paymentMethod,
        paymentDate: data.paymentDate,
        notes: data.notes,
        paymentLink: data.paymentLink,
        billingAddress: data.billingAddress,
        shippingAddress: data.shippingAddress,
        termsAndConditions: data.termsAndConditions,
        createdBy: data.createdBy,
        updatedBy: data.updatedBy
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

      console.log('[BILLING] Creating bill for appointment:', data.appointmentId);
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
        console.error('[BILLING] Failed to create bill:', errorText);
        throw new Error(`Failed to create bill: ${errorText}`);
      }

      const result = await response.json();
      console.log('[BILLING] Bill created successfully:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('[BILLING] Invalidating queries after bill creation:', data);
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error) => {
      console.error('[BILLING] Error in create bill mutation:', error);
    }
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