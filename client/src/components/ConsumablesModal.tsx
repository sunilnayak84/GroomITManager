import React from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

  // Get unique categories from inventory
  const categories = React.useMemo(() => {
    const uniqueCategories = new Set(inventory.map(item => item.category));
    return Array.from(uniqueCategories);
  }, [inventory]);

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

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      }
      return [...prev, category];
    });
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