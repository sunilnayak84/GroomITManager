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
import { useInventory } from "@/hooks/use-inventory";
import { ErrorBoundary } from "react-error-boundary";

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="p-4">
      <div className="text-red-500">Error: {error.message}</div>
    </div>
  );
}

export default function InventoryPage() {
  const { inventory, isLoading, error } = useInventory();
  
  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-500">
          Error loading inventory: {error instanceof Error ? error.message : 'Unknown error occurred'}
        </div>
      </div>
    );
  }

  // Ensure type safety with inventory data
  const inventoryData = inventory || [];

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">Manage your inventory items</p>
        </div>
        
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit</TableHead>
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
                    <div className="flex items-center justify-center space-x-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      <span>Loading inventory...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : !inventory || inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-4">
                    No inventory items found
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((item) => (
                  <TableRow key={item.item_id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>{item.minimum_quantity}</TableCell>
                    <TableCell>
                      {item.cost_per_unit ? `$${item.cost_per_unit.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>{item.supplier ?? '-'}</TableCell>
                    <TableCell>{item.description ?? '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ErrorBoundary>
    </div>
  );
}
