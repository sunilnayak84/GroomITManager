
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
import { ServiceConsumable } from "@/lib/service-types";

interface ConsumablesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (categories: string[]) => void;
  initialCategories?: string[];
}

export function ConsumablesModal({
  open,
  onOpenChange,
  onSave,
  initialCategories = [],
}: ConsumablesModalProps) {
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const { inventory } = useInventory();

  React.useEffect(() => {
    setSelectedCategories(initialCategories || []);
  }, [initialCategories, open]);

  const form = useForm({
    defaultValues: {
      category: "",
    },
  });

  // Get unique categories from inventory
  const categories = React.useMemo(() => {
    const uniqueCategories = new Set(inventory.map(item => item.category));
    return Array.from(uniqueCategories);
  }, [inventory]);

  // Update form when inventory category is selected
  const onInventoryCategorySelect = (category: string) => {
    if (!selectedCategories.includes(category)) {
      setSelectedCategories(prev => [...prev, category]);
    }
    form.reset();
  };

  const removeCategory = (categoryToRemove: string) => {
    setSelectedCategories((prev) => prev.filter((cat) => cat !== categoryToRemove));
  };

  const handleSave = () => {
    try {
      onSave(selectedCategories);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving categories:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to save categories',
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure Service Categories</DialogTitle>
          <DialogDescription>
            Select inventory categories required for this service
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Form {...form}>
            <form className="space-y-4">
              <FormField
                control={form.control}
                name="category"
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
            <h4 className="font-medium">Selected Categories</h4>
            {selectedCategories.map((category) => (
              <div
                key={category}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div>
                  <p className="font-medium">{category}</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeCategory(category)}
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
