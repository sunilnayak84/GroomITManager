
import { usePets } from "@/hooks/use-pets";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "wouter";

export default function CustomerPetsPage() {
  const { user } = useUser();
  const { pets } = usePets();
  
  const customerPets = pets.filter(
    (pet) => pet.owner?.id === user?.uid
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Pets</h1>
        <Link href="/customer/pets/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Pet
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {customerPets.map((pet) => (
          <Card key={pet.id}>
            <CardHeader>
              <CardTitle>{pet.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Type: {pet.type}</p>
              <p>Breed: {pet.breed}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
