import { useState, useEffect } from "react";
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
  const [requiredItems, setRequiredItems] = useState<Map<string, {item_id: string, item_name: string, category: string}>>(new Map());

  // Helper function to extract all consumables from a service
  const extractAllConsumables = (service: Service): Array<{item_id: string, item_name: string}> => {
    const consumables: Array<{item_id: string, item_name: string}> = [...(service.consumables || [])];

    // Add consumables from selected services
    if (service.selectedServices) {
      service.selectedServices.forEach(subService => {
        const fullService = allServices.find(s => s.service_id === subService.service_id);
        if (fullService) {
          consumables.push(...extractAllConsumables(fullService));
        }
      });
    }

    // Add consumables from selected addons
    if (service.selectedAddons) {
      service.selectedAddons.forEach(addon => {
        const fullService = allServices.find(s => s.service_id === addon.service_id);
        if (fullService) {
          consumables.push(...extractAllConsumables(fullService));
        }
      });
    }

    return consumables;
  };

  useEffect(() => {
    const itemsMap = new Map<string, {item_id: string, item_name: string, category: string}>();

    // Process all selected services
    services.forEach(serviceId => {
      const service = allServices.find(s => s.service_id === serviceId);
      if (service) {
        // Get all consumables including from nested services
        const allConsumables = extractAllConsumables(service);

        // Add each consumable to the map
        allConsumables.forEach(consumable => {
          const inventoryItem = inventory.find(item => item.item_id === consumable.item_id);
          if (inventoryItem) {
            itemsMap.set(consumable.item_id, {
              item_id: consumable.item_id,
              item_name: consumable.item_name,
              category: inventoryItem.category
            });
          }
        });
      }
    });

    console.log('Required items:', Array.from(itemsMap.values()));
    setRequiredItems(itemsMap);
  }, [services, allServices, inventory]);

  const getItemsByCategory = (category: string) => {
    return Array.from(requiredItems.values()).filter(item => item.category === category);
  };

  const getCategories = () => {
    const categories = new Set<string>();
    requiredItems.forEach(item => categories.add(item.category));
    return Array.from(categories);
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    setIsModalOpen(true);
  };

  const handleUsageRecorded = (itemId: string) => {
    setCompletedItems(prev => new Set(prev).add(itemId));

    // Check if all items are completed
    const allCompleted = Array.from(requiredItems.keys()).every(id => 
      completedItems.has(id) || id === itemId
    );

    if (allCompleted) {
      toast({
        title: "All items completed",
        description: "All required inventory usage has been recorded",
      });
      onComplete();
    }
  };

  if (inventoryLoading || servicesLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="ml-2">Loading inventory...</span>
      </div>
    );
  }

  const selectedItem = selectedItemId ? inventory.find(item => item.item_id === selectedItemId) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Required Inventory Usage</h3>
        <div className="text-sm text-muted-foreground">
          {completedItems.size}/{requiredItems.size} items completed
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
                  {items.map((item) => {
                    const inventoryItem = inventory.find(i => i.item_id === item.item_id);
                    return (
                      <Button
                        key={item.item_id}
                        variant="outline"
                        className="justify-start"
                        onClick={() => handleItemSelect(item.item_id)}
                      >
                        <div className="flex flex-col items-start">
                          <span>{item.item_name}</span>
                          <span className="text-sm text-muted-foreground">
                            Stock: {inventoryItem?.quantity || 0} {inventoryItem?.unit}
                          </span>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {selectedItem && (
        <ConsumablesUsageModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedItemId(null);
            // Mark the item as completed when modal is closed
            if (selectedItemId) {
              handleUsageRecorded(selectedItemId);
            }
          }}
          itemId={selectedItem.item_id}
          itemName={selectedItem.name}
          currentQuantity={selectedItem.quantity}
          unit={selectedItem.unit}
          appointmentId={appointmentId}
        />
      )}
    </div>
  );
}