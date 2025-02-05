import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  collection, getDocs, doc, addDoc, updateDoc, 
  serverTimestamp, query, where, runTransaction,
  Timestamp 
} from 'firebase/firestore';
import { db } from "@/lib/firebase";
import { uploadFile } from "@/lib/storage";
import type { Reward, InsertReward } from "@/lib/types/reward";

// Collection references
const rewardsCollection = collection(db, 'rewards');

export function useRewards() {
  const queryClient = useQueryClient();

  // Fetch all active rewards
  const { data: rewards = [], isLoading, error } = useQuery({
    queryKey: ['rewards'],
    queryFn: async () => {
      const q = query(rewardsCollection, where('isActive', '==', true));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate()?.toISOString() || null,
        validUntil: doc.data().validUntil?.toDate()?.toISOString() || null,
        image: doc.data().image || null,
      })) as Reward[];
    }
  });

  // Add new reward
  const addRewardMutation = useMutation({
    mutationFn: async (rewardData: InsertReward) => {
      try {
        // Handle image upload if present
        let imageUrl = rewardData.image;
        if (imageUrl instanceof File) {
          const path = `rewards/${Date.now()}_${imageUrl.name}`;
          imageUrl = await uploadFile(imageUrl, path);
        }

        const docRef = await addDoc(rewardsCollection, {
          ...rewardData,
          image: imageUrl,
          createdAt: serverTimestamp(),
          updatedAt: null,
          isActive: true
        });

        return { id: docRef.id };
      } catch (error) {
        console.error('Error adding reward:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
    },
  });

  // Update reward
  const updateRewardMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertReward> }) => {
      const rewardRef = doc(rewardsCollection, id);
      await updateDoc(rewardRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
    },
  });

  // Redeem reward
  const redeemRewardMutation = useMutation({
    mutationFn: async ({ 
      rewardId, 
      customerId,
      pointsSpent 
    }: { 
      rewardId: string; 
      customerId: string;
      pointsSpent: number;
    }) => {
      const rewardRef = doc(rewardsCollection, rewardId);
      const customerRef = doc(db, 'customers', customerId);

      await runTransaction(db, async (transaction) => {
        // Get reward and customer data
        const rewardDoc = await transaction.get(rewardRef);
        const customerDoc = await transaction.get(customerRef);

        if (!rewardDoc.exists() || !customerDoc.exists()) {
          throw new Error('Reward or customer not found');
        }

        const rewardData = rewardDoc.data() as Reward;
        const customerData = customerDoc.data();

        // Verify reward is available
        if (rewardData.quantity !== undefined && rewardData.quantity <= 0) {
          throw new Error('Reward out of stock');
        }

        // Calculate current points
        const currentPoints = customerData.pointsHistory.reduce(
          (total: number, record: { type: string; points: number; }) => 
            record.type === 'earned' ? total + record.points : total - record.points, 
          0
        );

        if (currentPoints < pointsSpent) {
          throw new Error('Insufficient points');
        }

        // Update reward quantity if applicable
        if (rewardData.quantity !== undefined) {
          transaction.update(rewardRef, {
            quantity: rewardData.quantity - 1,
            updatedAt: serverTimestamp(),
          });
        }

        // Update customer points
        transaction.update(customerRef, {
          pointsHistory: [
            ...customerData.pointsHistory,
            {
              points: pointsSpent,
              type: 'redeemed',
              source: `Reward: ${rewardData.title}`,
              timestamp: new Date().toISOString(),
            }
          ],
          updatedAt: serverTimestamp()
        });

        // Create redemption record
        const redemptionRef = collection(db, 'reward_redemptions');
        transaction.set(doc(redemptionRef), {
          rewardId,
          customerId,
          pointsSpent,
          redemptionDate: serverTimestamp(),
          status: 'completed',
          notes: null,
        });
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  return {
    rewards,
    isLoading,
    error,
    addReward: addRewardMutation.mutateAsync,
    updateReward: updateRewardMutation.mutateAsync,
    redeemReward: redeemRewardMutation.mutateAsync,
  };
}