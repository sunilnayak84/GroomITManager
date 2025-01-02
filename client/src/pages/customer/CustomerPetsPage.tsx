import { useState } from "react";
import { usePets } from "@/hooks/use-pets";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PetDetails } from "@/components/PetDetails";
import { useToast } from "@/hooks/use-toast";
import { PetForm } from "@/components/PetForm";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pet } from "@/lib/types";

export default function CustomerPetsPage() {
  const [showPetModal, setShowPetModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const { user, isLoading: userLoading } = useUser();
  const { pets, addPet, updatePet, deletePet } = usePets();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  if (userLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-semibold">Please log in to view your pets.</h2>
      </div>
    </div>;
  }

  const customerPets = pets.filter((pet) =>
    pet.customerId === user.uid ||
    pet.owner?.email === user.email
  );

  const filteredPets = customerPets.filter(pet => 
    pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pet.breed?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddPet = async (formData: any) => {
    try {
      if (!user?.uid || !user?.email) {
        throw new Error('User not authenticated');
      }

      const petData = {
        ...formData,
        customerId: user.uid,
        owner: {
          id: user.uid,
          name: user.displayName || 'Unknown',
          email: user.email
        }
      };

      const result = await addPet(petData);
      
      if (!result) {
        throw new Error('No response from server');
      }

      toast({
        title: "Success",
        description: "Pet added successfully",
        variant: "success"
      });
      
      setShowPetModal(false);
      return true;
    } catch (error: any) {
      console.error('Error adding pet:', error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
      throw error;
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      if (typeof date === 'string') {
        return new Date(date).toLocaleDateString();
      }
      if (date instanceof Date) {
        return date.toLocaleDateString();
      }
      return 'N/A';
    } catch (error) {
      return 'N/A';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="relative h-48 rounded-xl overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1450778869180-41d0601e046e"
          alt="My Pets"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent flex items-center p-8">
          <div className="text-white">
            <h2 className="text-2xl font-bold">My Pets</h2>
            <p>Manage your furry friends</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6 gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by pet name or breed..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base bg-white shadow-sm"
            />
          </div>
        </div>
        <Button
          size="lg"
          onClick={() => {
            setSelectedPet(null);
            setShowPetModal(true);
          }}
          className="h-12 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add New Pet
        </Button>
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pet</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPets?.map((pet) => (
              <TableRow key={pet.id}>
                <TableCell>
                  <div className="flex items-center gap-4">
                    {pet.image ? (
                      <Avatar className="h-12 w-12 border-2 border-purple-100">
                        <AvatarImage src={pet.image} alt={pet.name} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-100 to-pink-100 text-purple-600">
                          {pet.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Avatar className="h-12 w-12 border-2 border-purple-100">
                        <AvatarFallback className="bg-gradient-to-br from-purple-100 to-pink-100 text-purple-600">
                          {pet.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <div className="font-semibold text-base">{pet.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="capitalize">{pet.type}</span>
                        <span>•</span>
                        <span>{pet.breed}</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{pet.age || 'N/A'}</span>
                    <span className="text-sm text-muted-foreground">Years old</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                    pet.gender === 'male' ? 'bg-blue-100 text-blue-700' :
                    pet.gender === 'female' ? 'bg-pink-100 text-pink-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {pet.gender ? pet.gender.charAt(0).toUpperCase() + pet.gender.slice(1) : 'Unknown'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="hover:bg-purple-50 hover:text-purple-600"
                        >
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[625px]">
                        <DialogHeader>
                          <DialogTitle>Pet Details</DialogTitle>
                          <DialogDescription>View and manage pet information</DialogDescription>
                        </DialogHeader>
                        <PetDetails 
                          pet={pet}
                          formatDate={formatDate}
                          onEdit={() => {
                            setSelectedPet(pet);
                            setShowEditModal(true);
                          }}
                          onDelete={() => {
                            setSelectedPet(pet);
                            setShowDeleteConfirm(true);
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedPet(pet);
                        setShowEditModal(true);
                      }}
                      className="hover:bg-blue-50 hover:text-blue-600"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedPet(pet);
                        setShowDeleteConfirm(true);
                      }}
                      className="hover:bg-red-50 hover:text-red-600"
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredPets?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No pets found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Pet Dialog */}
      <Dialog open={showPetModal} onOpenChange={setShowPetModal}>
        <DialogContent className="sm:max-w-[90vw] h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Pet</DialogTitle>
            <DialogDescription>Fill in the pet details below.</DialogDescription>
          </DialogHeader>
          <PetForm
            handleSubmit={handleAddPet}
            onCancel={() => setShowPetModal(false)}
            customerId={user.uid}
            hideCustomerField={true}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Pet Dialog */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[600px] h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Pet</DialogTitle>
            <DialogDescription>Update your pet's information below.</DialogDescription>
          </DialogHeader>
          <PetForm
            handleSubmit={async (data) => {
              try {
                if (!selectedPet) {
                  throw new Error('No pet selected for update');
                }

                const updateData = {
                  ...data,
                  customerId: selectedPet.customerId,
                  owner: selectedPet.owner
                };

                if (data.image instanceof File) {
                  const path = `pets/${selectedPet.customerId}/${Date.now()}_${data.image.name}`;
                  updateData.image = await uploadFile(data.image, path);
                }

                await updatePet({
                  petId: selectedPet.id,
                  updateData: {
                    ...updateData,
                    updatedAt: new Date().toISOString()
                  }
                });

                queryClient.invalidateQueries(['pets']);
                setShowEditModal(false);
                toast({
                  title: "Success",
                  description: "Pet updated successfully",
                });
                return true;
              } catch (error) {
                console.error('Error updating pet:', error);
                toast({
                  variant: "destructive",
                  title: "Error",
                  description: error instanceof Error ? error.message : "Failed to update pet"
                });
                return false;
              }
            }}
            onCancel={() => setShowEditModal(false)}
            defaultValues={selectedPet ?? undefined}
            customerId={user.uid}
            hideCustomerField={true}
            isEditing={true}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this pet?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedPet?.name}'s record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (selectedPet) {
                  try {
                    await deletePet(selectedPet.id);
                    setShowDeleteConfirm(false);
                    toast({
                      title: "Success",
                      description: "Pet deleted successfully"
                    });
                  } catch (error) {
                    console.error('Error deleting pet:', error);
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: error instanceof Error ? error.message : "Failed to delete pet"
                    });
                  }
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}