import React, { useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Plus, Trash2, Edit, History } from "lucide-react";
import { useInventory } from "@/hooks/use-inventory";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ConsumablesUsageModal } from "@/components/ConsumablesUsageModal";
import { InventoryUsageHistory } from "@/components/InventoryUsageHistory";
import { 
  InventoryItem, 
  InsertInventoryItem, 
  insertInventoryItemSchema 
} from "@/lib/inventory-types";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface SelectedItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export default function InventoryPage() {
  const { 
    inventory, 
    isLoading, 
    addInventoryItem, 
    updateInventoryItem, 
    deleteInventoryItem, 
    getUsageHistory 
  } = useInventory();
  
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const { toast } = useToast();
  
  // Only fetch usage history when the history dialog is open
  // Memo selectedItemId to prevent unnecessary hook rerenders
  const selectedItemId = React.useMemo(() => 
    showHistoryDialog ? selectedItem?.id : undefined,
    [showHistoryDialog, selectedItem?.id]
  );
  const usageHistoryQuery = getUsageHistory(selectedItemId);

  const form = useForm<InsertInventoryItem>({
    resolver: zodResolver(insertInventoryItemSchema),
    defaultValues: {
      name: "",
      quantity: 0,
      unit: "pieces",
      supplier: null,
      description: null,
      minimum_quantity: 0,
      cost_per_unit: 0,
      category: "",
      last_restock_date: null,
      isActive: true,
      reorder_point: 0,
      reorder_quantity: 0,
      location: null,
      barcode: null,
    },
  });

  const onSubmit = async (data: InsertInventoryItem) => {
    try {
      const formattedData = {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        quantity: Number(data.quantity),
        minimum_quantity: Number(data.minimum_quantity),
        unit: data.unit.trim(),
        cost_per_unit: Number(data.cost_per_unit),
        category: data.category.trim(),
        supplier: data.supplier?.trim() || null,
        last_restock_date: data.last_restock_date || null,
        isActive: data.isActive ?? true,
        quantity_per_use: Number(data.quantity_per_use || 1),
        service_linked: data.service_linked ?? false,
        reorder_point: Number(data.reorder_point || 0),
        reorder_quantity: Number(data.reorder_quantity || 0),
        location: data.location?.trim() || null,
        barcode: data.barcode?.trim() || null,
      } satisfies InsertInventoryItem;

      if (selectedItem?.id) {
        await updateInventoryItem(selectedItem.id, formattedData);
        toast({
          title: "Success",
          description: "Inventory item updated successfully",
        });
      } else {
        await addInventoryItem(formattedData);
        toast({
          title: "Success",
          description: "Inventory item added successfully",
        });
      }
      setShowItemDialog(false);
      form.reset();
      setSelectedItem(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save inventory item",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: InventoryItem) => {
    if (!item.item_id) return;
    
    setSelectedItem({
      id: item.item_id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
    });
    
    const formData: InsertInventoryItem = {
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      supplier: item.supplier || null,
      description: item.description || null,
      minimum_quantity: item.minimum_quantity,
      cost_per_unit: 0,
      category: item.category || "",
      last_restock_date: null,
      isActive: item.isActive ?? true,
      reorder_point: item.reorder_point ?? 0,
      reorder_quantity: item.reorder_quantity ?? 0,
      location: item.location || null,
      barcode: item.barcode || null,
      quantity_per_use: item.quantity_per_use ?? 1,
      service_linked: item.service_linked ?? false,
    };
    
    form.reset(formData);
    setShowItemDialog(true);
  };

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-6">
      <div className="relative h-48 rounded-xl overflow-hidden bg-gradient-to-r from-primary/80 to-primary/20">
        <img
          src="https://images.unsplash.com/photo-1516734212186-a967f81ad0d7"
          alt="Inventory Management"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent flex items-center p-8">
          <div className="text-white">
            <h2 className="text-2xl font-bold">Inventory Management</h2>
            <p>Manage your stock and consumables</p>
          </div>
        </div>
      </div>

      <ErrorBoundary fallback={<div>Error loading inventory</div>}>
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <Button
              onClick={() => {
                setSelectedItem(null);
                form.reset();
                setShowItemDialog(true);
              }}
              className="ml-auto h-12 px-6"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add New Item
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item) => (
                  <TableRow key={item.item_id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>{item.category || "-"}</TableCell>
                    <TableCell>{item.supplier || "-"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={item.isActive}
                        onCheckedChange={async (checked) => {
                          if (item.item_id) {
                            await updateInventoryItem(item.item_id, { ...item, isActive: checked });
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(item)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (item.item_id) {
                              setSelectedItem({
                                id: item.item_id,
                                name: item.name,
                                quantity: item.quantity,
                                unit: item.unit,
                              });
                              setShowHistoryDialog(true);
                            }
                          }}
                          title="View History"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                            >
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
                                onClick={async () => {
                                  try {
                                    if (item.item_id) {
                                      await deleteInventoryItem(item.item_id);
                                      toast({
                                        title: "Success",
                                        description: "Item deleted successfully",
                                      });
                                    }
                                  } catch (error) {
                                    console.error('Error deleting item:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to delete item",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
            <DialogContent className="max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedItem ? "Edit Item" : "Add New Item"}
                </DialogTitle>
                <DialogDescription>
                  Enter the item details below
                </DialogDescription>
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
                          <Input placeholder="Item name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="Item category" {...field} />
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
                              min="0"
                              step="0.01"
                              placeholder="Enter quantity"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <FormControl>
                            <Input placeholder="Unit of measurement" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="cost_per_unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost per Unit</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
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
                              min="0"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
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
                      name="reorder_point"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reorder Point</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reorder_quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reorder Quantity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Storage Location</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value || null)}
                            placeholder="Optional storage location"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barcode</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value || null)}
                            placeholder="Optional barcode"
                          />
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
                          <Textarea
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value || null)}
                            placeholder="Optional description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowItemDialog(false);
                        form.reset();
                        setSelectedItem(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {selectedItem ? "Update Item" : "Add Item"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <ConsumablesUsageModal
            isOpen={!!selectedItem}
            onClose={() => setSelectedItem(null)}
            itemId={selectedItem?.id ?? ''}
            itemName={selectedItem?.name ?? ''}
            currentQuantity={selectedItem?.quantity ?? 0}
            unit={selectedItem?.unit ?? ''}
          />

          <Dialog 
            open={showHistoryDialog} 
            onOpenChange={setShowHistoryDialog}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Usage History</DialogTitle>
                <DialogDescription>
                  {selectedItem ? `View usage history for ${selectedItem.name}` : 'Loading...'}
                </DialogDescription>
              </DialogHeader>
              {showHistoryDialog && selectedItem && (
                <InventoryUsageHistory
                  usageHistory={usageHistoryQuery.data || []}
                  isLoading={usageHistoryQuery.isLoading}
                  unit={selectedItem.unit}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </ErrorBoundary>
    </div>
  );
}
