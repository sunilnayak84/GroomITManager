import { useState, useEffect, useMemo } from "react";
import { usePets } from "@/hooks/use-pets";
import { useCustomers } from "@/hooks/use-customers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

import type { InsertPet, Pet } from "@/lib/types";

export default function PetsPage() {
  const { 
    pets, 
    isLoading, 
    addPet, 
    updatePet,
    deletePet,
    refetch 
  } = usePets();
  const { customers } = useCustomers();
  const [showPetModal, setShowPetModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [data, setData] = useState<Pet[]>([]);
  const [optimisticPets, setOptimisticPets] = useState<{ [key: string]: Pet }>({});
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
    if (pets && customers) {
      const mergedPets = pets.map(pet => {
        const optimisticUpdate = optimisticPets[pet.id];
        return optimisticUpdate || pet;
      });
      setData(mergedPets);
    }
  }, [pets, customers, optimisticPets]);

  const handleUpdatePet = async (formData: InsertPet) => {
    if (!selectedPet) {
      throw new Error('No pet selected for update');
    }

    const optimisticPet: Pet = {
      ...selectedPet,
      name: formData.name,
      type: formData.type,
      breed: formData.breed,
      customerId: formData.customerId,
      dateOfBirth: formData.dateOfBirth || null,
      age: formData.age || null,
      gender: formData.gender || null,
      weight: formData.weight || null,
      weightUnit: formData.weightUnit || "kg",
      notes: formData.notes || null,
      image: typeof formData.image === 'string' ? formData.image : selectedPet.image,
      owner: formData.owner || null,
      updatedAt: new Date().toISOString(),
    };

    setOptimisticPets(prev => ({
      ...prev,
      [selectedPet.id]: optimisticPet
    }));

    try {
      await updatePet({ 
        petId: selectedPet.id, 
        updateData: formData
      });
      
      setOptimisticPets(prev => {
        const { [selectedPet.id]: _, ...rest } = prev;
        return rest;
      });
    } catch (error) {
      setOptimisticPets(prev => {
        const { [selectedPet.id]: _, ...rest } = prev;
        return rest;
      });
      throw error;
    }
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
            setShowPetModal(true);
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
                      setShowPetModal(true);
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
        open={showPetModal}
        onOpenChange={(open) => {
          setShowPetModal(open);
          if (!open) {
            setSelectedPet(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedPet ? 'Edit Pet' : 'Add New Pet'}</DialogTitle>
            <DialogDescription>
              {selectedPet ? 'Update the pet information below.' : 'Fill in the pet details below.'}
            </DialogDescription>
          </DialogHeader>
          <PetForm
            handleSubmit={async (data) => {
              try {
                if (selectedPet) {
                  await handleUpdatePet(data);
                } else {
                  await addPet(data);
                }
                
                await refetch();
                
                toast({
                  title: "Success",
                  description: selectedPet ? "Pet updated successfully" : "Pet added successfully",
                });
                setShowPetModal(false);
                
                return true;
              } catch (error) {
                console.error('Error handling pet:', error);
                toast({
                  variant: "destructive",
                  title: "Error",
                  description: error instanceof Error ? error.message : "Failed to handle pet",
                });
                return false;
              }
            }}
            onCancel={() => setShowPetModal(false)}
            customers={customers}
            defaultValues={selectedPet ?? undefined}
            customerId={selectedPet?.customerId ?? (customers?.[0]?.firebaseId ?? '')}
            isEditing={!!selectedPet}
          />
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
                    setShowPetModal(false);
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