import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  collection, getDocs, doc, addDoc, updateDoc, 
  serverTimestamp, query, where, runTransaction,
  Timestamp 
} from 'firebase/firestore';
import { db } from "@/lib/firebase";
import { uploadFile } from "@/lib/storage";
import type { Reward, InsertReward, RewardRedemption } from "@/lib/reward-types";

// Collection references
const rewardsCollection = collection(db, 'rewards');
const redemptionsCollection = collection(db, 'reward_redemptions');

export function useRewards() {
  const queryClient = useQueryClient();

  // Fetch all active rewards
  const { data: rewards = [], isLoading, error } = useQuery({
    queryKey: ['rewards'],
    queryFn: async () => {
      const q = query(rewardsCollection, where('is_active', '==', true));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        reward_id: doc.id,
        ...doc.data(),
      })) as Reward[];
    }
  });

  // Add new reward
  const addRewardMutation = useMutation({
    mutationFn: async (rewardData: InsertReward) => {
      try {
        // Handle image upload if present
        let imageUrl = rewardData.image_url;
        if (imageUrl instanceof File) {
          const path = `rewards/${Date.now()}_${imageUrl.name}`;
          imageUrl = await uploadFile(imageUrl, path);
        }

        const docRef = await addDoc(rewardsCollection, {
          ...rewardData,
          image_url: imageUrl,
          created_at: serverTimestamp(),
          updated_at: null,
        });

        return { reward_id: docRef.id };
      } catch (error) {
        console.error('Error adding reward:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
    },
  });

  // Redeem reward
  const redeemRewardMutation = useMutation({
    mutationFn: async ({ 
      reward_id, 
      customer_id, 
      points_spent 
    }: { 
      reward_id: string; 
      customer_id: string; 
      points_spent: number; 
    }) => {
      const rewardRef = doc(rewardsCollection, reward_id);
      const customerRef = doc(db, 'customers', customer_id);

      await runTransaction(db, async (transaction) => {
        // Get reward and customer data
        const rewardDoc = await transaction.get(rewardRef);
        const customerDoc = await transaction.get(customerRef);

        if (!rewardDoc.exists() || !customerDoc.exists()) {
          throw new Error('Reward or customer not found');
        }

        const rewardData = rewardDoc.data() as Reward;
        const customerData = customerDoc.data();

        // Verify reward is available and customer has enough points
        if (rewardData.quantity_available <= 0) {
          throw new Error('Reward out of stock');
        }

        const currentPoints = customerData.pointsHistory.reduce(
          (total: number, record: { type: string; points: number; }) => 
            record.type === 'earned' ? total + record.points : total - record.points, 
          0
        );

        if (currentPoints < points_spent) {
          throw new Error('Insufficient points');
        }

        // Create redemption record
        const redemptionData: RewardRedemption = {
          reward_id,
          customer_id,
          points_spent,
          redemption_date: new Date(),
          status: 'completed',
          notes: null,
        };

        // Update reward quantity
        transaction.update(rewardRef, {
          quantity_available: rewardData.quantity_available - 1,
          updated_at: serverTimestamp(),
        });

        // Update customer points
        transaction.update(customerRef, {
          pointsHistory: [
            ...customerData.pointsHistory,
            {
              points: points_spent,
              type: 'redeemed',
              source: `Reward: ${rewardData.name}`,
              timestamp: new Date().toISOString(),
            },
          ],
        });

        // Create redemption record
        const redemptionRef = collection(db, 'reward_redemptions');
        transaction.set(doc(redemptionRef), redemptionData);
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
    redeemReward: redeemRewardMutation.mutateAsync,
  };
}
