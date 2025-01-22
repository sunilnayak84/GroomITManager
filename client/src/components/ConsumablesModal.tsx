
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useInventory } from "@/hooks/use-inventory";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

interface Consumable {
  item_id: string;
  item_name: string;
  quantity_used: number;
}

interface ConsumablesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialConsumables: Consumable[];
  onSave: (consumables: Consumable[]) => void;
}

export function ConsumablesModal({
  open,
  onOpenChange,
  initialConsumables = [],
  onSave,
}: ConsumablesModalProps) {
  const { inventory } = useInventory();
  const [selectedConsumables, setSelectedConsumables] = useState<Consumable[]>([]);

  useEffect(() => {
    if (open) {
      setSelectedConsumables(initialConsumables);
    }
  }, [open, initialConsumables]);

  const toggleItem = (item: { id: string; name: string }) => {
    setSelectedConsumables(prev => {
      const exists = prev.find(c => c.item_id === item.id);
      if (exists) {
        return prev.filter(c => c.item_id !== item.id);
      }
      return [...prev, { item_id: item.id, item_name: item.name, quantity_used: 1 }];
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    setSelectedConsumables(prev =>
      prev.map(c =>
        c.item_id === itemId ? { ...c, quantity_used: quantity } : c
      )
    );
  };

  const handleSave = () => {
    try {
      onSave(selectedConsumables);
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
          {inventory.map((item) => (
            <div key={item.id} className="flex items-center space-x-4">
              <Checkbox
                id={item.id}
                checked={selectedConsumables.some(c => c.item_id === item.id)}
                onCheckedChange={() => toggleItem({ id: item.id, name: item.name })}
              />
              <label htmlFor={item.id} className="flex-grow">
                {item.name}
              </label>
              {selectedConsumables.some(c => c.item_id === item.id) && (
                <Input
                  type="number"
                  min="1"
                  value={selectedConsumables.find(c => c.item_id === item.id)?.quantity_used || 1}
                  onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                  className="w-20"
                />
              )}
            </div>
          ))}

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
