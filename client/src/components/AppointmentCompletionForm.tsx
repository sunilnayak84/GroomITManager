
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useInventory } from "@/hooks/use-inventory";
import { useServices } from "@/hooks/use-services";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "./ui/form";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface AppointmentCompletionFormProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  serviceId: string;
  onComplete: () => void;
}

export function AppointmentCompletionForm({
  isOpen,
  onClose,
  appointmentId,
  serviceId,
  onComplete,
}: AppointmentCompletionFormProps) {
  const { inventory } = useInventory();
  const { services } = useServices();
  const service = services?.find(s => s.service_id === serviceId);

  const form = useForm({
    defaultValues: {
      items: service?.required_categories?.map(category => ({
        category,
        itemId: '',
        quantity: 0
      })) || []
    }
  });

  const onSubmit = async (data: any) => {
    try {
      await Promise.all(
        data.items.map((item: any) =>
          inventory?.recordUsage?.({
            item_id: item.itemId,
            quantity_used: item.quantity,
            appointment_id: appointmentId,
            service_id: serviceId,
            used_by: "staff",
            notes: `Used in appointment ${appointmentId}`
          })
        )
      );
      onComplete();
    } catch (error) {
      console.error('Error recording usage:', error);
    }
  };

  if (!service) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Inventory Usage for {service.name}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {service.required_categories?.map((category, index) => (
              <div key={category} className="space-y-2">
                <h3 className="font-medium">{category}</h3>
                <div className="grid gap-4">
                  <FormField
                    name={`items.${index}.itemId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Product</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {inventory?.filter(item => item.category === category).map((item) => (
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
