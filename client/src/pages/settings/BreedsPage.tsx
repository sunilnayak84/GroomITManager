
import { useState } from "react";
import { usePets } from "@/hooks/use-pets";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BreedsPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingBreed, setEditingBreed] = useState<string | null>(null);
  const [breedName, setBreedName] = useState("");
  const [breedType, setBreedType] = useState<string>("dog");
  const { toast } = useToast();
  const { breeds, addBreed, updateBreed, deleteBreed } = usePets();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBreed) {
        await updateBreed(editingBreed, { name: breedName, type: breedType });
        toast({ description: "Breed updated successfully" });
      } else {
        await addBreed({ name: breedName, type: breedType });
        toast({ description: "Breed added successfully" });
      }
      setShowDialog(false);
      setBreedName("");
      setBreedType("dog");
      setEditingBreed(null);
    } catch (error) {
      toast({ variant: "destructive", description: "Failed to save breed" });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pet Breeds</h1>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Breed
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {breeds?.map((breed) => (
              <TableRow key={breed.id}>
                <TableCell>{breed.name}</TableCell>
                <TableCell>{breed.type}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingBreed(breed.id);
                        setBreedName(breed.name);
                        setBreedType(breed.type);
                        setShowDialog(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteBreed(breed.id)}
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
              {editingBreed ? "Edit Breed" : "Add New Breed"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select 
                  value={breedType} 
                  onValueChange={setBreedType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dog">Dog</SelectItem>
                    <SelectItem value="cat">Cat</SelectItem>
                    <SelectItem value="bird">Bird</SelectItem>
                    <SelectItem value="fish">Fish</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="Breed name"
                  value={breedName}
                  onChange={(e) => setBreedName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  setBreedName("");
                  setBreedType("dog");
                  setEditingBreed(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">{editingBreed ? "Update" : "Add"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
