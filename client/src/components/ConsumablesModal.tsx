
import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useInventory } from "@/hooks/use-inventory";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";

interface ConsumablesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategories?: string[];
  onSave: (categories: string[]) => void;
}

export function ConsumablesModal({
  open,
  onOpenChange,
  initialCategories = [],
  onSave,
}: ConsumablesModalProps) {
  const { inventory } = useInventory();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setSelectedCategories(initialCategories);
    }
  }, [open, initialCategories]);

  // Get unique categories from inventory
  const categories = React.useMemo(() => {
    const uniqueCategories = new Set(inventory.map(item => item.category));
    return Array.from(uniqueCategories);
  }, [inventory]);

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      }
      return [...prev, category];
    });
  };

  const handleSave = () => {
    try {
      onSave(selectedCategories);
      toast({
        title: "Success",
        description: "Categories saved successfully",
      });
    } catch (error) {
      console.error('Error saving categories:', error);
      toast({
        title: "Error",
        description: "Failed to save categories",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure Service Categories</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-4">
            {categories.map((category) => (
              <div key={category} className="flex items-center space-x-2">
                <Checkbox
                  id={category}
                  checked={selectedCategories.includes(category)}
                  onCheckedChange={() => toggleCategory(category)}
                />
                <label
                  htmlFor={category}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {category}
                </label>
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
