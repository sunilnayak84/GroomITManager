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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ServiceConsumable, baseConsumableSchema } from "@/lib/service-types";

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
  const [consumables, setConsumables] = React.useState<ServiceConsumable[]>([]);
  const { inventory } = useInventory();

  React.useEffect(() => {
    console.log('Initial consumables received:', initialConsumables);
    setConsumables(initialConsumables || []);
  }, [initialConsumables, open]);

  const form = useForm<z.infer<typeof baseConsumableSchema>>({
    resolver: zodResolver(baseConsumableSchema),
    defaultValues: {
      item_id: "",
      item_name: "",
      quantity_used: 1
    },
  });

  // Get unique categories from inventory
  const categories = React.useMemo(() => {
    const uniqueCategories = new Set(inventory.map(item => item.category));
    return Array.from(uniqueCategories);
  }, [inventory]);

  // Update form when inventory category is selected
  const onInventoryCategorySelect = (category: string) => {
    const itemsInCategory = inventory.filter(item => item.category === category);
    itemsInCategory.forEach(item => {
      const newConsumable: ServiceConsumable = {
        item_id: item.item_id,
        item_name: item.name,
        quantity_used: 1
      };

      // Check if item already exists in consumables
      if (!consumables.some(c => c.item_id === item.item_id)) {
        setConsumables(prev => [...prev, newConsumable]);
      }
    });
    form.reset();
  };

  const removeConsumable = (index: number) => {
    setConsumables((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    try {
      console.log('Handling save with consumables:', consumables);
      onSave(consumables);
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
            Select categories of consumables used in this service
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Form {...form}>
            <form className="space-y-4">
              <FormField
                control={form.control}
                name="item_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Category</FormLabel>
                    <Select onValueChange={onInventoryCategorySelect}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>

          <div className="space-y-2">
            <h4 className="font-medium">Selected Consumables</h4>
            {consumables.map((consumable, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div>
                  <p className="font-medium">{consumable.item_name}</p>
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