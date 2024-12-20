
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useInventory } from "@/hooks/use-inventory";
import { useServices } from "@/hooks/use-services"; 
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface AppointmentCompletionFormProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  serviceId: string;
  service: {
    consumables: { category: string; quantity: number }[];
    name: string;
  };
  onComplete: () => void;
}

interface UsageItem {
  categoryId: string;
  itemId: string;
  quantity: number;
}

export function AppointmentCompletionForm({
  isOpen,
  onClose,
  appointmentId,
  serviceId,
  service,
  onComplete,
}: AppointmentCompletionFormProps) {
  const { inventory } = useInventory();
  const [usageItems, setUsageItems] = useState<UsageItem[]>([]);

  // Group inventory by categories
  const inventoryByCategory = inventory.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof inventory>);

  const form = useForm({
    defaultValues: {
      items: service.consumables.map(c => ({
        categoryId: c.category,
        itemId: '',
        quantity: c.quantity
      }))
    }
  });

  const onSubmit = async (data: { items: UsageItem[] }) => {
    try {
      setUsageItems(data.items);
      onComplete();
    } catch (error) {
      console.error('Error recording usage:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete {service.name}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {service.consumables.map((consumable, index) => (
              <div key={`${consumable.category}-${index}`} className="space-y-2">
                <h3 className="font-medium">{consumable.category}</h3>
                <div className="grid gap-4">
                  <FormField
                    name={`items.${index}.itemId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Product</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {inventoryByCategory[consumable.category]?.map((item) => (
                              <SelectItem key={item.item_id} value={item.item_id}>
                                {item.name} ({item.quantity} {item.unit} available)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity Used</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}
            <DialogFooter>
              <Button type="submit">Record Usage & Complete</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
