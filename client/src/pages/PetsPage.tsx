import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePets } from "@/hooks/use-pets";
import { useCustomers } from "@/hooks/use-customers";
import { PetForm } from "@/components/PetForm";
import { useToast } from "@/hooks/use-toast";
import type { InsertPet } from "@/lib/types";
import type { Pet } from "@/hooks/use-pets";
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

import React, { useState, useEffect } from "react";

const columns = [
  {
    header: "Pet",
    cell: (pet: Pet) => (
      <div className="flex items-center gap-3">
        {pet.image && (
          <img
            src={pet.image}
            alt={pet.name}
            className="h-10 w-10 rounded-full"
          />
        )}
        <div>
          <div className="font-medium">{pet.name}</div>
          <div className="text-sm text-muted-foreground capitalize">
            {pet.breed} · {pet.type}
          </div>
        </div>
      </div>
    ),
  },
  {
    header: "Owner",
    cell: (pet: Pet) => {
      if (pet.owner) {
        return `${pet.owner.firstName} ${pet.owner.lastName}`;
      }
      return 'N/A';
    },
  },
  {
    header: "Age",
    cell: (pet: Pet) => pet.age || "N/A",
  },
  {
    header: "Gender",
    cell: (pet: Pet) => 
      pet.gender ? pet.gender.charAt(0).toUpperCase() + pet.gender.slice(1) : "N/A",
  },
  {
    header: "Actions",
    cell: (pet: Pet) => (
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => {
          setSelectedPet(pet);
          setShowPetDetails(true);
        }}
      >
        View Details
      </Button>
    ),
  },
];

export default function PetsPage() {
  const { pets, isLoading, updatePet, deletePet, addPet } = usePets();
  const { customers } = useCustomers();
  const [showPetDetails, setShowPetDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (pets) {
      console.log('PetsPage Debug:', {
        petsCount: pets.length,
        pets: pets.map(p => ({
          id: p.id,
          name: p.name,
          customerId: p.customerId,
          owner: p.owner
        }))
      });
    }
    if (customers) {
      console.log('PetsPage Customers Debug:', {
        customersCount: customers.length,
        customers: customers.map(c => ({
          id: c.id,
          name: `${c.firstName} ${c.lastName}`
        }))
      });
    }
  }, [pets, customers]);

  const handleUpdatePet = async (data: InsertPet) => {
    if (!selectedPet?.id) {
      console.error('No pet selected for update');
      return;
    }
    
    try {
      console.log('Update pet data:', {
        petId: selectedPet.id,
        updateData: data
      });

      await updatePet(selectedPet.id, data);
      
      toast({
        title: "Success",
        description: "Pet updated successfully",
      });
      setIsEditing(false);
      setShowPetDetails(false);
      setSelectedPet(null);
    } catch (error) {
      console.error('Error updating pet:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update pet",
        variant: "destructive",
      });
    }
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

  const renderColumns = columns.map((column) => ({
    ...column,
    cell: (pet: Pet) => column.cell(pet),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pets</h2>
          <p className="text-muted-foreground">
            Here&apos;s a list of all pets in your system
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedPet(null);
            setIsEditing(true);
            setShowPetDetails(true);
          }}
        >
          Add Pet
        </Button>
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
                  if (selectedPet) {
                    await handleUpdatePet(data);
                  } else {
                    await addPet(data);
                    setShowPetDetails(false);
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
                customerId={selectedPet?.customerId ?? (customers?.length > 0 ? customers[0].firebaseId : undefined)}
                addPet={addPet}
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
                  await deletePet(selectedPet.id);
                  setShowDeleteConfirm(false);
                  setShowPetDetails(false);
                  setSelectedPet(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              {renderColumns.map((column) => (
                <TableHead key={column.header}>{column.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pets?.map((pet) => (
              <TableRow key={pet.id}>
                {renderColumns.map((column) => (
                  <TableCell key={`${pet.id}-${column.header}`}>
                    {column.cell(pet)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
