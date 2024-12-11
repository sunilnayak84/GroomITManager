
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Pet } from "@/lib/types";

interface PetDetailsProps {
  pet: Pet;
  onEdit?: () => void;
  onDelete?: () => void;
  formatDate: (date: any) => string;
}

export function PetDetails({ pet, onEdit, onDelete, formatDate }: PetDetailsProps) {
  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          {pet.image ? (
            <img
              src={pet.image}
              alt={pet.name}
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center">
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

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-2">
            <h3 className="font-semibold">Basic Information</h3>
            <p><span className="text-muted-foreground">Type:</span> {pet.type}</p>
            <p><span className="text-muted-foreground">Breed:</span> {pet.breed}</p>
            <p><span className="text-muted-foreground">Gender:</span> {pet.gender || 'Not specified'}</p>
            <p><span className="text-muted-foreground">Age:</span> {pet.age || 'Not specified'}</p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Additional Information</h3>
            <p><span className="text-muted-foreground">Date of Birth:</span> {formatDate(pet.dateOfBirth)}</p>
            <p><span className="text-muted-foreground">Weight:</span> {pet.weight ? `${pet.weight} ${pet.weightUnit}` : 'Not specified'}</p>
            <p><span className="text-muted-foreground">Owner:</span> {pet.owner?.name || 'Not specified'}</p>
          </div>
        </div>

        {pet.notes && (
          <div className="space-y-2">
            <h3 className="font-semibold">Notes</h3>
            <p className="text-sm text-muted-foreground">{pet.notes}</p>
          </div>
        )}

        {onEdit && onDelete && (
          <div className="flex justify-center gap-2 mt-6">
            <Button variant="outline" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={onDelete}>
              Delete
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
