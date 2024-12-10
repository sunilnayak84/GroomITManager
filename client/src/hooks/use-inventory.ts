import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from "../lib/firebase";
import { toast } from "../lib/toast";
import { z } from "zod";

// Collection reference
const inventoryCollection = collection(db, 'inventory');

// Define schema for inventory items
export const inventoryItemSchema = z.object({
  item_id: z.string(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  quantity: z.number().min(0, "Quantity cannot be negative"),
  minimum_quantity: z.number().min(0, "Minimum quantity cannot be negative"),
  unit: z.string(),
  cost_per_unit: z.number().min(0, "Cost must be non-negative"),
  category: z.string(),
  supplier: z.string().optional(),
  last_restock_date: z.date().optional(),
  isActive: z.boolean().default(true),
  created_at: z.date(),
  updated_at: z.date().optional(),
});

export const inventoryUsageSchema = z.object({
  usage_id: z.string(),
  item_id: z.string(),
  quantity_used: z.number().min(0, "Usage quantity must be positive"),
  service_id: z.string().optional(),
  appointment_id: z.string().optional(),
  used_by: z.string(),
  used_at: z.date(),
  notes: z.string().optional(),
});

// Types based on schemas
export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type InventoryUsage = z.infer<typeof inventoryUsageSchema>;

export type InsertInventoryItem = Omit<InventoryItem, 'item_id' | 'created_at' | 'updated_at'>;
export type UpdateInventoryItem = Partial<Omit<InventoryItem, 'item_id' | 'created_at' | 'updated_at'>>;

export function useInventory() {
  const queryClient = useQueryClient();

  // Fetch inventory items with proper error handling and no suspense
  const { data: inventory = [], isLoading, error, ...rest } = useQuery({
    queryKey: ['inventory'],
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      try {
        console.log('FETCH_INVENTORY: Starting to fetch inventory items');
        const q = query(inventoryCollection);
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          console.log('FETCH_INVENTORY: No inventory items found');
          return [];
        }

        const items = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          try {
            return inventoryItemSchema.parse({
              item_id: doc.id,
              name: data.name || '',
              description: data.description,
              quantity: data.quantity || 0,
              minimum_quantity: data.minimum_quantity || 0,
              unit: data.unit || 'units',
              cost_per_unit: data.cost_per_unit || 0,
              category: data.category || 'uncategorized',
              supplier: data.supplier,
              last_restock_date: data.last_restock_date?.toDate(),
              isActive: data.isActive ?? true,
              created_at: data.created_at?.toDate() || new Date(),
              updated_at: data.updated_at?.toDate(),
            });
          } catch (parseError) {
            console.error('FETCH_INVENTORY: Error parsing item:', { id: doc.id, error: parseError });
            return null;
          }
        }).filter((item): item is InventoryItem => item !== null);

        console.log('FETCH_INVENTORY: Successfully fetched inventory', {
          count: items.length
        });

        return items;
      } catch (error) {
        console.error('FETCH_INVENTORY: Error fetching inventory:', error);
        throw error;
      }
    },
  });

  // Add inventory item
  const addInventoryItem = async (itemData: InsertInventoryItem) => {
    try {
      const docRef = doc(inventoryCollection);
      const timestamp = serverTimestamp();
      
      const firestoreData = {
        name: itemData.name,
        description: itemData.description,
        quantity: itemData.quantity,
        minimum_quantity: itemData.minimum_quantity,
        unit: itemData.unit,
        cost_per_unit: itemData.cost_per_unit,
        category: itemData.category,
        supplier: itemData.supplier,
        last_restock_date: itemData.last_restock_date,
        isActive: itemData.isActive,
        created_at: timestamp,
        updated_at: timestamp
      };

      await setDoc(docRef, firestoreData);
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item added to inventory');
      
      return {
        item_id: docRef.id,
        ...itemData,
        created_at: new Date(),
        updated_at: new Date()
      };
    } catch (error) {
      console.error('ADD_INVENTORY: Error adding item:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add inventory item');
      throw error;
    }
  };

  // Update inventory item
  const updateInventoryItem = async (item_id: string, updateData: UpdateInventoryItem) => {
    try {
      const itemRef = doc(inventoryCollection, item_id);
      const timestamp = serverTimestamp();
      
      const updatePayload = {
        ...updateData,
        updated_at: timestamp
      };

      await updateDoc(itemRef, updatePayload);
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Inventory item updated');
      return true;
    } catch (error) {
      console.error('UPDATE_INVENTORY: Error updating item:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update inventory item');
      throw error;
    }
  };

  // Delete inventory item
  const deleteInventoryItem = async (item_id: string) => {
    try {
      const itemRef = doc(inventoryCollection, item_id);
      await deleteDoc(itemRef);
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Inventory item deleted');
      return true;
    } catch (error) {
      console.error('DELETE_INVENTORY: Error deleting item:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete inventory item');
      throw error;
    }
  };

  // Track usage of inventory items
  const recordUsage = async (usageData: Omit<InventoryUsage, 'usage_id' | 'used_at'>) => {
    try {
      // First, check if we have enough quantity
      const itemRef = doc(inventoryCollection, usageData.item_id);
      const itemSnap = await getDoc(itemRef);
      
      if (!itemSnap.exists()) {
        throw new Error('Item not found');
      }
      
      const itemData = itemSnap.data();
      if (!itemData || itemData.quantity < usageData.quantity_used) {
        throw new Error('Insufficient quantity available');
      }

      // Record the usage
      const usageRef = doc(collection(db, 'inventory_usage'));
      const timestamp = new Date();
      
      const usage: InventoryUsage = {
        usage_id: usageRef.id,
        ...usageData,
        used_at: timestamp
      };

      await setDoc(usageRef, usage);

      // Update the inventory quantity
      await updateDoc(itemRef, {
        quantity: itemData.quantity - usageData.quantity_used,
        updated_at: serverTimestamp()
      });

      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Usage recorded successfully');
      return usage;
    } catch (error) {
      console.error('RECORD_USAGE: Error recording usage:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to record usage');
      return null;
    }
  };

  return {
    inventory,
    isLoading,
    error,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    recordUsage,
    ...rest
  };
}
