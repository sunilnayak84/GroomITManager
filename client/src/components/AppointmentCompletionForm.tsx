
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useInventory } from "@/hooks/use-inventory";
import { useServices } from "@/hooks/use-services"; 
import { useUser } from "@/hooks/use-user";
import { useToast } from "./ui/use-toast";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
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
import { Plus } from "lucide-react";

interface AppointmentCompletionFormProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  serviceId: string;
  service: {
    required_categories: string[];
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
  const { inventory, recordUsage } = useInventory();
  const { user } = useUser();
  const { toast } = useToast();
  const [additionalItems, setAdditionalItems] = useState<string[]>([]);

  const form = useForm({
    defaultValues: {
      items: [] as UsageItem[],
    },
  });

  // Group inventory by categories
  const inventoryByCategory = inventory.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof inventory>);

  const handleAddAdditionalItem = () => {
    const newId = `additional-${additionalItems.length}`;
    setAdditionalItems([...additionalItems, newId]);
  };

  const handleSubmit = async (data: { items: UsageItem[] }) => {
    try {
      await Promise.all(
        data.items
          .filter(item => item.itemId && item.quantity > 0)
          .map(item =>
            recordUsage({
              item_id: item.itemId,
              quantity_used: item.quantity,
              service_id: serviceId,
              appointment_id: appointmentId,
              used_by: user?.uid || '',
              notes: `Used in appointment ${appointmentId}`,
            })
          )
      );
      
      onComplete();
      toast({
        title: "Success",
        description: "Appointment completed and inventory updated",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record inventory usage",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Complete {service.name}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Required Categories */}
            {service.required_categories.map((category, index) => (
              <div key={`required-${category}`} className="space-y-2">
                <h3 className="font-medium">{category} (Required)</h3>
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
                            {inventoryByCategory[category]?.map((item) => (
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

            {/* Additional Items */}
            {additionalItems.map((id, index) => (
              <div key={id} className="space-y-2 border-t pt-4">
                <FormField
                  name={`items.${service.required_categories.length + index}.categoryId`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(inventoryByCategory).map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                {form.watch(`items.${service.required_categories.length + index}.categoryId`) && (
                  <>
                    <FormField
                      name={`items.${service.required_categories.length + index}.itemId`}
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
                              {inventoryByCategory[form.watch(`items.${service.required_categories.length + index}.categoryId`)]?.map((item) => (
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
                      name={`items.${service.required_categories.length + index}.quantity`}
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
                  </>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={handleAddAdditionalItem}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Additional Item
            </Button>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                Complete Appointment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
