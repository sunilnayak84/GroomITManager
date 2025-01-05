import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";

async function fixPetCounts() {
  try {
    // Get all customers
    const customersSnapshot = await getDocs(collection(db, "customers"));
    const customers = customersSnapshot.docs;

    // Get all non-deleted pets
    const petsQuery = query(
      collection(db, "pets"),
      where("deleted", "==", false),
    );
    const petsSnapshot = await getDocs(petsQuery);
    const pets = petsSnapshot.docs;

    // Calculate pet counts
    const petCounts = new Map<string, number>();
    pets.forEach((pet) => {
      const customerId = pet.data().customerId;
      if (customerId) {
        petCounts.set(customerId, (petCounts.get(customerId) || 0) + 1);
      }
    });

    // Update customer documents
    for (const customer of customers) {
      const count = petCounts.get(customer.id) || 0;
      await updateDoc(doc(db, "customers", customer.id), {
        petCount: count,
      });
      console.log(`Updated petCount for customer ${customer.id} to ${count}`);
    }

    console.log("Successfully updated all pet counts");
  } catch (error) {
    console.error("Error fixing pet counts:", error);
  }
}

fixPetCounts();
