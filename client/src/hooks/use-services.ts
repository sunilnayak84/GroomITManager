import { useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query } from 'firebase/firestore';
import { db } from "../lib/firebase";
import { toast } from "@/components/ui/use-toast";
import type { Service, InsertService, ServiceConsumable, UpdateService } from "@/lib/service-types";
import { serviceSchema, ServiceCategory } from "@/lib/service-types";

// Collection reference
const servicesCollection = collection(db, 'services');

// Export the Service type for use in other components
export type { Service };

export function useServices() {
  const queryClient = useQueryClient();

  const { data: services = [], isLoading, ...rest } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => {
      try {
        console.log('FETCH_SERVICES: Starting to fetch services');
        const q = query(servicesCollection);
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          console.log('FETCH_SERVICES: No services found');
          return [];
        }

        const fetchedServices = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          let parsedData = serviceSchema.parse({
            service_id: doc.id,
            name: data.name,
            description: data.description || undefined,
            category: data.category || ServiceCategory.SERVICE,
            duration: data.duration,
            price: data.price || 0,
            discount_percentage: data.discount_percentage || 0,
            consumables: (data.consumables || []).map((c: ServiceConsumable) => ({
              item_id: c.item_id,
              item_name: c.item_name,
              quantity_used: c.quantity_used
            })),
            isActive: data.isActive ?? true,
            created_at: data.created_at || new Date(),
            updated_at: data.updated_at || new Date(),
            selectedServices: data.selectedServices || [],
            selectedAddons: data.selectedAddons || []
          });

          // If this is a package, recalculate the price based on current service prices
          if (parsedData.category === ServiceCategory.PACKAGE) {
            try {
              const selectedItems = [...(parsedData.selectedServices || []), ...(parsedData.selectedAddons || [])];
              const totalOriginalPrice = selectedItems.reduce((sum, item) => {
                // Find the current price of the service/addon
                const currentService = querySnapshot.docs
                  .find(doc => doc.id === item.service_id)?.data();
                return sum + (currentService?.price || item.price);
              }, 0);
              
              // Apply the stored discount percentage (ensure it's stored as decimal)
              const discountPercentage = typeof data.discount_percentage === 'number' ? data.discount_percentage : 0;
              const finalPrice = Math.round(totalOriginalPrice * (1 - discountPercentage));
              
              parsedData = {
                ...parsedData,
                price: finalPrice,
                discount_percentage: discountPercentage // Ensure we keep the original discount percentage
              };

              console.log('Package price calculation:', {
                packageName: parsedData.name,
                originalPrice: totalOriginalPrice,
                discountPercentage: discountPercentage,
                finalPrice: finalPrice,
                selectedItems: selectedItems.map(item => {
                  const currentService = querySnapshot.docs
                    .find(doc => doc.id === item.service_id)?.data();
                  return {
                    id: item.service_id,
                    name: item.name,
                    originalPrice: item.price,
                    currentPrice: currentService?.price || item.price,
                    priceChanged: currentService?.price !== item.price
                  };
                })
              });
            } catch (error) {
              console.error('Error calculating package price:', error);
              // Keep the original price if calculation fails
              parsedData = {
                ...parsedData,
                price: data.price || 0
              };
            }
          }

          return parsedData;
        });

        console.log('FETCH_SERVICES: Completed fetching services', {
          count: fetchedServices.length,
          services: fetchedServices
        });

        return fetchedServices;
      } catch (error) {
        console.error('FETCH_SERVICES: Error fetching services:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  const addService = async (serviceData: InsertService) => {
    try {
      const docRef = doc(servicesCollection);
      const timestamp = new Date().toISOString();
      
      const newService: Service = {
        service_id: docRef.id,
        name: serviceData.name,
        description: serviceData.description || undefined,
        category: serviceData.category || ServiceCategory.SERVICE,
        duration: serviceData.duration,
        price: serviceData.price,
        discount_percentage: typeof serviceData.discount_percentage === 'number' ? serviceData.discount_percentage : 0,
        consumables: serviceData.consumables || [],
        isActive: true,
        created_at: new Date(timestamp),
        updated_at: new Date(timestamp)
      };

      const firestoreData = {
        name: newService.name,
        description: newService.description,
        category: newService.category,
        duration: newService.duration,
        price: newService.price,
        discount_percentage: typeof newService.discount_percentage === 'number' ? newService.discount_percentage : 0,
        consumables: newService.consumables.map(c => ({
          item_id: c.item_id,
          item_name: c.item_name,
          quantity_used: c.quantity_used
        })),
        isActive: newService.isActive,
        created_at: timestamp,
        updated_at: timestamp,
        selectedServices: (serviceData.selectedServices || []).map(service => ({
          service_id: service.service_id,
          name: service.name,
          duration: service.duration,
          price: service.price,
          category: service.category
        })),
        selectedAddons: (serviceData.selectedAddons || []).map(addon => ({
          service_id: addon.service_id,
          name: addon.name,
          duration: addon.duration,
          price: addon.price,
          category: addon.category
        }))
      };

      await setDoc(docRef, firestoreData);
      await queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({
        title: "Success",
        description: "Service added successfully",
        variant: "default"
      });
      return newService;
    } catch (error) {
      console.error('ADD_SERVICE: Error adding service:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to add service',
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateService = async (service_id: string, updateData: UpdateService) => {
    try {
      const serviceRef = doc(servicesCollection, service_id);
      const timestamp = new Date().toISOString();
      
      const updatePayload = {
        ...updateData,
        discount_percentage: typeof updateData.discount_percentage === 'number' ? updateData.discount_percentage : 0,
        updated_at: timestamp
      };

      // If consumables are being updated, ensure they're properly formatted
      if (updateData.consumables) {
        updatePayload.consumables = updateData.consumables.map(consumable => ({
          item_id: consumable.item_id,
          item_name: consumable.item_name,
          quantity_used: consumable.quantity_used
        }));
      }

      // Ensure selected services and addons are properly formatted for packages
      if (updateData.selectedServices) {
        updatePayload.selectedServices = updateData.selectedServices.map(service => ({
          service_id: service.service_id,
          name: service.name,
          duration: service.duration,
          price: service.price,
          category: service.category
        }));
      }

      if (updateData.selectedAddons) {
        updatePayload.selectedAddons = updateData.selectedAddons.map(addon => ({
          service_id: addon.service_id,
          name: addon.name,
          duration: addon.duration,
          price: addon.price,
          category: addon.category
        }));
      }

      await updateDoc(serviceRef, updatePayload);
      await queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({
        title: "Success",
        description: "Service updated successfully",
        variant: "default"
      });
      return true;
    } catch (error) {
      console.error('UPDATE_SERVICE: Error updating service:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update service',
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteService = async (id: string) => {
    try {
      const serviceRef = doc(servicesCollection, id);
      await deleteDoc(serviceRef);
      await queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({
        title: "Success",
        description: "Service deleted successfully",
        variant: "default"
      });
      return true;
    } catch (error) {
      console.error('DELETE_SERVICE: Error deleting service:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete service',
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    services,
    isLoading,
    addService,
    updateService,
    deleteService,
    ...rest
  };
}
