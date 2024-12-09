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
      <div className="relative h-48 rounded-xl overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1450778869180-41d0601e046e"
          alt="Professional Pet Care"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent flex items-center p-8">
          <div className="text-white">
            <h2 className="text-2xl font-bold">Pets Management</h2>
            <p>Manage and track all your furry friends</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6 gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by pet name, owner, or breed..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base bg-white shadow-sm"
            />
          </div>
        </div>
        <Button
          size="lg"
          onClick={() => {
            setSelectedPet(null);
            setIsEditing(false);
            setShowPetDetails(true);
          }}
          className="h-12 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add New Pet
        </Button>
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
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
                  <div className="flex items-center gap-4">
                    {pet.image ? (
                      <Avatar className="h-12 w-12 border-2 border-purple-100">
                        <AvatarImage src={pet.image} alt={pet.name} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-100 to-pink-100 text-purple-600">
                          {pet.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Avatar className="h-12 w-12 border-2 border-purple-100">
                        <AvatarFallback className="bg-gradient-to-br from-purple-100 to-pink-100 text-purple-600">
                          {pet.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <div className="font-semibold text-base">{pet.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="capitalize">{pet.type}</span>
                        <span>•</span>
                        <span>{pet.breed}</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{pet.owner?.name || 'N/A'}</div>
                  {pet.owner?.email && (
                    <div className="text-sm text-muted-foreground">{pet.owner.email}</div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{pet.age || 'N/A'}</span>
                    <span className="text-sm text-muted-foreground">Years old</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                    pet.gender === 'male' ? 'bg-blue-100 text-blue-700' :
                    pet.gender === 'female' ? 'bg-pink-100 text-pink-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {pet.gender ? pet.gender.charAt(0).toUpperCase() + pet.gender.slice(1) : 'Unknown'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    className="hover:bg-purple-50 hover:text-purple-600"
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
                handleSubmit={async (data) => {
                  if (selectedPet) {
                    return handleUpdatePet(data);
                  } else {
                    return addPet(data);
                  }
                }}
                onSuccess={async (data) => {
                  setShowPetDetails(false);
                  setIsEditing(false);
                  await refetch();
                  toast({
                    title: "Success",
                    description: selectedPet ? "Pet updated successfully" : "Pet added successfully",
                  });
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
