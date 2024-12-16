import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PetDetails } from "./PetDetails";
import { format } from "date-fns";

interface PetDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pet: {
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
      firstName: string;
      lastName: string;
    };
  };
}

export function PetDetailsModal({ open, onOpenChange, pet }: PetDetailsModalProps) {
  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'Not specified';
    return format(new Date(date), 'PP');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <PetDetails
          pet={pet}
          formatDate={formatDate}
        />
      </DialogContent>
    </Dialog>
  );
}
