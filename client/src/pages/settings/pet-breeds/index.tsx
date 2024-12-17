
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useBreeds } from "@/hooks/use-breeds";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PetBreedsPage() {
  const { breeds, addBreed, updateBreed, deleteBreed } = useBreeds();
  const [showDialog, setShowDialog] = useState(false);
  const [importing, setImporting] = useState(false);

  const importDogBreeds = async () => {
    try {
      setImporting(true);
      const { dogBreeds } = await import('@/lib/breeds-data');
      for (const breedName of dogBreeds) {
        await addBreed({ name: breedName, type: 'dog' });
      }
      toast({ title: "Success", description: "Dog breeds imported successfully" });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to import breeds",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };
  const [selectedBreed, setSelectedBreed] = useState<string | null>(null);
  const [breedName, setBreedName] = useState("");
  const [animalType, setAnimalType] = useState<"dog" | "cat">("dog");
  const [breedToDelete, setBreedToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async () => {
    try {
      if (selectedBreed) {
        await updateBreed(selectedBreed, { name: breedName, type: animalType });
        toast({ title: "Success", description: "Breed updated successfully" });
      } else {
        await addBreed({ name: breedName, type: animalType });
        toast({ title: "Success", description: "Breed added successfully" });
      }
      setShowDialog(false);
      setBreedName("");
      setAnimalType("dog");
      setSelectedBreed(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save breed",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pet Breeds</h1>
        <div className="flex gap-2">
          <Button
            onClick={importDogBreeds}
            disabled={importing}
            variant="outline"
          >
            {importing ? "Importing..." : "Import Dog Breeds"}
          </Button>
          <Button
            onClick={() => {
              setSelectedBreed(null);
              setBreedName("");
              setAnimalType("dog");
              setShowDialog(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Breed
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {breeds?.map((breed) => (
              <TableRow key={breed.id}>
                <TableCell>{breed.name}</TableCell>
                <TableCell className="capitalize">{breed.type}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBreed(breed.id);
                        setBreedName(breed.name);
                        setAnimalType(breed.type);
                        setShowDialog(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setBreedToDelete(breed.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedBreed ? "Edit Breed" : "Add New Breed"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={animalType}
              onValueChange={(value: "dog" | "cat") => setAnimalType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select animal type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dog">Dog</SelectItem>
                <SelectItem value="cat">Cat</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={breedName}
              onChange={(e) => setBreedName(e.target.value)}
              placeholder="Breed name"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  setBreedName("");
                  setAnimalType("dog");
                  setSelectedBreed(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {selectedBreed ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!breedToDelete} onOpenChange={() => setBreedToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Breed</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this breed? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (breedToDelete) {
                  try {
                    await deleteBreed(breedToDelete);
                    toast({ title: "Success", description: "Breed deleted successfully" });
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to delete breed",
                      variant: "destructive",
                    });
                  }
                }
                setBreedToDelete(null);
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
