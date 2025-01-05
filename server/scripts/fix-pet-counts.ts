
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from 'firebase-admin/firestore';

async function fixPetCounts() {
  try {
    // Get all customers
    const customersSnapshot = await db.collection("customers").get();
    const customers = customersSnapshot.docs;

    // Get all non-deleted pets
    const petsQuery = db.collection("pets").where("deleted", "==", false);
    const petsSnapshot = await petsQuery.get();
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
      await db.collection("customers").doc(customer.id).update({
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
