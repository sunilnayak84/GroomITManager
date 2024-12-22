
import { useState } from "react";
import { usePets } from "@/hooks/use-pets";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PetForm } from "@/components/PetForm";
import { Pet } from "@/lib/types";

export default function CustomerPetsPage() {
  const { user, isLoading: userLoading } = useUser();
  const { pets, addPet, updatePet } = usePets();
  const [showPetModal, setShowPetModal] = useState(false);

  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

  if (userLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Please log in to view your pets.</div>;
  }
  
  const customerPets = pets.filter((pet) => 
    pet.customerId === user.uid || 
    pet.owner?.email === user.email
  );

  const handleAddPet = async (formData: any) => {
    try {
      await addPet(formData);
      setShowPetModal(false);
      setSelectedPet(null);
    } catch (error) {
      console.error('Error adding pet:', error);
    }
  };

  const handleUpdatePet = async (formData: any) => {
    if (!selectedPet) return;
    try {
      await updatePet(selectedPet.id, formData);
      setShowPetModal(false);
      setSelectedPet(null);
    } catch (error) {
      console.error('Error updating pet:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Pets</h1>
        <Button onClick={() => {
          setSelectedPet(null);
          setShowPetModal(true);
        }} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Pet
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {customerPets.map((pet) => (
          <Card key={pet.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{pet.name}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedPet(pet);
                  setShowPetModal(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Type:</strong> {pet.type}</p>
                <p><strong>Breed:</strong> {pet.breed}</p>
                {pet.age && <p><strong>Age:</strong> {pet.age} years</p>}
                {pet.weight && (
                  <p>
                    <strong>Weight:</strong> {pet.weight} {pet.weightUnit}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showPetModal} onOpenChange={setShowPetModal}>
        <DialogContent className="sm:max-w-[600px]">
          <PetForm
            handleSubmit={selectedPet ? handleUpdatePet : handleAddPet}
            onCancel={() => setShowPetModal(false)}
            defaultValues={selectedPet ?? undefined}
            customerId={user?.uid ?? ''}
            hideCustomerField={true}
            isEditing={!!selectedPet}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
