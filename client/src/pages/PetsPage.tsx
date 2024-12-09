import { useState, useEffect, useMemo } from "react";
import { usePets } from "@/hooks/use-pets";
import { useCustomers } from "@/hooks/use-customers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { PetForm } from "@/components/PetForm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import type { InsertPet } from "@/lib/types";
import type { Pet } from "@/hooks/use-pets";

export default function PetsPage() {
  const { 
    pets, 
    isLoading, 
    addPet, 
    updatePet,
    deletePet,
    refetch,
    addPetMutation,
    updatePetMutation,
    deletePetMutation
  } = usePets();
  const { customers } = useCustomers();
  const [showPetDetails, setShowPetDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [data, setData] = useState<Pet[]>([]);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPets = useMemo(() => {
    return data?.filter(pet => 
      pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pet.owner?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pet.breed?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery]);

  useEffect(() => {
    console.log('PetsPage Debug:', {
      petsCount: pets?.length,
      pets
    });
  }, [pets]);

  useEffect(() => {
    console.log('PetsPage Customers Debug:', {
      customersCount: customers?.length,
      customers
    });
  }, [customers]);

  useEffect(() => {
    if (pets && customers) {
      console.log('Setting table data:', { pets, customers });
      setData(pets);
    }
  }, [pets, customers]);

  const handleUpdatePet = async (data: InsertPet) => {
    if (!selectedPet) {
      throw new Error('No pet selected for update');
    }
    
    // Ensure data types match the schema
    const updateData: InsertPet = {
      ...data,
      customerId: selectedPet.customerId,
      dateOfBirth: data.dateOfBirth || null,
      age: data.age || null,
      gender: data.gender || null,
      weight: data.weight || null,
      notes: data.notes || null,
      image: data.image || null
    };

    await updatePet({ 
      petId: selectedPet.id, 
      updateData
    });
  };

  const getOwnerName = (pet: Pet) => {
    if (pet.owner) {
      return `${pet.owner.firstName} ${pet.owner.lastName}`;
    }
    const owner = customers?.find(c => c.id === pet.customerId);
    return owner ? `${owner.firstName} ${owner.lastName}` : 'N/A';
  };

  const formatDate = (date: { seconds: number; nanoseconds: number; } | string | Date | null | undefined) => {
    if (!date) return 'N/A';
    try {
      if (typeof date === 'object' && 'seconds' in date) {
        return new Date(date.seconds * 1000).toLocaleDateString();
      }
      if (date instanceof Date) {
        return date.toLocaleDateString();
      }
      if (typeof date === 'string') {
        const parsedDate = new Date(date);
        return !isNaN(parsedDate.getTime()) ? parsedDate.toLocaleDateString() : 'Invalid Date';
      }
      return 'N/A';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="relative h-[200px] rounded-lg overflow-hidden mb-6 bg-gradient-to-r from-blue-500 to-blue-700">
        <div className="absolute inset-0">
          <img
            src="/pets-banner.jpg"
            alt="Pets Banner"
            className="w-full h-full object-cover opacity-50"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/50 to-blue-700/50" />
        <div className="relative p-6 flex flex-col h-full justify-end">
          <h1 className="text-3xl font-bold text-white mb-2">Pets</h1>
          <p className="text-white/90">Here's a list of all pets in your system</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="relative w-[300px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button onClick={() => {
          setSelectedPet(null);
          setIsEditing(false);
          setShowPetDetails(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Pet
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pet</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPets?.map((pet) => (
              <TableRow key={pet.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {pet.image ? (
                      <Avatar>
                        <AvatarImage src={pet.image} alt={pet.name} />
                        <AvatarFallback>{pet.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <Avatar>
                        <AvatarFallback>{pet.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <div className="font-medium">{pet.name}</div>
                      <div className="text-sm text-muted-foreground">{pet.breed} · {pet.type}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{pet.owner?.name || 'N/A'}</TableCell>
                <TableCell>{pet.age || 'N/A'}</TableCell>
                <TableCell>{pet.gender || 'Unknown'}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedPet(pet);
                      setShowPetDetails(true);
                    }}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredPets?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No pets found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog 
        open={showPetDetails} 
        onOpenChange={(open) => {
          setShowPetDetails(open);
          if (!open) {
            setSelectedPet(null);
            setIsEditing(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          {isEditing ? (
            <>

              <DialogHeader>
                <DialogTitle>{selectedPet ? 'Edit Pet' : 'Add New Pet'}</DialogTitle>
              </DialogHeader>
              <PetForm
                onSuccess={async (data) => {
                  try {
                    if (selectedPet) {
                      await handleUpdatePet(data);
                    } else {
                      await addPet(data);
                    }
                    setShowPetDetails(false);
                    setIsEditing(false);
                    await refetch();
                    toast({
                      title: "Success",
                      description: selectedPet ? "Pet updated successfully" : "Pet added successfully",
                    });
                  } catch (error) {
                    console.error('Error handling pet:', error);
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: error instanceof Error ? error.message : "Failed to handle pet",
                    });
                  }
                }}
                onCancel={() => {
                  setIsEditing(false);
                  if (!selectedPet) {
                    setShowPetDetails(false);
                  }
                }}
                customers={customers}
                defaultValues={selectedPet ?? undefined}
                customerId={selectedPet?.customerId ?? (customers?.[0]?.firebaseId ?? '')}
                isEditing={!!selectedPet}
              />
            </>

          ) : selectedPet && (
            <>

              <DialogHeader>
                <DialogTitle className="text-center">Pet Details</DialogTitle>
                <div className="flex justify-center gap-2 mt-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Delete
                  </Button>
                </div>
              </DialogHeader>

              {selectedPet.image && (
                <div className="flex justify-center mb-4">
                  <img
                    src={selectedPet.image}
                    alt={`${selectedPet.name}'s photo`}
                    className="rounded-full w-24 h-24 object-cover"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Name:</strong> {selectedPet.name}
                </div>
                <div>
                  <strong>Type:</strong> {selectedPet.type}
                </div>
                <div>
                  <strong>Breed:</strong> {selectedPet.breed}
                </div>
                <div>
                  <strong>Owner:</strong> {getOwnerName(selectedPet)}
                </div>
                <div>
                  <strong>Age:</strong> {selectedPet.age || 'N/A'}
                </div>
                <div>
                  <strong>Gender:</strong> {selectedPet.gender ? selectedPet.gender.charAt(0).toUpperCase() + selectedPet.gender.slice(1) : 'N/A'}
                </div>
                <div>
                  <strong>Date of Birth:</strong> {formatDate(selectedPet.dateOfBirth)}
                </div>
                <div>
                  <strong>Weight:</strong> {selectedPet.weight ? `${selectedPet.weight} ${selectedPet.weightUnit}` : 'N/A'}
                </div>
                <div className="col-span-2">
                  <strong>Notes:</strong> {selectedPet.notes || 'No notes available'}
                </div>
              </div>
            </>

          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this pet?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedPet?.name}'s record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (selectedPet) {
                  try {
                    await deletePet(selectedPet.id);
                    setShowDeleteConfirm(false);
                    setShowPetDetails(false);
                    setSelectedPet(null);
                    toast({
                      title: "Success",
                      description: "Pet deleted successfully"
                    });
                  } catch (error) {
                    console.error('Error deleting pet:', error);
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: error instanceof Error ? error.message : "Failed to delete pet"
                    });
                  }
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
