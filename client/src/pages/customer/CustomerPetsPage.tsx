import { useState } from "react";
import { usePets } from "@/hooks/use-pets";
import { useUser } from "@/hooks/use-user";
import { useRole } from "@/hooks/use-role";
import { useCustomers } from "@/hooks/use-customers";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PetForm } from "@/components/PetForm";
import { Pet } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export default function CustomerPetsPage() {
  const { user, isLoading: userLoading } = useUser();
  const { pets, addPet, updatePet } = usePets();
  const [showPetModal, setShowPetModal] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Updated to use correct user identifier and handle both ID formats
  const customerPets = pets.filter((pet) =>
    pet.customerId === user.id || 
    pet.customerId === user.uid ||
    pet.owner?.email === user.email
  );

  const { hasPermission } = useRole();
  const { toast } = useToast();

  const { customers } = useCustomers();
  const handleAddPet = async (formData: any) => {
    if (isSubmitting) {
      console.log('[ADD_PET] Submission already in progress, skipping');
      return false;
    }

    try {
      setIsSubmitting(true);
      console.log('[ADD_PET] Starting submission with form data:', formData);

      if (!user?.email) {
        throw new Error('User not authenticated');
      }

      // Generate a unique submission ID
      const submissionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Find customer ID based on the authenticated user's email
      const customerData = customers.find(c => c.email === user.email);
      
      if (!customerData?.id) {
        throw new Error('Customer record not found');
      }

      const customerId = customerData.id;
      
      const petData = {
        ...formData,
        customerId,
        owner: {
          id: customerId,
          name: user.name || user.email,
          email: user.email
        },
        submissionId
      };

      console.log('[ADD_PET] Prepared pet data:', petData);
      const result = await addPet(petData);

      if (!result) {
        throw new Error('Failed to add pet');
      }

      console.log('[ADD_PET] Pet created successfully:', result);

      toast({
        title: "Success",
        description: "Pet added successfully",
        variant: "default"
      });

      setShowPetModal(false);
      return true;
    } catch (error: any) {
      console.error('[ADD_PET] Error:', error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePet = async (formData: any) => {
    if (isSubmitting) {
      console.log('[UPDATE_PET] Submission already in progress, skipping');
      return false;
    }

    if (!selectedPet?.id) {
      console.error('[UPDATE_PET] No pet selected for update');
      toast({
        title: "Error",
        description: "No pet selected for update",
        variant: "destructive"
      });
      return false;
    }

    try {
      setIsSubmitting(true);
      console.log('[UPDATE_PET] Starting update for pet:', selectedPet.id);

      // Preserve the original customerId and owner
      const updateData = {
        ...formData,
        customerId: selectedPet.customerId,
        owner: selectedPet.owner
      };

      await updatePet({ 
        petId: selectedPet.id, 
        updateData 
      });

      console.log('[UPDATE_PET] Pet updated successfully');
      toast({
        title: "Success",
        description: "Pet updated successfully",
        variant: "default"
      });

      setShowPetModal(false);
      setSelectedPet(null);
      return true;
    } catch (error: any) {
      console.error('[UPDATE_PET] Failed to update pet:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update pet",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Pets</h1>
        <Button
          onClick={() => {
            if (!isSubmitting) {
              setSelectedPet(null);
              setShowPetModal(true);
            }
          }}
          className="gap-2 bg-primary hover:bg-primary/90"
          disabled={isSubmitting}
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
                  if (!isSubmitting) {
                    setSelectedPet(pet);
                    setShowPetModal(true);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={isSubmitting}
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

      <Dialog 
        open={showPetModal} 
        onOpenChange={(open) => {
          if (!isSubmitting) {
            setShowPetModal(open);
            if (!open) {
              setSelectedPet(null);
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogTitle className="text-xl font-semibold mb-4">
            {selectedPet ? 'Edit Pet' : 'Add New Pet'}
          </DialogTitle>
          <PetForm
            handleSubmit={selectedPet ? handleUpdatePet : handleAddPet}
            onCancel={() => !isSubmitting && setShowPetModal(false)}
            defaultValues={selectedPet ?? undefined}
            customerId={user?.id ?? ''}
            hideCustomerField={true}
            isEditing={!!selectedPet}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}