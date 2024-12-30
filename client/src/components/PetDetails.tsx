
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Pet } from "@/lib/schema";
import { ServiceHistory } from "@/components/ServiceHistory";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";

interface PetDetailsProps {
  pet: Pet & {
    image: string | null;
    owner: {
      id: string;
      name: string;
      email: string | null;
    } | null;
  };
  onEdit?: () => void;
  onDelete?: () => void;
  formatDate: (date: string | null) => string;
}

export function PetDetails({ pet, onEdit, onDelete, formatDate }: PetDetailsProps) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <div className="flex items-start gap-4 mb-6">
          {pet.image ? (
            <img
              src={pet.image}
              alt={pet.name}
              className="w-24 h-24 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-semibold">
                {pet.name.substring(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold">{pet.name}</h2>
            <p className="text-muted-foreground">
              {pet.type} • {pet.breed}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Basic Information</h3>
            <div className="space-y-2">
              <p><span className="text-muted-foreground">Type:</span> {pet.type}</p>
              <p><span className="text-muted-foreground">Breed:</span> {pet.breed}</p>
              <p><span className="text-muted-foreground">Gender:</span> {pet.gender ? pet.gender.charAt(0).toUpperCase() + pet.gender.slice(1) : 'Not specified'}</p>
              <p><span className="text-muted-foreground">Age:</span> {pet.age ? `${pet.age} years` : 'Not specified'}</p>
              <p><span className="text-muted-foreground">Weight:</span> {pet.weight ? `${pet.weight} ${pet.weightUnit}` : 'Not specified'}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Additional Information</h3>
            <div className="space-y-2">
              <p><span className="text-muted-foreground">Date of Birth:</span> {formatDate(pet.dateOfBirth)}</p>
              <p><span className="text-muted-foreground">Owner:</span> {pet.owner?.name || 'Not specified'}</p>
              <p><span className="text-muted-foreground">Created:</span> {formatDate(pet.createdAt)}</p>
            </div>
          </div>
        </div>

        {pet.notes && (
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Notes</h3>
            <p className="text-sm text-muted-foreground">{pet.notes}</p>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => setShowHistory(true)}>View History</Button>
        </div>
      </div>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Service History - {pet.name}</DialogTitle>
            <DialogDescription>View all past services and appointments</DialogDescription>
          </DialogHeader>
          <ServiceHistory petId={pet.id} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
