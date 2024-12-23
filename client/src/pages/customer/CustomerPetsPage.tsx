
import { useState } from "react";
import { usePets } from "@/hooks/use-pets";
import { useUser } from "@/hooks/use-user";
import { useRole } from "@/hooks/use-role";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PetForm } from "@/components/PetForm";
import { Pet } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export default function CustomerPetsPage() {
  const { user, isLoading: userLoading } = useUser();
  const { pets, addPet, updatePet } = usePets();
  const [showPetModal, setShowPetModal] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

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

  const { hasPermission } = useRole();
  const { toast } = useToast();
  const handleAddPet = async (formData: any) => {
    try {
      if (!user?.uid || !user?.email) {
        throw new Error('User not authenticated');
      }

      if (!hasPermission('manage_own_pets')) {
        throw new Error('You do not have permission to add pets');
      }
      
      const petData = {
        ...formData,
        customerId: user.uid,
        owner: {
          id: user.uid,
          name: user.displayName || user.email.split('@')[0],
          email: user.email
        }
      };
      
      console.log('Submitting pet with data:', petData);
      const result = await addPet(petData);
      
      if (result && result.success) {
        console.log('Pet added successfully:', result);
        toast({
          title: "Success",
          description: "Pet added successfully"
        });
        setShowPetModal(false);
        setSelectedPet(null);
      } else if (result && 'isDuplicate' in result) {
        toast({
          title: "Warning",
          description: "This pet was already added",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error adding pet:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add pet",
        variant: "destructive",
      });
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
          <Card key={pet.id} className="hover:shadow-lg transition-all duration-300 group">
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
                onClick={() => {
                  setSelectedPet(pet);
                  setShowPetModal(true);
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
