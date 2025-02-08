import React from "react";
import { Dialog, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import type { Pet } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { calculateAge } from "@/lib/utils";
import AppointmentForm from "./AppointmentForm";
import { useInventory } from "@/hooks/use-inventory";
import { useServices } from "@/hooks/use-services";

interface PetDetailsProps {
  pet: Pet;
  onEdit?: () => void;
  onDelete?: () => void;
  formatDate: (date: any) => string;
}

export function PetDetails({ pet, onEdit, onDelete, formatDate }: PetDetailsProps) {
  const { inventory } = useInventory();
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['petAppointments', pet.id],
    queryFn: async () => {
      const appointmentsRef = collection(db, 'appointments');
      const q = query(
        appointmentsRef, 
        where('petId', '==', pet.id),
        where('deletedAt', '==', null)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate()
      }));
    }
  });

  const { services } = useServices();


  return (
    <div className="space-y-6 p-6">
      <DialogHeader>
        <DialogTitle>Pet Details</DialogTitle>
      </DialogHeader>

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
            <p><span className="text-muted-foreground">Gender:</span> {pet.gender || 'Not specified'}</p>
            <p><span className="text-muted-foreground">Age:</span> {calculateAge(pet.dateOfBirth)}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Grooming Temperament</h3>
          <div className="space-y-2">
            <p>
              <span className="text-muted-foreground">Category:</span>{' '}
              {pet.temperamentCategory ? (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  {
                    'easy_to_groom': 'bg-green-100 text-green-800',
                    'mildly_challenging': 'bg-yellow-100 text-yellow-800',
                    'anxiety_fear': 'bg-orange-100 text-orange-800',
                    'difficult_to_handle': 'bg-red-100 text-red-800',
                    'aggression': 'bg-red-200 text-red-900',
                    'special_case': 'bg-purple-100 text-purple-800'
                  }[pet.temperamentCategory]
                }`}>
                  {pet.temperamentCategory.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </span>
              ) : 'Not specified'}
            </p>
            {pet.temperamentTags && pet.temperamentTags.length > 0 && (
              <p>
                <span className="text-muted-foreground">Behaviors:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {pet.temperamentTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </p>
            )}
            {pet.temperamentNotes && (
              <p>
                <span className="text-muted-foreground">Additional Notes:</span>
                <div className="mt-1 text-sm">{pet.temperamentNotes}</div>
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Additional Information</h3>
          <div className="space-y-2">
            <p><span className="text-muted-foreground">Date of Birth:</span> {formatDate(pet.dateOfBirth)}</p>
            <p><span className="text-muted-foreground">Weight:</span> {pet.weight ? `${pet.weight} ${pet.weightUnit}` : 'Not specified'}</p>
            <p><span className="text-muted-foreground">Owner:</span> {pet.owner?.name || 'Not specified'}</p>
          </div>
        </div>
      </div>

      {pet.notes && (
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Notes</h3>
          <p className="text-sm text-muted-foreground">{pet.notes}</p>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Appointment History</h3>
        {isLoading ? (
          <p>Loading appointments...</p>
        ) : appointments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Services</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((appointment: any) => (
                <React.Fragment key={appointment.id}>
                  <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => {
                    const row = document.getElementById(`expand-${appointment.id}`);
                    if (row) {
                      row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
                    }
                  }}>
                    <TableCell>{format(appointment.date, 'PPp')}</TableCell>
                    <TableCell className="capitalize">{appointment.status}</TableCell>
                    <TableCell>
                      {appointment.services && appointment.services.length > 0 ? 
                        appointment.services.map((serviceId: string, index: number) => {
                          const serviceDetails = services?.find(s => s.service_id === serviceId);
                          if (!serviceDetails) return null;

                          return (
                            <span key={serviceId} className="group relative">
                              {index > 0 ? ', ' : ''}
                              <span className="cursor-help underline decoration-dotted">
                                {serviceDetails.name}
                              </span>
                              <span className="invisible group-hover:visible absolute left-0 top-full mt-1 w-64 rounded bg-black p-2 text-sm text-white z-50">
                                <p className="font-semibold mb-1">{serviceDetails.name}</p>
                                <p className="text-xs text-gray-300">{serviceDetails.description || 'No description available'}</p>
                                <p className="text-xs mt-1">Duration: {serviceDetails.duration} mins</p>
                                <p className="text-xs">Price: ₹{serviceDetails.price}</p>
                              </span>
                            </span>
                          );
                        }) 
                        : '-'}
                    </TableCell>
                    <TableCell>{appointment.notes || '-'}</TableCell>
                  </TableRow>
                  <TableRow id={`expand-${appointment.id}`} style={{ display: 'none' }}>
                    <TableCell colSpan={4}>
                      <div className="p-4 space-y-4">
                        {appointment.observations && (
                          <div>
                            <h4 className="font-medium mb-1">Observations</h4>
                            <p className="text-sm text-muted-foreground">{appointment.observations}</p>
                          </div>
                        )}

                        {appointment.recommendations && (
                          <div>
                            <h4 className="font-medium mb-1">Recommendations</h4>
                            <p className="text-sm text-muted-foreground">{appointment.recommendations}</p>
                          </div>
                        )}

                        {appointment.inventoryUsage && appointment.inventoryUsage.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Products Used</h4>
                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                              {appointment.inventoryUsage.map((usage: any, index: number) => {
                                const item = inventory?.find(i => i.item_id === usage.item_id);
                                return (
                                  <li key={index}>
                                    {item?.name || 'Unknown Product'}: {usage.quantity_used} {item?.unit || 'units'}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 mt-4">
                          {appointment.beforeImages && appointment.beforeImages.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">Before Images</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {appointment.beforeImages.map((image: any) => (
                                  <img
                                    key={image.id}
                                    src={image.url}
                                    alt="Before grooming"
                                    className="rounded-md w-full h-32 object-cover"
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {appointment.afterImages && appointment.afterImages.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">After Images</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {appointment.afterImages.map((image: any) => (
                                  <img
                                    key={image.id}
                                    src={image.url}
                                    alt="After grooming"
                                    className="rounded-md w-full h-32 object-cover"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground">No appointment history found</p>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
        <Dialog>
          <DialogTrigger asChild>
            <Button className="mr-auto">
              Schedule Appointment
            </Button>
          </DialogTrigger>
          <AppointmentForm 
            setOpen={(value) => {
              if (!value) {
                const dialogElements = document.querySelectorAll('[role="dialog"]');
                dialogElements.forEach(dialogElement => {
                  const closeButton = dialogElement.querySelector('[aria-label="Close"]');
                  if (closeButton instanceof HTMLButtonElement) {
                    closeButton.click();
                  }
                });
              }
            }} 
            selectedPet={pet} 
          />
        </Dialog>
        {onEdit && onDelete && (
          <>
            <Button variant="outline" onClick={onDelete}>
              Delete
            </Button>
            <Button onClick={onEdit}>
              Edit
            </Button>
          </>
        )}
      </div>
    </div>
  );
}