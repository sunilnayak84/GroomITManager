
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useInventory } from "@/hooks/use-inventory";
import { toast } from "@/hooks/use-toast";

interface Consumable {
  item_id: string;
  item_name: string;
  quantity_used: number;
}

interface ConsumablesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialConsumables?: Consumable[];
  onSave: (consumables: Consumable[]) => void;
}

export function ConsumablesModal({
  open,
  onOpenChange,
  initialConsumables = [],
  onSave,
}: ConsumablesModalProps) {
  const { categories } = useInventory();
  const [selectedItems, setSelectedItems] = useState<Consumable[]>([]);

  useEffect(() => {
    if (open) {
      setSelectedItems(initialConsumables);
    }
  }, [open, initialConsumables]);

  const toggleItem = (item: { id: string; name: string }) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.item_id === item.id);
      if (exists) {
        return prev.filter(i => i.item_id !== item.id);
      }
      return [...prev, { item_id: item.id, item_name: item.name, quantity_used: 1 }];
    });
  };

  const handleSave = () => {
    try {
      onSave(selectedItems);
      toast({
        title: "Success",
        description: "Consumables saved successfully",
      });
    } catch (error) {
      console.error('Error saving consumables:', error);
      toast({
        title: "Error",
        description: "Failed to save consumables",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure Service Consumables</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-4">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox
                  id={category.id}
                  checked={selectedItems.some(item => item.item_id === category.id)}
                  onCheckedChange={() => toggleItem(category)}
                />
                <label
                  htmlFor={category.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {category.name}
                </label>
              </div>
            ))}
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
