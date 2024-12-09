import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Service as ServiceType, InsertService } from "@db/schema";
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query } from 'firebase/firestore';
import { db } from "../lib/firebase";
import { toast } from "../lib/toast";

// Collection reference
const servicesCollection = collection(db, 'services');

export type Service = {
  id: number;
  name: string;
  description: string;
  duration: number;
  priceINR: number;
  isActive: boolean;
  createdAt: Date;
  category?: string;
  nameHindi?: string;
  descriptionHindi?: string;
  gstRate?: number;
  petTypes?: string[];
  includedServices?: string[];
  updatedAt?: Date | null;
};

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
          return {
            id: parseInt(doc.id),
            name: data.name,
            description: data.description,
            duration: data.duration,
            priceINR: data.priceINR,
            isActive: data.isActive ?? true,
            createdAt: data.createdAt?.toDate() || new Date(),
            category: data.category,
            nameHindi: data.nameHindi,
            descriptionHindi: data.descriptionHindi,
            gstRate: data.gstRate,
            petTypes: data.petTypes,
            includedServices: data.includedServices,
            updatedAt: data.updatedAt?.toDate() || null,
          };
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

  const addService = async (serviceData: Omit<InsertService, 'id'>) => {
    try {
      const docRef = doc(servicesCollection);
      const newService = {
        ...serviceData,
        isActive: true,
        createdAt: new Date(),
        id: parseInt(docRef.id),
        updatedAt: null
      };

      await setDoc(docRef, newService);
      await queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Service added successfully');
      return { id: parseInt(docRef.id), ...newService };
    } catch (error) {
      console.error('ADD_SERVICE: Error adding service:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add service');
      throw error;
    }
  };

  const updateService = async (id: number, updateData: Partial<InsertService>) => {
    try {
      const serviceRef = doc(servicesCollection, id.toString());
      await updateDoc(serviceRef, {
        ...updateData,
        updatedAt: new Date()
      });
      await queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Service updated successfully');
      return true;
    } catch (error) {
      console.error('UPDATE_SERVICE: Error updating service:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update service');
      throw error;
    }
  };

  const deleteService = async (id: number) => {
    try {
      const serviceRef = doc(servicesCollection, id.toString());
      await deleteDoc(serviceRef);
      await queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Service deleted successfully');
      return true;
    } catch (error) {
      console.error('DELETE_SERVICE: Error deleting service:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete service');
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
