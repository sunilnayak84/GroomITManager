
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useLoyalty } from './use-loyalty';

export function useCustomerLoyalty() {
  const queryClient = useQueryClient();
  const { config } = useLoyalty();

  const calculatePointsForAmount = (amount: number) => {
    if (!config) return 0;
    return Math.floor(amount * config.pointsPerRupee);
  };

  const calculateDiscountForPoints = (points: number) => {
    if (!config) return 0;
    return Math.floor(points * config.redemptionRatePerPoint);
  };

  const addPoints = useMutation({
    mutationFn: async ({ 
      customerId, 
      amount,
      appointmentId 
    }: { 
      customerId: string; 
      amount: number;
      appointmentId: string;
    }) => {
      const points = calculatePointsForAmount(amount);
      const customerRef = doc(db, 'customers', customerId);
      
      await updateDoc(customerRef, {
        loyaltyPoints: points,
        pointsHistory: arrayUnion({
          points,
          type: "earned",
          appointmentId,
          timestamp: new Date().toISOString(),
          description: `Earned ${points} points for appointment`
        })
      });

      return points;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    }
  });

  const redeemPoints = useMutation({
    mutationFn: async ({ 
      customerId, 
      points,
      appointmentId 
    }: { 
      customerId: string; 
      points: number;
      appointmentId: string;
    }) => {
      if (!config) throw new Error('Loyalty config not loaded');
      
      const customerRef = doc(db, 'customers', customerId);
      
      await updateDoc(customerRef, {
        loyaltyPoints: points * -1,
        pointsHistory: arrayUnion({
          points: points * -1,
          type: "redeemed",
          appointmentId,
          timestamp: new Date().toISOString(),
          description: `Redeemed ${points} points for discount`
        })
      });

      return calculateDiscountForPoints(points);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    }
  });

  return {
    addPoints: addPoints.mutateAsync,
    redeemPoints: redeemPoints.mutateAsync,
    calculatePointsForAmount,
    calculateDiscountForPoints,
    isAddingPoints: addPoints.isPending,
    isRedeemingPoints: redeemPoints.isPending
  };
}
