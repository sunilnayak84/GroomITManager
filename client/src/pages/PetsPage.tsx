import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash } from "lucide-react";
import { usePets } from "../hooks/use-pets";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCustomers } from "../hooks/use-customers";
import { useToast } from "@/hooks/use-toast";
import PetForm from "@/components/PetForm";
import type { Pet } from "@db/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPetSchema, type InsertPet } from "@db/schema";

export default function PetsPage() {
  const [open, setOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [showPetDetails, setShowPetDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { data: pets, isLoading, addPet, deletePet, updatePet } = usePets();
  const { data: customers } = useCustomers();
  const { toast } = useToast();

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
      height: undefined,
      heightUnit: "cm",
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
        height: selectedPet.height || undefined,
        heightUnit: selectedPet.heightUnit || "cm",
        image: selectedPet.image || null,
        notes: selectedPet.notes || undefined,
      });
    }
  }, [selectedPet, isEditing, editForm]);

  const handleDeletePet = async () => {
    if (!selectedPet) return;

    try {
      await deletePet(selectedPet.id);
      setShowPetDetails(false);
      toast({
        title: "Success",
        description: "Pet deleted successfully",
      });
    } catch (error) {
      console.error('Delete Pet Error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to delete pet: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

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
        const owner = customers?.find(c => c.id === pet.customerId);
        return owner ? `${owner.firstName} ${owner.lastName}` : "N/A";
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
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Pet</DialogTitle>
            </DialogHeader>
            <PetForm 
              onSuccess={(data) => {
                addPet({ ...data, createdAt: new Date() });
                setOpen(false);
                toast({
                  title: "Success",
                  description: "Pet added successfully",
                });
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Pet Details Dialog */}
        <Dialog open={showPetDetails} onOpenChange={setShowPetDetails}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Edit Pet Details" : "Pet Details"}
              </DialogTitle>
            </DialogHeader>
            {selectedPet && (
              <>
                {!isEditing ? (
                  <div className="space-y-6">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsEditing(true)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this pet?')) {
                            handleDeletePet();
                          }
                        }}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                    <div className="flex items-center gap-4">
                      <img
                        src={selectedPet.image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${selectedPet.name}`}
                        alt={selectedPet.name}
                        className="w-24 h-24 rounded-full bg-primary/10"
                      />
                      <div>
                        <h2 className="text-2xl font-bold">{selectedPet.name}</h2>
                        <p className="text-muted-foreground capitalize">{selectedPet.breed} · {selectedPet.type}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium mb-1">Owner</h3>
                        <p>{customers?.find(c => c.id === selectedPet.customerId)?.firstName} {customers?.find(c => c.id === selectedPet.customerId)?.lastName}</p>
                      </div>
                      <div>
                        <h3 className="font-medium mb-1">Age</h3>
                        <p>{selectedPet.age || "N/A"}</p>
                      </div>
                      <div>
                        <h3 className="font-medium mb-1">Gender</h3>
                        <p className="capitalize">{selectedPet.gender || "N/A"}</p>
                      </div>
                      <div>
                        <h3 className="font-medium mb-1">Date of Birth</h3>
                        <p>{formatDate(selectedPet.dateOfBirth)}</p>
                      </div>
                      <div>
                        <h3 className="font-medium mb-1">Weight</h3>
                        <p>{selectedPet.weight ? `${selectedPet.weight} ${selectedPet.weightUnit}` : "N/A"}</p>
                      </div>
                      <div>
                        <h3 className="font-medium mb-1">Height</h3>
                        <p>{selectedPet.height ? `${selectedPet.height} ${selectedPet.heightUnit}` : "N/A"}</p>
                      </div>
                      <div className="col-span-2">
                        <h3 className="font-medium mb-1">Notes</h3>
                        <p className="text-muted-foreground">{selectedPet.notes || "No notes available"}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <PetForm
                    defaultValues={{
                      name: selectedPet.name,
                      type: selectedPet.type,
                      breed: selectedPet.breed,
                      customerId: selectedPet.customerId,
                      dateOfBirth: selectedPet.dateOfBirth || undefined,
                      age: selectedPet.age || undefined,
                      gender: selectedPet.gender || undefined,
                      weight: selectedPet.weight || undefined,
                      weightUnit: selectedPet.weightUnit,
                      height: selectedPet.height || undefined,
                      heightUnit: selectedPet.heightUnit,
                      image: selectedPet.image || undefined,
                      notes: selectedPet.notes || undefined
                    }}
                    pet={{
                      ...selectedPet,
                      id: selectedPet.id ?? undefined
                    }}
                    updatePet={updatePet}
                    onCancel={() => {
                      console.log('Selected Pet before closing:', selectedPet);
                      setSelectedPet(null);
                      setOpen(false);
                    }}
                  />
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

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
            {(pets || []).map((pet, index) => (
              <TableRow key={pet.id || `pet-${index}`}>
                {columns.map((column) => (
                  <TableCell key={`${pet.id || `pet-${index}`}-${column.header}`}>
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
