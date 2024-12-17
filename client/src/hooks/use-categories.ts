
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";

interface Category {
  id: string;
  name: string;
}

export function useCategories() {
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const querySnapshot = await getDocs(collection(db, "categories"));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Category[];
    }
  });

  const addCategory = async (category: Omit<Category, "id">) => {
    await addDoc(collection(db, "categories"), category);
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const updateCategory = async (id: string, category: Partial<Category>) => {
    await updateDoc(doc(db, "categories", id), category);
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const deleteCategory = async (id: string) => {
    await deleteDoc(doc(db, "categories", id));
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  return {
    categories,
    isLoading,
    addCategory,
    updateCategory,
    deleteCategory
  };
}
