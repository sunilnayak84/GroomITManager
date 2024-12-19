
import { useCallback, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";

export function useServices() {
  const [services, setServices] = useState([]);

  const fetchServices = useCallback(async () => {
    try {
      console.log("FETCH_SERVICES: Starting to fetch services");
      const servicesRef = collection(db, "services");
      const snapshot = await getDocs(servicesRef);
      const fetchedServices = snapshot.docs.map(doc => ({
        service_id: doc.id,
        ...doc.data()
      }));
      setServices(fetchedServices);
      console.log("FETCH_SERVICES: Completed fetching services", { count: fetchedServices.length, services: fetchedServices });
      return fetchedServices;
    } catch (error) {
      console.error("FETCH_SERVICES: Error fetching services:", error);
      throw error;
    }
  }, []);

  const addService = useCallback(async (serviceData) => {
    try {
      const servicesRef = collection(db, "services");
      const docRef = await addDoc(servicesRef, serviceData);
      await fetchServices();
      return docRef.id;
    } catch (error) {
      console.error("ADD_SERVICE: Error adding service:", error);
      throw error;
    }
  }, [fetchServices]);

  const updateService = useCallback(async (serviceId, updateData) => {
    try {
      const serviceRef = doc(db, "services", serviceId);
      await updateDoc(serviceRef, updateData);
      await fetchServices();
    } catch (error) {
      console.error("UPDATE_SERVICE: Error updating service:", error);
      throw error;
    }
  }, [fetchServices]);

  const deleteService = useCallback(async (serviceId) => {
    try {
      const serviceRef = doc(db, "services", serviceId);
      await deleteDoc(serviceRef);
      await fetchServices();
    } catch (error) {
      console.error("DELETE_SERVICE: Error deleting service:", error);
      throw error;
    }
  }, [fetchServices]);

  return {
    services,
    fetchServices,
    addService,
    updateService,
    deleteService,
  };
}
