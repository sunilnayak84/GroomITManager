import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bill, BillCreateInput, BillStatus } from '@/types/billing';
import { useFirebaseAuth } from '@/hooks/use-firebase-auth';
import { useUser } from '@/hooks/use-user';
import { useToast } from './use-toast';

// This file has been completely rewritten for the new billing system

export function useBilling() {
  const queryClient = useQueryClient();
  const { getIdToken } = useFirebaseAuth();
  const { user } = useUser();
  const { toast } = useToast();

  // Fetch all bills
  const fetchBills = async (): Promise<Bill[]> => {
    if (!user) {
      console.log('[BILLING] No user found, skipping fetch');
      return [];
    }

    try {
      const idToken = await getIdToken();
      const apiBaseUrl = import.meta.env.VITE_API_URL || window.location.origin;
      
      console.log('[BILLING] Fetching bills...');
      const response = await fetch(`${apiBaseUrl}/api/billing/bills`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[BILLING] Failed to fetch bills:', errorText);
        throw new Error(`Failed to fetch bills: ${response.status}`);
      }

      const data = await response.json();
      console.log('[BILLING] Successfully fetched bills response:', data);
      
      // Handle both {bills: [...]} and [...] response formats
      const bills = Array.isArray(data) ? data : (data.bills || []);
      console.log('[BILLING] Processed bills array:', bills.length);
      return bills;
    } catch (error) {
      console.error('[BILLING] Error fetching bills:', error);
      throw error;
    }
  };

  // Fetch single bill by ID
  const fetchBillById = async (billId: string): Promise<Bill | null> => {
    if (!user) return null;

    try {
      const idToken = await getIdToken();
      const apiBaseUrl = import.meta.env.VITE_API_URL || window.location.origin;
      
      console.log('[BILLING] Fetching bill by ID:', billId);
      const response = await fetch(`${apiBaseUrl}/api/billing/bills/${billId}`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log('[BILLING] Bill not found:', billId);
          return null;
        }
        throw new Error(`Failed to fetch bill: ${response.status}`);
      }

      const bill = await response.json();
      console.log('[BILLING] Successfully fetched bill:', bill.id);
      return bill;
    } catch (error) {
      console.error('[BILLING] Error fetching bill:', error);
      throw error;
    }
  };

  // Bills query
  const billsQuery = useQuery<Bill[]>({
    queryKey: ['bills'],
    queryFn: fetchBills,
    enabled: !!user,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  // Bill by ID query factory
  const useBillQuery = (billId: string | null) => {
    return useQuery<Bill | null>({
      queryKey: ['bill', billId],
      queryFn: () => billId ? fetchBillById(billId) : Promise.resolve(null),
      enabled: !!user && !!billId,
      staleTime: 60000, // 1 minute
      refetchOnWindowFocus: false,
    });
  };

  // Delete bill mutation (admin only)
  const deleteBillMutation = useMutation({
    mutationFn: async (billId: string) => {
      if (!user) {
        throw new Error('Authentication required');
      }

      const idToken = await getIdToken();
      const apiBaseUrl = import.meta.env.VITE_API_URL || window.location.origin;
      
      console.log('[BILLING] Deleting bill:', billId);
      const response = await fetch(`${apiBaseUrl}/api/billing/bills/${billId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[BILLING] Failed to delete bill:', errorText);
        throw new Error(`Failed to delete bill: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[BILLING] Successfully deleted bill:', result);
      return result;
    },
    onSuccess: () => {
      // Invalidate bills query to refetch data
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast({
        title: "Bill Deleted",
        description: "Bill has been deleted successfully",
      });
    },
    onError: (error) => {
      console.error('[BILLING] Error deleting bill:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete bill",
        variant: "destructive",
      });
    },
  });

  // Create bill mutation
  const createBillMutation = useMutation({
    mutationFn: async (input: BillCreateInput) => {
      if (!user) throw new Error('User not authenticated');

      const idToken = await getIdToken();
      const apiBaseUrl = import.meta.env.VITE_API_URL || window.location.origin;

      console.log('[BILLING] Creating bill for appointment:', input.appointmentId);
      const response = await fetch(`${apiBaseUrl}/api/billing/bills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[BILLING] Failed to create bill:', errorText);
        throw new Error(`Failed to create bill: ${errorText}`);
      }

      const result = await response.json();
      console.log('[BILLING] Bill created successfully:', result.id);
      return result;
    },
    onSuccess: (bill) => {
      toast({
        title: "Bill Created",
        description: `Bill #${bill.billNumber || bill.id.slice(0, 8)} has been created successfully.`,
      });
      
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error: Error) => {
      console.error('[BILLING] Error creating bill:', error);
      toast({
        title: "Error Creating Bill",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update bill mutation
  const updateBillMutation = useMutation({
    mutationFn: async ({ billId, updates }: { billId: string; updates: Partial<Bill> }) => {
      if (!user) throw new Error('User not authenticated');

      const idToken = await getIdToken();
      const apiBaseUrl = import.meta.env.VITE_API_URL || window.location.origin;

      console.log('[BILLING] Updating bill:', billId);
      const response = await fetch(`${apiBaseUrl}/api/billing/bills/${billId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[BILLING] Failed to update bill:', errorText);
        throw new Error(`Failed to update bill: ${errorText}`);
      }

      const result = await response.json();
      console.log('[BILLING] Bill updated successfully:', result.id);
      return result;
    },
    onSuccess: (bill) => {
      toast({
        title: "Bill Updated",
        description: `Bill #${bill.billNumber || bill.id.slice(0, 8)} has been updated.`,
      });
      
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['bill', bill.id] });
    },
    onError: (error: Error) => {
      console.error('[BILLING] Error updating bill:', error);
      toast({
        title: "Error Updating Bill",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return {
    // Data
    bills: billsQuery.data || [],
    isLoading: billsQuery.isLoading,
    isError: billsQuery.isError,
    error: billsQuery.error,
    
    // Actions
    createBill: createBillMutation.mutateAsync,
    updateBill: updateBillMutation.mutateAsync,
    deleteBill: deleteBillMutation.mutateAsync,
    refetch: billsQuery.refetch,
    
    // Utilities
    useBillQuery,
    isCreating: createBillMutation.isPending,
    isUpdating: updateBillMutation.isPending,
    isDeleting: deleteBillMutation.isPending,
    getBillById: fetchBillById,
  };
}

// Helper function to format Indian currency
export function formatIndianCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Helper function to calculate GST
export function calculateGST(amount: number, gstRate: number = 18, isInterState: boolean = false) {
  const gstAmount = (amount * gstRate) / 100;
  
  if (isInterState) {
    return {
      cgst: 0,
      sgst: 0,
      igst: gstAmount,
      totalGST: gstAmount,
    };
  } else {
    return {
      cgst: gstAmount / 2,
      sgst: gstAmount / 2,
      igst: 0,
      totalGST: gstAmount,
    };
  }
}

// Helper function to calculate discount
export function calculateDiscount(
  amount: number, 
  discount: { type: 'PERCENTAGE' | 'FIXED_AMOUNT'; value: number; maxAmount?: number }
): number {
  if (discount.type === 'PERCENTAGE') {
    const discountAmount = (amount * discount.value) / 100;
    return discount.maxAmount ? Math.min(discountAmount, discount.maxAmount) : discountAmount;
  } else {
    return Math.min(discount.value, amount);
  }
}