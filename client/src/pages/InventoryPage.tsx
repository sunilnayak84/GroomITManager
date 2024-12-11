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
import { InventoryItem, inventoryItemSchema } from "@/lib/inventory-types";

interface SelectedItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export default function InventoryPage() {
  const { inventory, isLoading, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useInventory();
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const { toast } = useToast();

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

  const onSubmit = async (data: InventoryItem) => {
    try {
      if (selectedItem) {
        await updateInventoryItem(selectedItem.id, data);
        toast({
          title: "Success",
          description: "Inventory item updated successfully",
        });
      } else {
        await addInventoryItem(data);
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
    setSelectedItem({
      id: item.item_id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
    });
    form.reset({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      supplier: item.supplier,
      description: item.description,
      minimum_quantity: item.minimum_quantity,
    });
    setShowItemDialog(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="relative h-48 rounded-xl overflow-hidden">
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
          <div className="flex justify-between items-center">
            <Button
              onClick={() => {
                setSelectedItem(null);
                form.reset();
                setShowItemDialog(true);
              }}
              className="ml-auto h-12 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
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
                  <TableHead>Supplier</TableHead>
                  <TableHead>Min. Quantity</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item) => (
                  <TableRow key={item.item_id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>{item.supplier}</TableCell>
                    <TableCell>{item.minimum_quantity}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedItem({
                            id: item.item_id,
                            name: item.name,
                            quantity: item.quantity,
                            unit: item.unit,
                          })}
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
                                    await deleteInventoryItem(item.item_id);
                                    toast({
                                      title: "Success",
                                      description: "Item deleted successfully",
                                    });
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
            <DialogContent>
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
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
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
      </ErrorBoundary>
    </div>
  );
}