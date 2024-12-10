import { useState, Suspense } from "react";
import { Plus } from "lucide-react";
import { useInventory } from "@/hooks/use-inventory";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Schema definition
const inventoryFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  quantity: z.number().min(0, "Quantity must be 0 or greater"),
  unit: z.string().min(1, "Unit is required"),
  minimum_quantity: z.number().min(0, "Minimum quantity must be 0 or greater"),
  cost_per_unit: z.number().min(0, "Cost must be 0 or greater"),
  supplier: z.string().optional(),
  description: z.string().optional(),
});

type InventoryFormData = z.infer<typeof inventoryFormSchema>;

// Separate loading component
function LoadingState() {
  return (
    <div className="flex items-center justify-center h-[50vh]">
      <div className="text-lg">Loading inventory...</div>
    </div>
  );
}

// Main inventory content component
function InventoryContent() {
  const { toast } = useToast();
  const { inventory, isLoading, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useInventory();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const form = useForm<InventoryFormData>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      name: "",
      category: "",
      quantity: 0,
      unit: "",
      minimum_quantity: 0,
      cost_per_unit: 0,
      supplier: "",
      description: "",
    },
  });

  const handleDialogChange = (open: boolean) => {
    setShowDialog(open);
    if (!open) {
      setSelectedItem(null);
      form.reset();
    }
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    form.reset({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      minimum_quantity: item.minimum_quantity,
      cost_per_unit: item.cost_per_unit,
      supplier: item.supplier || "",
      description: item.description || "",
    });
    setShowDialog(true);
  };

  const onSubmit = async (data: InventoryFormData) => {
    try {
      const itemData = {
        ...data,
        isActive: true,
      };

      if (selectedItem) {
        await updateInventoryItem(selectedItem.item_id, itemData);
        toast({
          title: "Success",
          description: "Item updated successfully"
        });
      } else {
        await addInventoryItem(itemData);
        toast({
          title: "Success",
          description: "Item added successfully"
        });
      }

      handleDialogChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save inventory item",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="relative h-48 rounded-xl overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1635859890085-ec8cb5466802"
          alt="Inventory Management"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent flex items-center p-8">
          <div className="text-white">
            <h2 className="text-2xl font-bold">Inventory Management</h2>
            <p>Track and manage your stock levels and consumables</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-6">
        <Button
          onClick={() => handleDialogChange(true)}
          className="h-12 px-6"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add New Item
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Reorder Point</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!inventory || inventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  No inventory items found
                </TableCell>
              </TableRow>
            ) : (
              inventory.map((item) => (
                <TableRow key={item.item_id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${
                        item.quantity <= item.minimum_quantity
                          ? "text-red-500"
                          : item.quantity <= item.minimum_quantity * 1.5
                            ? "text-yellow-500"
                            : "text-green-500"
                      }`}>
                        {item.quantity}
                      </span>
                      <span className="text-muted-foreground">{item.unit}</span>
                    </div>
                    {item.quantity <= item.minimum_quantity && (
                      <span className="text-sm text-red-500">Low stock!</span>
                    )}
                  </TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>{item.minimum_quantity}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this item?")) {
                            deleteInventoryItem(item.item_id)
                              .then(() => {
                                toast({
                                  title: "Success",
                                  description: "Item deleted successfully"
                                });
                              })
                              .catch((error) => {
                                toast({
                                  title: "Error",
                                  description: error instanceof Error ? error.message : "Failed to delete item",
                                  variant: "destructive"
                                });
                              });
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showDialog} onOpenChange={handleDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedItem ? "Edit Item" : "Add New Item"}
            </DialogTitle>
            <DialogDescription>
              Enter the inventory item details below
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter item name" {...field} />
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
                      <Input placeholder="Enter category" {...field} />
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
                          step="1"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
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
                        <Input placeholder="e.g., ml, pieces" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
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
                          min="0"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
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
                    <FormLabel>Supplier (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter supplier name"
                        {...field}
                        value={field.value || ""}
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Item description"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogChange(false)}
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
    </div>
  );
}

// Main component with Suspense wrapper
export default function InventoryPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <InventoryContent />
    </Suspense>
  );
}
