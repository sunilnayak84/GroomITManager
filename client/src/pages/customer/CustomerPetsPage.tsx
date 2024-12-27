
import { useState } from "react";
import { usePets } from "@/hooks/use-pets";
import { useUser } from "@/hooks/use-user";
import { useRole } from "@/hooks/use-role";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PetForm } from "@/components/PetForm";
import { PetDetails } from "@/components/PetDetails";
import { Pet } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export default function CustomerPetsPage() {
  const [showPetModal, setShowPetModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const { user, isLoading: userLoading } = useUser();
  const { pets, addPet, updatePet } = usePets();
  const [showAddPetDialog, setShowAddPetDialog] = useState(false);
  const { hasPermission } = useRole();
  const { toast } = useToast();

  if (userLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-semibold">Please log in to view your pets.</h2>
      </div>
    </div>;
  }

  const customerPets = pets.filter((pet) =>
    pet.customerId === user.uid ||
    pet.owner?.email === user.email
  );

  const handleAddPet = async (formData: any) => {
    try {
      if (!user?.uid || !user?.email) {
        throw new Error('User not authenticated');
      }

      const petData = {
        ...formData,
        customerId: user.uid,
        owner: {
          id: user.uid,
          name: user.displayName || 'Unknown',
          email: user.email
        }
      };

      console.log('Submitting pet data:', petData);
      const result = await addPet(petData);
      
      if (!result) {
        throw new Error('No response from server');
      }

      toast({
        title: "Success",
        description: "Pet added successfully",
        variant: "success"
      });
      
      setShowAddPetDialog(false);
      setShowPetModal(false);
      return true;
    } catch (error: any) {
      console.error('Error adding pet:', error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleUpdatePet = async (formData: any) => {
    if (!selectedPet?.id) {
      toast({
        title: "Error",
        description: "No pet selected for update",
        variant: "destructive"
      });
      return false;
    }
    try {
      await updatePet({ 
        petId: selectedPet.id, 
        updateData: formData 
      });
      toast({
        title: "Success",
        description: "Pet updated successfully",
        variant: "success"
      });
      setShowPetModal(false);
      setSelectedPet(null);
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update pet",
        variant: "destructive"
      });
      return false;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Pets</h1>
        <Button
          onClick={() => {
            setSelectedPet(null);
            setShowPetModal(true);
          }}
          className="gap-2 bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Pet
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {customerPets.map((pet) => (
          <Card 
            key={pet.id} 
            className="hover:shadow-lg transition-all duration-300 group cursor-pointer"
            onClick={() => {
              setSelectedPet(pet);
              setShowPetModal(true);
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                {pet.image ? (
                  <img
                    src={pet.image}
                    alt={pet.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary">
                      {pet.name?.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <CardTitle className="text-xl">{pet.name}</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPet(pet);
                  setShowEditModal(true);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="capitalize">{pet.type}</Badge>
                  <Badge variant="outline" className="capitalize">{pet.breed}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Age:</span>
                    <span className="ml-2">{pet.age} years</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Weight:</span>
                    <span className="ml-2">{pet.weight} {pet.weightUnit}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showPetModal} onOpenChange={setShowPetModal}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Pet Details</DialogTitle>
            <DialogDescription>View and manage pet information</DialogDescription>
          </DialogHeader>
          {selectedPet && (
            <PetDetails
              pet={selectedPet}
              formatDate={(date) => date ? new Date(date).toLocaleDateString() : 'N/A'}
              onEdit={() => {
                setShowPetModal(false);
                setShowEditModal(true);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogTitle className="text-xl font-semibold mb-4">
            Edit Pet
          </DialogTitle>
          <PetForm
            handleSubmit={handleUpdatePet}
            onCancel={() => setShowEditModal(false)}
            defaultValues={selectedPet ?? undefined}
            customerId={user?.uid ?? ''}
            hideCustomerField={true}
            isEditing={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
