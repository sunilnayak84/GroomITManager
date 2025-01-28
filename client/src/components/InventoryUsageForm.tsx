import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash } from "lucide-react";
import { useInventory } from "@/hooks/use-inventory";

export const InventoryUsageForm = () => {
  const { data: inventoryItems } = useInventory();
  const form = useFormContext();
  const { fields, append, remove } = useFieldArray({
    name: "inventoryUsage",
    control: form.control,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">Inventory Usage</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ itemId: "", quantity: 1, notes: "" })}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-4 items-start">
          <FormField
            control={form.control}
            name={`inventoryUsage.${index}.itemId`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Item</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select item" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {inventoryItems?.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
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
            name={`inventoryUsage.${index}.quantity`}
            render={({ field }) => (
              <FormItem className="w-24">
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0.1"
                    step="0.1"
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
            name={`inventoryUsage.${index}.notes`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-8"
            onClick={() => remove(index)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
};
