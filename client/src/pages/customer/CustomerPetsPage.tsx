
import { useState } from "react";
import { usePets } from "@/hooks/use-pets";
import { useUser } from "@/hooks/use-user";
import { useRole } from "@/hooks/use-role";
import { useCustomers } from "@/hooks/use-customers";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, PackagePlus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PetForm } from "@/components/PetForm";
import { Pet } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerPetsPage() {
  const { user, isLoading: userLoading } = useUser();
  const { pets, addPet, updatePet, isLoading: petsLoading } = usePets();
  const [showPetModal, setShowPetModal] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (userLoading || petsLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <Skeleton className="h-6 w-32" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold">Please log in to view your pets</h2>
          <p className="text-muted-foreground">You need to be logged in to access this page</p>
        </div>
      </div>
    );
  }

  const customerPets = pets.filter((pet) =>
    pet.customerId === user.id || 
    pet.customerId === user.uid ||
    pet.owner?.email === user.email
  );

  if (customerPets.length === 0) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Pets</h1>
          <Button
            onClick={() => setShowPetModal(true)}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Pet
          </Button>
        </div>
        
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <PackagePlus className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No pets added yet</h3>
          <p className="text-muted-foreground mb-6">Add your first pet to start booking appointments</p>
          <Button onClick={() => setShowPetModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Your First Pet
          </Button>
        </Card>

        <Dialog open={showPetModal} onOpenChange={setShowPetModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogTitle>Add New Pet</DialogTitle>
            <PetForm
              handleSubmit={handleAddPet}
              onCancel={() => setShowPetModal(false)}
              customerId={user.id}
              hideCustomerField={true}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const { hasPermission } = useRole();
  const { toast } = useToast();
  const { customers } = useCustomers();

  // Rest of the existing handleAddPet and handleUpdatePet functions...
  [Previous implementation of handleAddPet and handleUpdatePet remains the same]

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
