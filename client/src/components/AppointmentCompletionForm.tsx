
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useInventory } from "@/hooks/use-inventory";
import { useUser } from "@/hooks/use-user";
import { useToast } from "./ui/use-toast";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "./ui/form";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      consumables: {} as Record<string, { itemId: string; quantity: number }>,
    },
  });

  const handleSubmit = async (data: { consumables: Record<string, { itemId: string; quantity: number }> }) => {
    setIsSubmitting(true);
    try {
      await Promise.all(
        Object.values(data.consumables)
          .filter(usage => usage.quantity > 0)
          .map(usage =>
            recordUsage({
              item_id: usage.itemId,
              quantity_used: usage.quantity,
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const inventoryByCategory = service.required_categories.reduce((acc, category) => {
    acc[category] = inventory.filter(item => item.category === category);
    return acc;
  }, {} as Record<string, typeof inventory>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete {service.name}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {service.required_categories.map((category) => (
              <div key={category} className="space-y-2">
                <h3 className="font-medium">{category}</h3>
                <div className="grid gap-4">
                  <FormField
                    name={`consumables.${category}.itemId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Product</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          {inventoryByCategory[category]?.map((item) => (
                            <option key={item.item_id} value={item.item_id}>
                              {item.name} ({item.quantity} {item.unit} available)
                            </option>
                          ))}
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    name={`consumables.${category}.quantity`}
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
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Completing..." : "Complete Appointment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
