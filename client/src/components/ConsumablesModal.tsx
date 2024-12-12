import React from "react";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ServiceConsumable, baseConsumableSchema, serviceConsumableSchema } from "@/lib/service-types";

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
  
  const form = useForm<z.infer<typeof baseConsumableSchema>>({
    resolver: zodResolver(baseConsumableSchema),
    defaultValues: {
      item_id: "",
      item_name: "",
      quantity_used: 0
    },
  });

  // Update form when inventory item is selected
  const onInventoryItemSelect = (itemId: string) => {
    const selectedItem = inventory.find(item => item.item_id === itemId);
    if (selectedItem) {
      form.setValue('item_id', itemId);
      form.setValue('item_name', selectedItem.name);
      // Values are set automatically by the form
    }
  };

  const addConsumable = (data: z.infer<typeof baseConsumableSchema>) => {
    try {
      console.log('Adding consumable with data:', data);
      
      // Create new consumable with proper type validation
      const newConsumable: ServiceConsumable = {
        item_id: data.item_id,
        item_name: data.item_name,
        quantity_used: Number(data.quantity_used)
      };

      console.log('Created new consumable:', newConsumable);

      // Update consumables state
      setConsumables(prev => {
        const updated = [...prev, newConsumable];
        console.log('Updated consumables state:', updated);
        return updated;
      });
      
      // Reset form after successful add
      form.reset({
        item_id: "",
        item_name: "",
        quantity_used: 0
      });
    } catch (error) {
      console.error('Error adding consumable:', error);
      return;
    }
  };

  const removeConsumable = (index: number) => {
    setConsumables((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    try {
      console.log('Handling save with consumables:', consumables);
      
      // Validate each consumable
      const validConsumables = consumables.map(c => {
        const validated = serviceConsumableSchema.parse({
          item_id: c.item_id,
          item_name: c.item_name,
          quantity_used: Number(c.quantity_used)
        });
        console.log('Validated consumable:', validated);
        return validated;
      });
      
      console.log('All validated consumables:', validConsumables);
      
      // Call parent save function with validated consumables
      onSave(validConsumables);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving consumables:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save consumables',
        variant: "destructive"
      });
    }
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
                name="item_id"
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
                name="quantity_used"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity Used</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Enter quantity used"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                  <p className="font-medium">{consumable.item_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Quantity: {consumable.quantity_used}
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
