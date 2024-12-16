import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PetDetails } from "./PetDetails";
import { format } from "date-fns";

interface PetDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pet: {
    id?: string;
    name: string;
    breed: string;
    image: string | null;
    type?: string;
    gender?: string;
    age?: number;
    dateOfBirth?: string | null;
    weight?: number | null;
    weightUnit?: string;
    notes?: string | null;
    owner?: {
      firstName?: string;
      lastName?: string;
      name?: string;
    };
    createdAt?: string;
    updatedAt?: string | null;
  };
}

export function PetDetailsModal({ open, onOpenChange, pet }: PetDetailsModalProps) {
  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'Not specified';
    try {
      return format(new Date(date), 'PP');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogTitle>Pet Details</DialogTitle>
        <PetDetails
          pet={{
            ...pet,
            owner: pet.owner ? {
              name: pet.owner.name || `${pet.owner.firstName || ''} ${pet.owner.lastName || ''}`.trim() || undefined
            } : undefined
          }}
          formatDate={formatDate}
        />
      </DialogContent>
    </Dialog>
  );
}
