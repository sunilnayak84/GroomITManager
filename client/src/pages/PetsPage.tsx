import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash } from "lucide-react";
import { usePets } from "../hooks/use-pets";
import { useCustomers } from "../hooks/use-customers";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription 
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import PetForm from "@/components/PetForm";
import type { Pet } from "@db/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPetSchema, type InsertPet } from "@db/schema";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function PetsPage() {
  const { pets, isLoading, addPet, updatePet, deletePet } = usePets();
  const { data: customers } = useCustomers();

  const [open, setOpen] = useState(false);
  const [showPetDetails, setShowPetDetails] = useState(false);
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

  const handleAddPet = async (data: InsertPet) => {
    console.error('PETS PAGE: handleAddPet called', { 
      data, 
      customers: customers?.map(c => c.id)
    });

    try {
      // Verify customer exists
      const selectedCustomer = customers?.find(c => c.id === data.customerId);
      if (!selectedCustomer) {
        console.error('PETS PAGE: Selected customer not found', { 
          customerId: data.customerId,
          availableCustomers: customers?.map(c => c.id)
        });
        toast({
          title: "Customer Error",
          description: "Selected customer not found. Please select a valid customer.",
          variant: "destructive"
        });
        return;
      }

      // Add the pet
      const newPet = await addPet(data);
      
      console.error('PETS PAGE: New pet added', { newPet });

      // Close the dialog
      setOpen(false);

      // Show success toast
      toast({
        title: "Success",
        description: "Pet added successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('PETS PAGE: Error adding pet', { 
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      // Show error toast
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add pet",
        variant: "destructive"
      });
    }
  };

  const handleUpdatePet = async (id: string, data: Partial<InsertPet>) => {
    try {
      await updatePet({
        id,
        ...data
      });
      setIsEditing(false);
      setSelectedPet(prevPet => prevPet ? { ...prevPet, ...data } : null);
      toast({
        title: "Success",
        description: "Pet updated successfully",
      });
    } catch (error) {
      console.error('Error updating pet:', error);
      toast({
        title: "Error",
        description: "Failed to update pet",
        variant: "destructive",
      });
    }
  };

  const handleDeletePet = async (id: string) => {
    try {
      await deletePet(id);
      setShowPetDetails(false);
      setSelectedPet(null);
      toast({
        title: "Success",
        description: "Pet deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting pet:', error);
      toast({
        title: "Error",
        description: "Failed to delete pet",
        variant: "destructive",
      });
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

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  const columns = [
    {
      header: "Pet",
      cell: (pet: Pet) => (
        <div className="flex items-center gap-2">
          <img
            src={pet.image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${pet.name}`}
            alt={pet.name}
            className="w-10 h-10 rounded-full bg-primary/10"
          />
          <div>
            <div className="font-medium">{pet.name}</div>
            <div className="text-sm text-muted-foreground capitalize">{pet.breed} · {pet.type}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Owner",
      cell: (pet: Pet) => {
        return pet.owner 
          ? `${pet.owner.name}` 
          : (customers?.find(c => c.id === pet.customerId) 
            ? `${customers.find(c => c.id === pet.customerId)?.firstName} ${customers.find(c => c.id === pet.customerId)?.lastName}` 
            : "N/A");
      },
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pets</h1>
          <p className="text-muted-foreground">Manage your client's pets</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Pet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Pet</DialogTitle>
              <DialogDescription>
                Fill in the details below to add a new pet.
              </DialogDescription>
            </DialogHeader>
            <PetForm 
              onSuccess={async (data) => {
                try {
                  await handleAddPet(data);
                  setOpen(false);
                } catch (error) {
                  console.error('Error in form submission:', error);
                }
              }}
              customers={customers}
              pet={selectedPet}
            />
          </DialogContent>
        </Dialog>
      </div>

      {selectedPet && (
        <Dialog open={showPetDetails} onOpenChange={(open) => {
          setShowPetDetails(open);
          if (!open) {
            setSelectedPet(null);
            setIsEditing(false);
          }
        }}>
          <DialogContent className="max-w-3xl">
            <DialogHeader className="flex justify-between items-center">
              <DialogTitle>Pet Details</DialogTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm"
                    >
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <p className="text-sm text-muted-foreground">
                        This action cannot be undone. This will permanently delete the pet.
                      </p>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          if (!selectedPet) return;
                          try {
                            await deletePet(selectedPet.id);
                            setShowPetDetails(false);
                            toast({
                              title: "Success",
                              description: "Pet deleted successfully",
                            });
                          } catch (error) {
                            console.error('Error deleting pet:', error);
                            toast({
                              title: "Error",
                              description: "Failed to delete pet",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </DialogHeader>

            {isEditing ? (
              <PetForm
                onSuccess={(data) => {
                  if (selectedPet) {
                    handleUpdatePet(selectedPet.id, data);
                  }
                }}
                onCancel={() => setIsEditing(false)}
                defaultValues={{
                  ...selectedPet,
                  customerId: selectedPet?.customerId || ""
                }}
                pet={selectedPet}
                customers={customers}
              />
            ) : (
              <div className="space-y-4">
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
                    <strong>Owner:</strong> {selectedPet.owner ? selectedPet.owner.name : (customers?.find(c => c.id === selectedPet.customerId) ? `${customers.find(c => c.id === selectedPet.customerId)?.firstName} ${customers.find(c => c.id === selectedPet.customerId)?.lastName}` : "N/A")}
                  </div>
                  <div>
                    <strong>Age:</strong> {selectedPet.age || "N/A"}
                  </div>
                  <div>
                    <strong>Gender:</strong> {selectedPet.gender ? selectedPet.gender.charAt(0).toUpperCase() + selectedPet.gender.slice(1) : "N/A"}
                  </div>
                  <div>
                    <strong>Date of Birth:</strong> {formatDate(selectedPet.dateOfBirth)}
                  </div>
                  <div>
                    <strong>Weight:</strong> {selectedPet.weight ? `${selectedPet.weight} ${selectedPet.weightUnit}` : "N/A"}
                  </div>
                  <div>
                    <strong>Height:</strong> {selectedPet.height ? `${selectedPet.height} ${selectedPet.heightUnit}` : "N/A"}
                  </div>
                  <div className="col-span-2">
                    <strong>Notes:</strong> {selectedPet.notes || "No notes available"}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

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
