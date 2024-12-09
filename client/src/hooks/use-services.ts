import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { type Service, type InsertService } from "@/lib/schema";
import { db } from "@/lib/firebase";
import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc } from "firebase/firestore";

const servicesCollection = collection(db, "services");

export function useServices() {
  const queryClient = useQueryClient();

  const { data: services, ...rest } = useQuery<Service[]>({
    queryKey: ["services"],
    queryFn: async () => {
      const snapshot = await getDocs(servicesCollection);
      return snapshot.docs.map(doc => ({
        id: parseInt(doc.id),
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt?.toDate() || null,
      } as Service));
    }
  });

  const addServiceMutation = useMutation({
    mutationFn: async (newService: InsertService) => {
      try {
        const docRef = doc(servicesCollection);
        await setDoc(docRef, {
          ...newService,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        await queryClient.invalidateQueries({ queryKey: ['services'] });
        toast.success('Service added successfully');
        return { id: parseInt(docRef.id), ...newService };
      } catch (error) {
        console.error('ADD_SERVICE: Error adding service:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to add service');
        throw error;
      }
    }
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Service> & { id: number }) => {
      try {
        const serviceRef = doc(servicesCollection, id.toString());
        await updateDoc(serviceRef, {
          ...data,
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
    }
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
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
    }
  });

  return {
    services,
    isLoading: rest.isLoading,
    addService: addServiceMutation.mutateAsync,
    updateService: updateServiceMutation.mutateAsync,
    deleteService: deleteServiceMutation.mutateAsync,
  };
}
