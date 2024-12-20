
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useInventory } from "@/hooks/use-inventory";
import { z } from "zod";
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
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Plus, X } from "lucide-react";

const completionFormSchema = z.object({
  serviceItems: z.array(z.object({
    categoryId: z.string(),
    itemId: z.string(),
    quantity: z.number().min(0),
  })),
  additionalItems: z.array(z.object({
    categoryId: z.string(),
    itemId: z.string(),
    quantity: z.number().min(0),
  })),
  observations: z.string().optional(),
  recommendations: z.string().optional(),
});

type CompletionFormValues = z.infer<typeof completionFormSchema>;

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

export function AppointmentCompletionForm({
  isOpen,
  onClose,
  appointmentId,
  serviceId,
  service,
  onComplete,
}: AppointmentCompletionFormProps) {
  const { inventory } = useInventory();
  const [additionalItems, setAdditionalItems] = useState<number>(0);

  // Group inventory by categories
  const inventoryByCategory = inventory.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof inventory>);

  const form = useForm<CompletionFormValues>({
    defaultValues: {
      serviceItems: service.consumables.map(c => ({
        categoryId: c.category,
        itemId: '',
        quantity: c.quantity
      })),
      additionalItems: [],
      observations: '',
      recommendations: ''
    }
  });

  const onSubmit = async (data: CompletionFormValues) => {
    try {
      const allUsedItems = [...data.serviceItems, ...data.additionalItems];
      for (const item of allUsedItems) {
        if (item.itemId && item.quantity > 0) {
          await recordUsage({
            item_id: item.itemId,
            quantity_used: item.quantity,
            service_id: serviceId,
            appointment_id: appointmentId,
            notes: `Used in service: ${service.name}`
          });
        }
      }
      onComplete();
      onClose();
    } catch (error) {
      console.error('Error recording usage:', error);
    }
  };

  const addAdditionalItem = () => {
    const currentItems = form.getValues('additionalItems');
    form.setValue('additionalItems', [
      ...currentItems,
      { categoryId: '', itemId: '', quantity: 0 }
    ]);
    setAdditionalItems(prev => prev + 1);
  };

  const removeAdditionalItem = (index: number) => {
    const currentItems = form.getValues('additionalItems');
    form.setValue('additionalItems', currentItems.filter((_, i) => i !== index));
    setAdditionalItems(prev => prev - 1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Complete {service.name}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Service Required Items</h3>
              {service.consumables.map((consumable, index) => (
                <div key={`${consumable.category}-${index}`} className="space-y-2">
                  <h4 className="text-sm font-medium">{consumable.category}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      name={`serviceItems.${index}.itemId`}
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
                      name={`serviceItems.${index}.quantity`}
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
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Additional Items Used</h3>
                <Button type="button" variant="outline" size="sm" onClick={addAdditionalItem}>
                  <Plus className="w-4 h-4 mr-1" /> Add Item
                </Button>
              </div>
              {form.watch('additionalItems').map((_, index) => (
                <div key={`additional-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-4 items-end">
                  <FormField
                    name={`additionalItems.${index}.categoryId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue(`additionalItems.${index}.itemId`, '');
                          }}
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
                  <FormField
                    name={`additionalItems.${index}.itemId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {inventoryByCategory[form.watch(`additionalItems.${index}.categoryId`)]?.map((item) => (
                              <SelectItem key={item.item_id} value={item.item_id}>
                                {item.name} ({item.quantity} {item.unit} available)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon"
                    onClick={() => removeAdditionalItem(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <FormField
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pet Observations</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any observations about the pet during the service"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                name="recommendations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recommendations</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any recommendations for future services"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Complete Service</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
