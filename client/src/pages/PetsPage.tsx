import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useToast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPetSchema, type InsertPet } from "@db/schema";
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

export default function PetsPage() {
  const { pets, isLoading, updatePet, deletePet } = usePets();
  const { customers } = useCustomers();

  const [showPetDetails, setShowPetDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { toast } = useToast();

  // Debug logging
  useEffect(() => {
    if (pets) {
      console.log('PetsPage Debug:', JSON.stringify({
        petsCount: pets.length,
        pets: pets.map(p => ({
          id: p.id,
          name: p.name,
          customerId: p.customerId,
          owner: p.owner
        }))
      }, null, 2));
    }
    if (customers) {
      console.log('PetsPage Customers Debug:', JSON.stringify({
        customersCount: customers.length,
        customers: customers.map(c => ({
          id: c.id,
          name: `${c.firstName} ${c.lastName}`
        }))
      }, null, 2));
    }
  }, [pets, customers]);

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      // Handle Firestore timestamp
      if (date?.seconds) {
        return new Date(date.seconds * 1000).toLocaleDateString();
      }
      // Handle string date
      return new Date(date).toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  // Get owner name helper function
  const getOwnerName = (pet: Pet) => {
    if (pet.owner) {
      return `${pet.owner.firstName} ${pet.owner.lastName}`;
    }
    const owner = customers?.find(c => c.id === pet.customerId);
    return owner ? `${owner.firstName} ${owner.lastName}` : 'N/A';
  };

  const handleUpdatePet = async (data: InsertPet) => {
    if (!selectedPet) return;
    
    try {
      await updatePet(selectedPet.id, data);
      setIsEditing(false);
      setShowPetDetails(false);
      setSelectedPet(null);
    } catch (error) {
      console.error('Error updating pet:', error);
      throw error;
    }
  };

  const editForm = useForm<InsertPet>({
    resolver: zodResolver(insertPetSchema),
    defaultValues: {
      name: "",
      type: "dog",
      breed: "",
      customerId: 0,
      dateOfBirth: undefined,
      age: undefined,
      gender: undefined,
      weight: undefined,
      weightUnit: "kg",
      image: null,
      notes: undefined,
    },
  });

  // Populate edit form when pet is selected
  React.useEffect(() => {
    if (selectedPet && isEditing) {
      editForm.reset({
        name: selectedPet.name,
        type: selectedPet.type,
        breed: selectedPet.breed,
        customerId: selectedPet.customerId,
        dateOfBirth: selectedPet.dateOfBirth || undefined,
        age: selectedPet.age || undefined,
        gender: selectedPet.gender || undefined,
        weight: selectedPet.weight || undefined,
        weightUnit: selectedPet.weightUnit || "kg",
        image: selectedPet.image || null,
        notes: selectedPet.notes || undefined,
      });
    }
  }, [selectedPet, isEditing, editForm]);

  const columns = [
    {
      header: "Pet",
      cell: (pet: Pet) => (
        <div className="flex items-center gap-3">
          {pet.imageUrl && (
            <img
              src={pet.imageUrl}
              alt={pet.name}
              className="h-10 w-10 rounded-full"
            />
          )}
          <div>
            <div className="font-medium">{pet.name}</div>
            <div className="text-sm text-muted-foreground capitalize">{pet.breed} · {pet.type}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Owner",
      cell: (pet: Pet) => getOwnerName(pet),
    },
    {
      header: "Age",
      cell: (pet: Pet) => pet.age || "N/A",
    },
    {
      header: "Gender",
      cell: (pet: Pet) => pet.gender ? pet.gender.charAt(0).toUpperCase() + pet.gender.slice(1) : "N/A",
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

  useEffect(() => {
    if (pets) {
      // Update the table with the latest pets data
    }
  }, [pets]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pets</h2>
          <p className="text-muted-foreground">
            Here&apos;s a list of all pets in your system
          </p>
        </div>
      </div>

      {selectedPet && (
        <Dialog open={showPetDetails} onOpenChange={(open) => {
          setShowPetDetails(open);
          if (!open) {
            setSelectedPet(null);
            setIsEditing(false);
          }
        }}>
          <DialogContent className="sm:max-w-[425px]">
            {isEditing ? (
              <>
                <DialogHeader>
                  <DialogTitle>Edit Pet</DialogTitle>
                </DialogHeader>
                <PetForm
                  onSuccess={(data) => {
                    if (selectedPet) {
                      handleUpdatePet(data);
                    }
                  }}
                  onCancel={() => setIsEditing(false)}
                  defaultValues={selectedPet}
                  pet={selectedPet}
                  customers={customers}
                />
              </>
            ) : (
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

                {selectedPet.imageUrl && (
                  <div className="flex justify-center mb-4">
                    <img
                      src={selectedPet.imageUrl}
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
                    <strong>Owner:</strong> {selectedPet.owner ? `${selectedPet.owner.firstName} ${selectedPet.owner.lastName}` : getOwnerName(selectedPet)}
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
      )}

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

      <div className="relative h-48 rounded-xl overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b"
          alt="Pet Care"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent flex items-center p-8">
          <div className="text-white">
            <h2 className="text-2xl font-bold mb-2">Pet Profiles</h2>
            <p>Keep detailed records of all pets</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.header}>{column.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pets?.map((pet) => (
              <TableRow key={pet.id}>
                {columns.map((column) => (
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
