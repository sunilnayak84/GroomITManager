import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { usePets } from "../hooks/use-pets";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCustomers } from "../hooks/use-customers";
import { useToast } from "@/hooks/use-toast";
import PetForm from "@/components/PetForm";
import type { Pet } from "@db/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function PetsPage() {
  const [open, setOpen] = useState(false);
  const { data: pets, isLoading, addPet } = usePets();
  const { data: customers } = useCustomers();
  const { toast } = useToast();

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
        <Button variant="outline" size="sm">
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
            {(pets || []).map((pet) => (
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
