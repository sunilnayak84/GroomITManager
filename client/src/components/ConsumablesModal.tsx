import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  const form = useForm<ServiceConsumable>({
    resolver: zodResolver(serviceConsumableSchema),
    defaultValues: {
      item_id: "",
      item_name: "",
      quantity_used: 0,
      unit: "",
      is_tracked: true,
      auto_update_stock: true,
      minimum_quantity: 0,
    },
  });

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
                name="item_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter item ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="item_name"
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
                name="quantity_used"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity Used</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
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
                      <Input placeholder="Enter unit (e.g., ml, g, pieces)" {...field} />
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
                  name="is_tracked"
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
                  name="auto_update_stock"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0">
                      <FormLabel>Auto Update Stock</FormLabel>
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
