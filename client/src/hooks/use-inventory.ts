import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, serverTimestamp } from 'firebase/firestore';
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

  // Fetch inventory items
  const { data: inventory = [], isLoading, ...rest } = useQuery<InventoryItem[]>({
    queryKey: ['inventory'],
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
          return inventoryItemSchema.parse({
            item_id: doc.id,
            name: data.name,
            description: data.description,
            quantity: data.quantity,
            minimum_quantity: data.minimum_quantity,
            unit: data.unit,
            cost_per_unit: data.cost_per_unit,
            category: data.category,
            supplier: data.supplier,
            last_restock_date: data.last_restock_date?.toDate(),
            isActive: data.isActive ?? true,
            created_at: data.created_at.toDate(),
            updated_at: data.updated_at?.toDate(),
          });
        });

        console.log('FETCH_INVENTORY: Completed fetching inventory', {
          count: items.length,
          items: items.map(item => ({
            id: item.item_id,
            name: item.name,
            quantity: item.quantity
          }))
        });

        return items;
      } catch (error) {
        console.error('FETCH_INVENTORY: Error fetching inventory:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  // Add inventory item
  const addInventoryItem = async (itemData: InsertInventoryItem) => {
    try {
      const docRef = doc(inventoryCollection);
      const timestamp = new Date().toISOString();
      
      const newItem: InventoryItem = {
        item_id: docRef.id,
        ...itemData,
        created_at: new Date(timestamp),
        updated_at: new Date(timestamp)
      };

      const firestoreData = {
        name: newItem.name,
        description: newItem.description,
        quantity: newItem.quantity,
        minimum_quantity: newItem.minimum_quantity,
        unit: newItem.unit,
        cost_per_unit: newItem.cost_per_unit,
        category: newItem.category,
        supplier: newItem.supplier,
        last_restock_date: newItem.last_restock_date,
        isActive: newItem.isActive,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };

      await setDoc(docRef, firestoreData);
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item added to inventory');
      return newItem;
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
      const timestamp = new Date().toISOString();
      
      const updatePayload = {
        ...updateData,
        updated_at: serverTimestamp()
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
  const deleteInventoryItem = async (id: string) => {
    try {
      const itemRef = doc(inventoryCollection, id);
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
      const itemSnap = await getDocs(query(inventoryCollection, doc(usageData.item_id)));
      const itemData = itemSnap.docs[0]?.data();
      
      if (!itemData || itemData.quantity < usageData.quantity_used) {
        throw new Error('Insufficient quantity available');
      }

      // Record the usage
      const usageRef = doc(collection(db, 'inventory_usage'));
      const timestamp = new Date().toISOString();
      
      const usage: InventoryUsage = {
        usage_id: usageRef.id,
        ...usageData,
        used_at: new Date(timestamp)
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
      throw error;
    }
  };

  return {
    inventory,
    isLoading,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    recordUsage,
    ...rest
  };
}
