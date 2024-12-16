import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { capitalize } from "@/lib/utils";

interface PetDetailsProps {
  pet: {
    id?: string;
    name: string;
    type?: string;
    breed: string;
    gender?: string;
    age?: number;
    dateOfBirth?: string | null;
    weight?: number | null;
    weightUnit?: string;
    notes?: string | null;
    image: string | null;
    owner?: {
      name?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
    };
    createdAt?: string;
    updatedAt?: string | null;
  };
  onEdit?: () => void;
  onDelete?: () => void;
  formatDate: (date: any) => string;
}

export function PetDetails({ pet, onEdit, onDelete, formatDate }: PetDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {pet.image ? (
          <img
            src={pet.image}
            alt={pet.name}
            className="h-24 w-24 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary">
            <span className="text-2xl font-semibold">
              {pet.name.substring(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold">{pet.name}</h2>
          <p className="text-muted-foreground">
            {pet.type && capitalize(pet.type)} • {capitalize(pet.breed)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-3">
          <h3 className="font-semibold">Basic Information</h3>
          <div className="space-y-2">
            <p>
              <span className="text-muted-foreground">Type: </span>
              {pet.type ? capitalize(pet.type) : 'Not specified'}
            </p>
            <p>
              <span className="text-muted-foreground">Breed: </span>
              {capitalize(pet.breed)}
            </p>
            <p>
              <span className="text-muted-foreground">Gender: </span>
              {pet.gender ? capitalize(pet.gender) : 'Not specified'}
            </p>
            <p>
              <span className="text-muted-foreground">Age: </span>
              {pet.age ? `${pet.age} years` : 'Not specified'}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold">Additional Information</h3>
          <div className="space-y-2">
            <p>
              <span className="text-muted-foreground">Date of Birth: </span>
              {formatDate(pet.dateOfBirth)}
            </p>
            <p>
              <span className="text-muted-foreground">Weight: </span>
              {pet.weight ? `${pet.weight} ${pet.weightUnit || 'kg'}` : 'Not specified'}
            </p>
            <p>
              <span className="text-muted-foreground">Owner: </span>
              {pet.owner?.name || (pet.owner?.firstName && pet.owner?.lastName 
                ? `${pet.owner.firstName} ${pet.owner.lastName}`.trim()
                : 'Not specified')}
            </p>
            {pet.owner?.email && (
              <p>
                <span className="text-muted-foreground">Owner Email: </span>
                {pet.owner.email}
              </p>
            )}
          </div>
        </div>
      </div>

      {pet.notes && (
        <div className="space-y-2">
          <h3 className="font-semibold">Notes</h3>
          <p className="text-sm text-muted-foreground">{pet.notes}</p>
        </div>
      )}

      {(onEdit || onDelete) && (
        <div className="mt-6 flex justify-center gap-2">
          {onDelete && (
            <Button variant="outline" onClick={onDelete}>
              Delete
            </Button>
          )}
          {onEdit && (
            <Button onClick={onEdit}>
              Edit
            </Button>
          )}
        </div>
      )}
    </div>
  );
}