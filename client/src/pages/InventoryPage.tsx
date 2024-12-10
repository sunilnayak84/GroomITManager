import { Plus, Search, Edit, Trash2, History, Package, AlertTriangle, Droplets } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useInventory, type InsertInventoryItem } from "@/hooks/use-inventory";
import { ConsumablesUsageModal } from "@/components/ConsumablesUsageModal";
import { ErrorBoundary } from "react-error-boundary";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inventoryItemSchema } from "@/hooks/use-inventory";
import { toast } from "@/components/ui/use-toast";

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="p-4 rounded-md bg-red-50 border border-red-200">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <div className="text-red-700">Error: {error.message}</div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<string | null>(null);
  const [usageHistory, setUsageHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const { inventory, isLoading, error, addInventoryItem, updateInventoryItem, deleteInventoryItem, recordUsage, getUsageHistory } = useInventory();

  // Fetch usage history when an item is selected
  const handleViewHistory = async (itemId: string) => {
    setSelectedHistoryItem(itemId);
    setIsLoadingHistory(true);
    try {
      const history = await getUsageHistory(itemId);
      setUsageHistory(history);
    } catch (error) {
      console.error('Error fetching usage history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch usage history",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const form = useForm<InsertInventoryItem>({
    resolver: zodResolver(inventoryItemSchema.omit({ item_id: true, created_at: true, updated_at: true })),
    defaultValues: {
      name: "",
      description: "",
      quantity: 0,
      minimum_quantity: 0,
      unit: "units",
      cost_per_unit: 0,
      category: "uncategorized",
      supplier: "",
      isActive: true,
      last_restock_date: undefined,
    },
  });

  async function onSubmit(data: InsertInventoryItem) {
    try {
      await addInventoryItem(data);
      setOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Item added to inventory successfully",
        variant: "default",
      });
    } catch (error) {
      console.error('Error adding inventory item:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add inventory item",
        variant: "destructive",
      });
    }
  }

  // Filter inventory items based on search query
  const filteredInventory = inventory?.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.supplier?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <ErrorFallback error={error instanceof Error ? error : new Error('Unknown error occurred')} />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="relative h-48 rounded-xl overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1587293852726-70cdb56c2866"
          alt="Inventory Management"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent flex items-center p-8">
          <div className="text-white">
            <h2 className="text-2xl font-bold">Inventory Management</h2>
            <p>Track stock levels and manage consumables</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inventory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="h-12">
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Inventory Item</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={e => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="minimum_quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={e => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cost_per_unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost per Unit</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={e => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">Add Item</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <div className="rounded-xl border bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock Status</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Cost per Unit</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      <span>Loading inventory...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Package className="h-8 w-8 mb-2" />
                      <p>No inventory items found</p>
                      {searchQuery && <p className="text-sm">Try adjusting your search</p>}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map((item) => (
                  <TableRow key={item.item_id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.quantity <= item.minimum_quantity ? (
                          <div className="flex items-center text-red-500">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Low Stock
                          </div>
                        ) : (
                          <div className="text-green-500">In Stock</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.quantity} {item.unit}
                    </TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>${item.cost_per_unit.toFixed(2)}</TableCell>
                    <TableCell>{item.supplier || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog open={selectedHistoryItem === item.item_id} onOpenChange={(open) => {
                          if (open) {
                            handleViewHistory(item.item_id);
                          } else {
                            setSelectedHistoryItem(null);
                            setUsageHistory([]);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="View Usage History">
                              <History className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Usage History - {item.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Quantity Used</TableHead>
                                    <TableHead>Used By</TableHead>
                                    <TableHead>Service</TableHead>
                                    <TableHead>Notes</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {isLoadingHistory ? (
                                    <TableRow>
                                      <TableCell colSpan={5} className="text-center py-4">
                                        <div className="flex items-center justify-center space-x-2">
                                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                          <span>Loading history...</span>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ) : usageHistory.length === 0 ? (
                                    <TableRow>
                                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                                        No usage history available
                                      </TableCell>
                                    </TableRow>
                                  ) : (
                                    usageHistory.map((usage) => (
                                      <TableRow key={usage.usage_id}>
                                        <TableCell>{new Date(usage.used_at).toLocaleDateString()}</TableCell>
                                        <TableCell>{usage.quantity_used} {item.unit}</TableCell>
                                        <TableCell>{usage.used_by}</TableCell>
                                        <TableCell>{usage.service_id || '-'}</TableCell>
                                        <TableCell>{usage.notes || '-'}</TableCell>
                                      </TableRow>
                                    ))
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Record Usage"
                          onClick={() => setSelectedItem({
                            id: item.item_id,
                            name: item.name,
                            quantity: item.quantity,
                            unit: item.unit,
                          })}
                        >
                          <Droplets className="h-4 w-4" />
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Edit Item">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Inventory Item</DialogTitle>
                            </DialogHeader>
                            {/* We'll implement the edit form later */}
                            <div>Edit form will go here</div>
                          </DialogContent>
                        </Dialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-red-500" title="Delete Item">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {item.name}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteInventoryItem(item.item_id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ErrorBoundary>

      {/* Consumables Usage Modal */}
      {selectedItem && (
        <ConsumablesUsageModal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          itemId={selectedItem.id}
          itemName={selectedItem.name}
          currentQuantity={selectedItem.quantity}
          unit={selectedItem.unit}
        />
      )}
    </div>
  );
}
