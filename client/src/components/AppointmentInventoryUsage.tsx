import { useState, useEffect, useCallback } from "react";
import { useInventory } from "@/hooks/use-inventory";
import { useServices } from "@/hooks/use-services";
import { Service } from "@/lib/service-types";
import { ConsumablesUsageModal } from "./ConsumablesUsageModal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";

interface AppointmentInventoryUsageProps {
  services: string[];
  onComplete: () => void;
  appointmentId: string;
}

type RequiredItem = {
  item_id: string;
  item_name: string;
  category: string;
  quantity?: number;
  unit?: string;
};

export function AppointmentInventoryUsage({
  services,
  onComplete,
  appointmentId
}: AppointmentInventoryUsageProps) {
  const { inventory, isLoading: inventoryLoading } = useInventory();
  const { services: allServices, isLoading: servicesLoading } = useServices();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [requiredItems, setRequiredItems] = useState<Record<string, RequiredItem>>({});

  useEffect(() => {
    if (!allServices?.length || !inventory?.length || !services?.length) {
      console.log('Required items: []');
      return;
    }

    const processedItems: Record<string, RequiredItem> = {};

    services.forEach(serviceId => {
      const service = allServices.find(s => s.service_id === serviceId);
      if (!service) return;

      // Process main service consumables
      if (service.consumables?.length) {
        service.consumables.forEach(consumable => {
          const inventoryItem = inventory.find(item => item.item_id === consumable.item_id);
          if (inventoryItem) {
            processedItems[consumable.item_id] = {
              item_id: consumable.item_id,
              item_name: consumable.item_name,
              category: inventoryItem.category,
              quantity: inventoryItem.quantity,
              unit: inventoryItem.unit
            };
          }
        });
      }

      // Process selected services consumables
      if (service.selectedServices?.length) {
        service.selectedServices.forEach(subService => {
          const fullSubService = allServices.find(s => s.service_id === subService.service_id);
          if (fullSubService?.consumables?.length) {
            fullSubService.consumables.forEach(consumable => {
              const inventoryItem = inventory.find(item => item.item_id === consumable.item_id);
              if (inventoryItem) {
                processedItems[consumable.item_id] = {
                  item_id: consumable.item_id,
                  item_name: consumable.item_name,
                  category: inventoryItem.category,
                  quantity: inventoryItem.quantity,
                  unit: inventoryItem.unit
                };
              }
            });
          }
        });
      }

      // Process selected addons consumables
      if (service.selectedAddons?.length) {
        service.selectedAddons.forEach(addon => {
          const fullAddon = allServices.find(s => s.service_id === addon.service_id);
          if (fullAddon?.consumables?.length) {
            fullAddon.consumables.forEach(consumable => {
              const inventoryItem = inventory.find(item => item.item_id === consumable.item_id);
              if (inventoryItem) {
                processedItems[consumable.item_id] = {
                  item_id: consumable.item_id,
                  item_name: consumable.item_name,
                  category: inventoryItem.category,
                  quantity: inventoryItem.quantity,
                  unit: inventoryItem.unit
                };
              }
            });
          }
        });
      }
    });

    console.log('Required items:', Object.values(processedItems));
    setRequiredItems(processedItems);
  }, [services, allServices, inventory]);

  const getCategories = useCallback(() => {
    const categories = new Set<string>();
    Object.values(requiredItems).forEach(item => {
      if (item.category) categories.add(item.category);
    });
    return Array.from(categories);
  }, [requiredItems]);

  const getItemsByCategory = useCallback((category: string) => {
    return Object.values(requiredItems).filter(item => item.category === category);
  }, [requiredItems]);

  const handleItemSelect = useCallback((itemId: string) => {
    setSelectedItemId(itemId);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    if (selectedItemId) {
      setCompletedItems(prev => new Set([...prev, selectedItemId]));
      const totalItems = Object.keys(requiredItems).length;
      if (completedItems.size + 1 === totalItems) {
        toast({
          title: "All items completed",
          description: "All required inventory usage has been recorded",
        });
        onComplete();
      }
    }
    setIsModalOpen(false);
    setSelectedItemId(null);
  }, [selectedItemId, requiredItems, completedItems.size, onComplete]);

  if (inventoryLoading || servicesLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="ml-2">Loading inventory...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Required Inventory Usage</h3>
        <div className="text-sm text-muted-foreground">
          {completedItems.size}/{Object.keys(requiredItems).length} items completed
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {getCategories().map((category) => {
          const items = getItemsByCategory(category);
          return (
            <AccordionItem key={category} value={category}>
              <AccordionTrigger className="flex items-center justify-between">
                <span>{category}</span>
                <Badge variant={items.every(item => completedItems.has(item.item_id)) ? "default" : "secondary"}>
                  {items.every(item => completedItems.has(item.item_id)) ? "Completed" : "Required"}
                </Badge>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {items.map((item) => (
                    <Button
                      key={item.item_id}
                      variant="outline"
                      className="justify-start"
                      onClick={() => handleItemSelect(item.item_id)}
                    >
                      <div className="flex flex-col items-start">
                        <span>{item.item_name}</span>
                        <span className="text-sm text-muted-foreground">
                          Stock: {item.quantity || 0} {item.unit}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {selectedItemId && requiredItems[selectedItemId] && (
        <ConsumablesUsageModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          itemId={selectedItemId}
          itemName={requiredItems[selectedItemId].item_name}
          currentQuantity={requiredItems[selectedItemId].quantity || 0}
          unit={requiredItems[selectedItemId].unit || ''}
          appointmentId={appointmentId}
        />
      )}
    </div>
  );
}