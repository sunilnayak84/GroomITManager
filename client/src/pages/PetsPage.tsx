import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { usePets } from "../hooks/use-pets";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCustomers } from "../hooks/use-customers";
import { useToast } from "@/hooks/use-toast";
import PetForm from "@/components/PetForm";
import type { Pet } from "@db/schema";

export default function PetsPage() {
  const [open, setOpen] = useState(false);
  const { data: pets, isLoading, addPet } = usePets();
  const { data: customers } = useCustomers();
  const { toast } = useToast();

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
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
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

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {(pets || []).map((pet: Pet) => (
          <div key={pet.id} className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <img
                src={pet.image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${pet.name}`}
                alt={pet.name}
                className="w-16 h-16 rounded-full"
              />
              <div>
                <h3 className="font-semibold text-lg">{pet.name}</h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {pet.breed} · {pet.type}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{pet.notes}</p>
            <Button variant="outline" className="w-full mt-4">
              View Details
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
