import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { collection, getDocs } from 'firebase/firestore';
import { db } from "@/lib/firebase";

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  category: string;
  unit: string;
  minimum_quantity?: number; // Added optional fields for completeness
  cost_per_unit?: number;
  supplier?: string;
  description?: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInventory() {
      setIsLoading(true);
      setError(null);
      try {
        const querySnapshot = await getDocs(collection(db, 'inventory'));
        const inventoryItems = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as InventoryItem[];
        setItems(inventoryItems);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load inventory');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchInventory();
  }, []);

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">Manage your inventory items</p>
        </div>
        
        <Button> {/* Add Item button remains, but without functionality */}
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Unit</TableHead>
              {/* Added back columns for completeness */}
              <TableHead>Minimum Quantity</TableHead>
              <TableHead>Cost per Unit</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Description</TableHead>

            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4">
                  Loading inventory...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4">
                  No inventory items found
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>{item.minimum_quantity ?? '-'}</TableCell>
                  <TableCell>{item.cost_per_unit ? `$${item.cost_per_unit.toFixed(2)}` : '-'}</TableCell>
                  <TableCell>{item.supplier ?? '-'}</TableCell>
                  <TableCell>{item.description ?? '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}