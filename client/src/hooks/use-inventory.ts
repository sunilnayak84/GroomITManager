import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection, doc, getDocs, updateDoc, setDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, getDoc, Timestamp 
} from 'firebase/firestore';
import { toast } from "@/components/ui/use-toast";
import { z } from "zod";
import { db } from "../lib/firebase";

// Collection references
const inventoryCollection = collection(db, 'inventory');
const usageHistoryCollection = collection(db, 'inventory_usage_history');

// Helper function to get service name from service ID
async function getServiceName(serviceId: string): Promise<string | undefined> {
  try {
    const serviceDoc = await getDoc(doc(db, 'services', serviceId));
    if (serviceDoc.exists()) {
      return serviceDoc.data()?.name;
    }
    return undefined;
  } catch (error) {
    console.error('Error fetching service name:', error);
    return undefined;
  }
}
// Helper to format date for Firestore
const formatDate = (date: Date) => {
  return {
    toFirestore: () => date,
    fromFirestore: (snapshot: any) => snapshot.toDate(),
  };
};

// Define schema for inventory items
export const inventoryItemSchema = z.object({
  item_id: z.string(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().nullable().default(null),
  quantity: z.number().min(0, "Quantity cannot be negative").default(0),
  minimum_quantity: z.number().min(0, "Minimum quantity cannot be negative").default(0),
  unit: z.string().min(1, "Unit is required"),
  cost_per_unit: z.number().min(0, "Cost must be non-negative").default(0),
  category: z.string().min(1, "Category is required"),
  supplier: z.string().nullable().default(null),
  last_restock_date: z.union([z.date(), z.null()]).nullable().default(null),
  isActive: z.boolean().default(true),
  quantity_per_use: z.number().min(0, "Quantity per use must be non-negative").default(1),
  service_linked: z.boolean().default(false),
  reorder_point: z.number().min(0, "Reorder point cannot be negative").default(0),
  reorder_quantity: z.number().min(0, "Reorder quantity cannot be negative").default(0),
  location: z.string().nullable().default(null),
  barcode: z.string().nullable().default(null),
  created_at: z.date(),
  updated_at: z.date().nullable(),
});

export const inventoryUsageHistorySchema = z.object({
  usage_id: z.string(),
  item_id: z.string(),
  quantity_used: z.number().min(0, "Usage quantity must be positive"),
  service_id: z.string().optional(),
  appointment_id: z.string().optional(),
  used_by: z.string(),
  used_at: z.date(),
  notes: z.string().optional(),
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
  auto_deducted: z.boolean().default(false),
  service_linked: z.boolean().default(false),
  service_name: z.string().optional(),
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
          console.log('FETCH_INVENTORY: Processing item data:', { id: doc.id, data });
          try {
            const parsedData = {
              item_id: doc.id,
              name: data.name || '',
              description: data.description || null,
              quantity: Number(data.quantity) || 0,
              minimum_quantity: Number(data.minimum_quantity) || 0,
              unit: data.unit || 'units',
              cost_per_unit: Number(data.cost_per_unit) || 0,
              category: data.category || 'uncategorized',
              supplier: data.supplier || null,
              last_restock_date: data.last_restock_date ? 
                (data.last_restock_date instanceof Timestamp ? 
                  data.last_restock_date.toDate() : 
                  new Date(data.last_restock_date)
                ) : null,
              isActive: data.isActive ?? true,
              location: data.location || null,
              barcode: data.barcode || null,
              quantity_per_use: Number(data.quantity_per_use) || 1,
              service_linked: data.service_linked ?? false,
              reorder_point: Number(data.reorder_point) || 0,
              reorder_quantity: Number(data.reorder_quantity) || 0,
              created_at: data.created_at ? 
                (data.created_at instanceof Timestamp ? 
                  data.created_at.toDate() : 
                  new Date(data.created_at)
                ) : new Date(),
              updated_at: data.updated_at ? 
                (data.updated_at instanceof Timestamp ? 
                  data.updated_at.toDate() : 
                  new Date(data.updated_at)
                ) : null,
            };
            const validatedItem = inventoryItemSchema.parse(parsedData);
            console.log('FETCH_INVENTORY: Successfully parsed item:', { id: doc.id, item: validatedItem });
            return validatedItem;
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
      console.log('ADD_INVENTORY: Starting to add item:', itemData);
      
      // Validate the data before proceeding
      const validationResult = inventoryItemSchema.omit({ 
        item_id: true, 
        created_at: true, 
        updated_at: true 
      }).safeParse({
        ...itemData,
        quantity: Number(itemData.quantity),
        minimum_quantity: Number(itemData.minimum_quantity),
        cost_per_unit: Number(itemData.cost_per_unit),
        reorder_point: Number(itemData.reorder_point || 0),
        reorder_quantity: Number(itemData.reorder_quantity || 0)
      });

      if (!validationResult.success) {
        console.error('ADD_INVENTORY: Validation failed:', validationResult.error);
        throw new Error(validationResult.error.errors[0].message);
      }

      const docRef = doc(inventoryCollection);
      const timestamp = serverTimestamp();
      
      const firestoreData = {
        name: itemData.name.trim(),
        description: itemData.description?.trim() || null,
        quantity: Number(itemData.quantity),
        minimum_quantity: Number(itemData.minimum_quantity),
        unit: itemData.unit.trim(),
        cost_per_unit: Number(itemData.cost_per_unit),
        category: itemData.category.trim(),
        supplier: itemData.supplier?.trim() || null,
        last_restock_date: itemData.last_restock_date || null,
        isActive: itemData.isActive ?? true,
        quantity_per_use: Number(itemData.quantity_per_use || 1),
        service_linked: itemData.service_linked ?? false,
        reorder_point: Number(itemData.reorder_point || 0),
        reorder_quantity: Number(itemData.reorder_quantity || 0),
        location: itemData.location?.trim() || null,
        barcode: itemData.barcode?.trim() || null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };

      console.log('ADD_INVENTORY: Formatted data for Firestore:', firestoreData);

      console.log('ADD_INVENTORY: Saving item to Firestore:', firestoreData);
      await setDoc(docRef, firestoreData);
      
      // Check if stock is low after adding
      if (firestoreData.quantity <= firestoreData.minimum_quantity) {
        toast({
          title: "Low Stock Alert",
          description: `${firestoreData.name} is below minimum quantity`,
          variant: "destructive"
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({
        title: "Success",
        description: "Item added to inventory",
        variant: "default"
      });
      
      return {
        item_id: docRef.id,
        ...firestoreData,
        created_at: new Date(),
        updated_at: new Date()
      };
    } catch (error) {
      console.error('ADD_INVENTORY: Error adding item:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to add inventory item',
        variant: "destructive"
      });
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
      toast({
        title: "Success",
        description: "Inventory item updated",
        variant: "default"
      });
      return true;
    } catch (error) {
      console.error('UPDATE_INVENTORY: Error updating item:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update inventory item',
        variant: "destructive"
      });
      throw error;
    }
  };

  // Delete inventory item
  const deleteInventoryItem = async (item_id: string) => {
    try {
      const itemRef = doc(inventoryCollection, item_id);
      await deleteDoc(itemRef);
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({
        title: "Success",
        description: "Inventory item deleted",
        variant: "default"
      });
      return true;
    } catch (error) {
      console.error('DELETE_INVENTORY: Error deleting item:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete inventory item',
        variant: "destructive"
      });
      throw error;
    }
  };

  // Track usage of inventory items
  const recordUsage = async (usageData: Omit<InventoryUsage, 'usage_id' | 'used_at'>) => {
    try {
      console.log('RECORD_USAGE: Starting usage recording:', usageData);
      
      // First, check if we have enough quantity
      const itemRef = doc(inventoryCollection, usageData.item_id);
      const itemSnap = await getDoc(itemRef);
      
      if (!itemSnap.exists()) {
        throw new Error('Item not found');
      }
      
      const itemData = itemSnap.data();
      if (!itemData) {
        throw new Error('Invalid item data');
      }

      const currentQuantity = Number(itemData.quantity) || 0;
      const minimumQuantity = Number(itemData.minimum_quantity) || 0;
      const reorderPoint = Number(itemData.reorder_point) || 0;
      const reorderQuantity = Number(itemData.reorder_quantity) || 0;
      const isTracked = itemData.track_inventory ?? true;
      const autoDeduct = itemData.auto_deduct ?? true;
      
      console.log('RECORD_USAGE: Item details:', {
        currentQuantity,
        minimumQuantity,
        reorderPoint,
        isTracked,
        autoDeduct
      });

      // If item is not tracked or auto-deduct is disabled, skip quantity checks
      if (!isTracked || !autoDeduct) {
        console.log('RECORD_USAGE: Item is not tracked or auto-deduct disabled, skipping quantity checks');
        return null;
      }

      if (currentQuantity < usageData.quantity_used) {
        throw new Error(`Insufficient quantity available. Current stock: ${currentQuantity} ${itemData.unit}`);
      }

      // Record the usage with service information if available
      const usageRef = doc(collection(db, 'inventory_usage'));
      const timestamp = new Date();
      
      const usage: InventoryUsage = {
        usage_id: usageRef.id,
        ...usageData,
        used_at: timestamp,
        auto_deducted: true,
        service_linked: !!usageData.service_id,
        service_name: usageData.service_id ? await getServiceName(usageData.service_id) : undefined
      };

      console.log('RECORD_USAGE: Recording usage:', usage);
      await setDoc(usageRef, usage);

      // Calculate new quantity
      const newQuantity = currentQuantity - usageData.quantity_used;

      // Update the inventory quantity
      const updateData: Record<string, any> = {
        quantity: newQuantity,
        updated_at: serverTimestamp(),
        last_used: timestamp,
        service_linked: usage.service_linked || false
      };

      console.log('RECORD_USAGE: Updating inventory:', updateData);
      await updateDoc(itemRef, updateData);

      // Check stock levels and show appropriate alerts
      if (newQuantity <= minimumQuantity) {
        toast({
          title: "Critical Stock Alert",
          description: `${itemData.name} is below minimum quantity (${newQuantity} ${itemData.unit} remaining). Suggested reorder: ${reorderQuantity} ${itemData.unit}`,
          variant: "destructive"
        });
      } else if (newQuantity <= reorderPoint) {
        const suggestedQuantity = reorderQuantity || Math.max(minimumQuantity * 2, currentQuantity);
        toast({
          title: "Low Stock Alert",
          description: `${itemData.name} has reached reorder point (${newQuantity} ${itemData.unit} remaining). Suggested reorder: ${suggestedQuantity} ${itemData.unit}`,
          variant: "default"
        });
      }

      // If auto-reorder is enabled and stock is low, create a reorder suggestion
      if (itemData.auto_reorder && newQuantity <= reorderPoint) {
        console.log('RECORD_USAGE: Creating reorder suggestion');
        const reorderRef = doc(collection(db, 'inventory_reorders'));
        await setDoc(reorderRef, {
          item_id: usageData.item_id,
          item_name: itemData.name,
          current_quantity: newQuantity,
          suggested_quantity: reorderQuantity || Math.max(minimumQuantity * 2, currentQuantity),
          unit: itemData.unit,
          created_at: serverTimestamp(),
          status: 'pending',
          service_linked: usage.service_linked,
          service_name: usage.service_name
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({
        title: "Success",
        description: `Usage recorded successfully. New stock level: ${newQuantity} ${itemData.unit}`,
        variant: "default"
      });
      
      // Also invalidate the usage history
      await queryClient.invalidateQueries({ 
        queryKey: ['inventory', 'usage-history', usageData.item_id]
      });
      
      return usage;
    } catch (error) {
      console.error('RECORD_USAGE: Error recording usage:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to record usage',
        variant: "destructive"
      });
      throw error;
    }
  };

  // Fetch usage history for an item using React Query
  const getUsageHistory = (itemId: string | undefined) => {
    return useQuery({
      queryKey: ['inventory', 'usage-history', itemId],
      enabled: !!itemId,
      staleTime: 1000 * 60 * 5, // 5 minutes
      queryFn: async () => {
        if (!itemId) return [];
        try {
          console.log('FETCH_USAGE_HISTORY: Starting fetch for item:', itemId);
          const q = query(
            collection(db, 'inventory_usage_history'),
            where('item_id', '==', itemId),
            orderBy('used_at', 'desc')
          );
          
          const snapshot = await getDocs(q);
          const history = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              usage_id: doc.id,
              item_id: data.item_id,
              quantity_used: Number(data.quantity_used),
              used_by: data.used_by,
              service_id: data.service_id,
              appointment_id: data.appointment_id,
              notes: data.notes,
              used_at: data.used_at instanceof Timestamp ? 
                data.used_at.toDate() : 
                new Date(data.used_at),
            };
          });
          
          console.log('FETCH_USAGE_HISTORY: Successfully fetched history:', history);
          return history;
        } catch (error) {
          console.error('FETCH_USAGE_HISTORY: Error fetching history:', error);
          throw error;
        }
      }
    });
  };

  return {
    inventory,
    isLoading,
    error,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    recordUsage,
    getUsageHistory,
    ...rest
  };
}