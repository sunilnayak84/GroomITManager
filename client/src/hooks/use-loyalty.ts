
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { LoyaltyConfig } from '@/lib/schema';

export function useLoyalty() {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['loyalty-config'],
    queryFn: async () => {
      const docRef = doc(db, 'settings', 'loyalty');
      const snapshot = await getDoc(docRef);
      return snapshot.data() as LoyaltyConfig;
    }
  });

  const updateConfig = useMutation({
    mutationFn: async (newConfig: LoyaltyConfig) => {
      const docRef = doc(db, 'settings', 'loyalty');
      await setDoc(docRef, newConfig);
      return newConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-config'] });
    }
  });

  return {
    config,
    isLoading,
    updateConfig: updateConfig.mutateAsync
  };
}
