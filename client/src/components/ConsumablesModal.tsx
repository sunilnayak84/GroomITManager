import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInventory } from "@/hooks/use-inventory";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ServiceConsumable, serviceConsumableSchema } from "@/lib/service-types";

interface ConsumablesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (consumables: ServiceConsumable[]) => void;
  initialConsumables?: ServiceConsumable[];
}

export function ConsumablesModal({
  open,
  onOpenChange,
  onSave,
  initialConsumables = [],
}: ConsumablesModalProps) {
  const [consumables, setConsumables] = React.useState<ServiceConsumable[]>(initialConsumables);
  const { inventory } = useInventory();
  
  const form = useForm<ServiceConsumable>({
    resolver: zodResolver(serviceConsumableSchema),
    defaultValues: {
      inventory_item_id: "",
      name: "",
      quantity_per_service: 0,
      unit: "",
      current_stock: 0,
      track_inventory: true,
      auto_deduct: true,
      minimum_quantity: 0,
      category: "",
      notes: "",
    },
  });

  // Update form when inventory item is selected
  const onInventoryItemSelect = (itemId: string) => {
    const selectedItem = inventory.find(item => item.item_id === itemId);
    if (selectedItem) {
      form.setValue('inventory_item_id', itemId);
      form.setValue('name', selectedItem.name);
      form.setValue('unit', selectedItem.unit);
      form.setValue('current_stock', selectedItem.quantity);
      form.setValue('minimum_quantity', selectedItem.minimum_quantity);
      form.setValue('category', selectedItem.category);
      form.setValue('cost_per_unit', selectedItem.cost_per_unit);
      form.setValue('reorder_point', selectedItem.reorder_point);
      form.setValue('service_linked', true);
      form.setValue('last_stock_check', new Date());
      
      // Set track_inventory based on whether the item has minimum_quantity set
      form.setValue('track_inventory', selectedItem.minimum_quantity > 0);
      
      // Auto-deduct should be enabled by default for tracked items
      form.setValue('auto_deduct', selectedItem.minimum_quantity > 0);
    }
  };

  const addConsumable = (data: ServiceConsumable) => {
    setConsumables((prev) => [...prev, data]);
    form.reset();
  };

  const removeConsumable = (index: number) => {
    setConsumables((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(consumables);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Consumables</DialogTitle>
          <DialogDescription>
            Add or remove consumables used in this service
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(addConsumable)} className="space-y-4">
              <FormField
                control={form.control}
                name="inventory_item_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Inventory Item</FormLabel>
                    <Select onValueChange={onInventoryItemSelect} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an item from inventory" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {inventory.map((item) => (
                          <SelectItem key={item.item_id} value={item.item_id}>
                            {item.name} ({item.quantity} {item.unit} available)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity_per_service"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity Per Service</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Enter quantity used per service"
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
                    <FormLabel>Minimum Quantity Alert</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Minimum quantity for alerts"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-2">
                <FormField
                  control={form.control}
                  name="track_inventory"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0">
                      <FormLabel>Track Inventory</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="auto_deduct"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0">
                      <FormLabel>Auto Deduct from Stock</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit">Add Consumable</Button>
            </form>
          </Form>

          <div className="space-y-2">
            <h4 className="font-medium">Current Consumables</h4>
            {consumables.map((consumable, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div>
                  <p className="font-medium">{consumable.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {consumable.quantity_per_service} {consumable.unit} per service
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeConsumable(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
