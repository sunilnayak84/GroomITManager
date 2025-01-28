import { useState, useEffect } from "react";
import { useInventory } from "@/hooks/use-inventory";
import { useServices } from "@/hooks/use-services";
import { Service, RequiredInventoryCategory } from "@/lib/service-types";
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
  const [requiredCategories, setRequiredCategories] = useState<Map<string, RequiredInventoryCategory>>(new Map());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [completedCategories, setCompletedCategories] = useState<Set<string>>(new Set());

  // Helper function to extract all services from a package
  const extractAllServices = (service: Service): Service[] => {
    const services: Service[] = [service];

    // Add selected services if present
    if (service.selectedServices && service.selectedServices.length > 0) {
      service.selectedServices.forEach(subService => {
        const fullService = allServices.find(s => s.service_id === subService.service_id);
        if (fullService) {
          services.push(...extractAllServices(fullService));
        }
      });
    }

    // Add selected addons if present
    if (service.selectedAddons && service.selectedAddons.length > 0) {
      service.selectedAddons.forEach(addon => {
        const fullService = allServices.find(s => s.service_id === addon.service_id);
        if (fullService) {
          services.push(...extractAllServices(fullService));
        }
      });
    }

    return services;
  };

  useEffect(() => {
    const categoriesMap = new Map<string, RequiredInventoryCategory>();

    // Process all selected services
    services.forEach(serviceId => {
      const service = allServices.find(s => s.service_id === serviceId);
      if (service) {
        // Get all services including nested ones
        const allRelatedServices = extractAllServices(service);

        // Process required categories from all related services
        allRelatedServices.forEach(relatedService => {
          if (relatedService.required_categories) {
            relatedService.required_categories.forEach(category => {
              // Only add if not already present or if marked as required
              if (!categoriesMap.has(category.category_id) || category.required) {
                categoriesMap.set(category.category_id, category);
              }
            });
          }
        });
      }
    });

    console.log('Required categories:', Array.from(categoriesMap.values()));
    setRequiredCategories(categoriesMap);
  }, [services, allServices]);

  const getItemsByCategory = (categoryId: string) => {
    return inventory.filter(item => item.category === categoryId && item.isActive);
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    setIsModalOpen(true);
  };

  const handleUsageRecorded = (categoryId: string) => {
    setCompletedCategories(prev => new Set(prev).add(categoryId));
    if (requiredCategories.size === completedCategories.size + 1) {
      toast({
        title: "All categories completed",
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
          {completedCategories.size}/{requiredCategories.size} categories completed
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {Array.from(requiredCategories.values()).map((category) => {
          const items = getItemsByCategory(category.category_id);
          const isCategoryCompleted = completedCategories.has(category.category_id);

          return (
            <AccordionItem key={category.category_id} value={category.category_id}>
              <AccordionTrigger className="flex items-center justify-between">
                <span>{category.category_name}</span>
                <Badge variant={isCategoryCompleted ? "default" : "secondary"}>
                  {isCategoryCompleted ? "Completed" : "Required"}
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
                        <span>{item.name}</span>
                        <span className="text-sm text-muted-foreground">
                          Stock: {item.quantity} {item.unit}
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

      {selectedItem && (
        <ConsumablesUsageModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedItemId(null);
            // Mark the category as completed when modal is closed
            const category = inventory.find(i => i.item_id === selectedItemId)?.category;
            if (category) {
              handleUsageRecorded(category);
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