import { useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query } from 'firebase/firestore';
import { db } from "../lib/firebase";
import { toast } from "@/components/ui/use-toast";
import {
  Service,
  InsertService,
  UpdateService,
  serviceSchema,
  ServiceCategory,
  serviceConsumableSchema
} from "@/lib/service-types";

const servicesCollection = collection(db, 'services');

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
          try {
            const parsedData = serviceSchema.parse({
              service_id: doc.id,
              name: data.name,
              description: data.description || null,
              category: data.category || ServiceCategory.SERVICE,
              duration: data.duration,
              price: data.price || 0,
              discount_percentage: data.discount_percentage || 0,
              consumables: data.consumables || [],
              isActive: data.isActive ?? true,
              created_at: data.created_at || new Date(),
              updated_at: data.updated_at || new Date(),
              selectedServices: data.selectedServices || [],
              selectedAddons: data.selectedAddons || []
            });

            if (parsedData.category === ServiceCategory.PACKAGE) {
              const selectedItems = [
                ...(parsedData.selectedServices || []),
                ...(parsedData.selectedAddons || [])
              ];
              const totalOriginalPrice = selectedItems.reduce((sum, item) => {
                return sum + (item.price || 0);
              }, 0);
              
              const discountPercentage = parsedData.discount_percentage || 0;
              const finalPrice = Math.round(totalOriginalPrice * (1 - discountPercentage));
              
              return {
                ...parsedData,
                price: finalPrice,
                discount_percentage: discountPercentage
              };
            }

            return parsedData;
          } catch (error) {
            console.error('Error parsing service data:', error);
            throw error;
          }
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
    staleTime: 1000 * 60 * 5
  });

  const addService = async (serviceData: InsertService) => {
    try {
      console.log('Adding service with data:', serviceData);
      const docRef = doc(servicesCollection);
      const timestamp = new Date();

      // Process consumables with detailed validation and logging
      const processedConsumables = serviceData.consumables?.map(consumable => {
        try {
          console.log('Processing consumable:', consumable);
          const validated = serviceConsumableSchema.parse({
            item_id: consumable.item_id,
            item_name: consumable.item_name,
            quantity_used: Number(consumable.quantity_used)
          });
          console.log('Validated consumable:', validated);
          return validated;
        } catch (error) {
          console.error('Invalid consumable:', consumable, error);
          throw new Error(`Invalid consumable data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }) || [];
      
      console.log('Final processed consumables:', processedConsumables);

      console.log('Preparing data for Firestore:', serviceData);
      
      // Prepare data for Firestore
      const firestoreData = {
        name: serviceData.name,
        description: serviceData.description,
        category: serviceData.category,
        duration: serviceData.duration,
        price: serviceData.price,
        discount_percentage: serviceData.discount_percentage || 0,
        consumables: processedConsumables.map(c => ({
          item_id: c.item_id,
          item_name: c.item_name,
          quantity_used: Number(c.quantity_used)
        })),
        isActive: true,
        created_at: timestamp.toISOString(),
        updated_at: timestamp.toISOString(),
        selectedServices: serviceData.selectedServices?.map(service => ({
          service_id: service.service_id,
          name: service.name,
          duration: service.duration,
          price: service.price,
          category: service.category
        })) || [],
        selectedAddons: serviceData.selectedAddons?.map(addon => ({
          service_id: addon.service_id,
          name: addon.name,
          duration: addon.duration,
          price: addon.price,
          category: addon.category
        })) || []
      };

      await setDoc(docRef, firestoreData);
      await queryClient.invalidateQueries({ queryKey: ['services'] });
      
      toast({
        title: "Success",
        description: "Service added successfully",
        variant: "default"
      });

      return {
        service_id: docRef.id,
        ...firestoreData
      };
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
      const timestamp = new Date();

      const updatePayload: any = {
        ...updateData,
        updated_at: timestamp.toISOString()
      };

      if (updateData.consumables) {
        console.log('Processing consumables for update:', updateData.consumables);
        updatePayload.consumables = updateData.consumables.map(consumable => {
          try {
            const validated = serviceConsumableSchema.parse({
              item_id: consumable.item_id,
              item_name: consumable.item_name,
              quantity_used: Number(consumable.quantity_used)
            });

            console.log('Validated update consumable:', validated);
            return validated;
          } catch (error) {
            console.error('Error validating consumable during update:', consumable, error);
            throw error;
          }
        });
        console.log('Final processed update consumables:', updatePayload.consumables);
      }

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
