
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
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingCats, setIsImportingCats] = useState(false);

  const catBreeds = [
    "Abyssinian", "American Bobtail", "American Curl", "American Shorthair", "American Wirehair",
    "Arabian Mau", "Asian Semi-longhair", "Balinese", "Bengal", "Birman", "Bombay",
    "British Longhair", "British Shorthair", "Burmese", "Burmilla", "California Spangled",
    "Chantilly-Tiffany", "Chartreux", "Chausie", "Colorpoint Shorthair", "Cornish Rex",
    "Cymric", "Devon Rex", "Domestic Longhair", "Domestic Shorthair", "Dragon Li (Chinese Li Hua)",
    "Donskoy (Don Sphynx)", "Egyptian Mau", "European Burmese", "European Shorthair",
    "Exotic Shorthair", "Foldex Cat", "German Rex", "Havana Brown", "Himalayan",
    "Japanese Bobtail", "Javanese", "Khao Manee", "Korat", "Kurilian Bobtail", "LaPerm",
    "Lykoi (Werewolf Cat)", "Maine Coon", "Manx", "Mekong Bobtail", "Minskin", "Munchkin",
    "Nebelung", "Norwegian Forest Cat", "Ocicat", "Ojos Azules", "Oriental Longhair",
    "Oriental Shorthair", "Persian", "Peterbald", "Pixie-Bob", "Ragdoll", "Russian Blue",
    "Savannah", "Scottish Fold", "Selkirk Rex", "Siamese", "Siberian", "Singapura",
    "Snowshoe", "Somali", "Sphynx", "Thai", "Tonkinese", "Toyger", "Turkish Angora",
    "Turkish Van", "Ural Rex", "York Chocolate"
  ];
  const { toast } = useToast();
  const { breeds, addBreed, updateBreed, deleteBreed } = usePets();

  const dogBreeds = [
    "Affenpinscher", "Afghan Hound", "Airedale Terrier", "Akita", "Alaskan Malamute",
    "American Bulldog", "American Cocker Spaniel", "American Eskimo Dog", "American Foxhound",
    "American Pit Bull Terrier", "American Staffordshire Terrier", "American Water Spaniel",
    "Anatolian Shepherd Dog", "Australian Cattle Dog", "Australian Shepherd", "Australian Terrier",
    "Basenji", "Basset Hound", "Beagle", "Bearded Collie", "Beauceron", "Bedlington Terrier",
    "Belgian Malinois", "Belgian Sheepdog", "Belgian Tervuren", "Bernese Mountain Dog",
    "Bichon Frise", "Black and Tan Coonhound", "Bloodhound", "Border Collie", "Border Terrier",
    "Borzoi", "Boston Terrier", "Bouvier des Flandres", "Boxer", "Boykin Spaniel", "Briard",
    "Brittany Spaniel", "Brussels Griffon", "Bull Terrier", "Bulldog", "Bullmastiff",
    "Cairn Terrier", "Canaan Dog", "Cane Corso", "Cardigan Welsh Corgi",
    "Cavalier King Charles Spaniel", "Chesapeake Bay Retriever", "Chihuahua", "Chinese Crested",
    "Chinese Shar-Pei", "Chow Chow", "Clumber Spaniel", "Cockapoo", "Cocker Spaniel", "Collie",
    "Curly-Coated Retriever", "Dachshund", "Dalmatian", "Dandie Dinmont Terrier",
    "Doberman Pinscher", "Dogo Argentino", "Dogue de Bordeaux", "English Bulldog",
    "English Cocker Spaniel", "English Foxhound", "English Setter", "English Springer Spaniel",
    "English Toy Spaniel", "Entlebucher Mountain Dog", "Field Spaniel", "Finnish Spitz",
    "Flat-Coated Retriever", "French Bulldog", "German Pinscher", "German Shepherd Dog",
    "German Shorthaired Pointer", "German Wirehaired Pointer", "Giant Schnauzer",
    "Glen of Imaal Terrier", "Golden Retriever", "Gordon Setter", "Great Dane", "Great Pyrenees",
    "Greater Swiss Mountain Dog", "Greyhound", "Harrier", "Havanese", "Ibizan Hound",
    "Icelandic Sheepdog", "Irish Setter", "Irish Terrier", "Irish Water Spaniel",
    "Irish Wolfhound", "Italian Greyhound", "Jack Russell Terrier", "Japanese Chin", "Keeshond",
    "Kerry Blue Terrier", "King Charles Spaniel", "Komondor", "Kuvasz", "Labrador Retriever",
    "Lakeland Terrier", "Lhasa Apso", "Löwchen", "Maltese", "Manchester Terrier", "Mastiff",
    "Miniature Bull Terrier", "Miniature Pinscher", "Miniature Schnauzer",
    "Neapolitan Mastiff", "Newfoundland", "Norfolk Terrier", "Norwegian Buhund",
    "Norwegian Elkhound", "Norwegian Lundehund", "Norwich Terrier",
    "Nova Scotia Duck Tolling Retriever", "Old English Sheepdog", "Otterhound", "Papillon",
    "Pekingese", "Pembroke Welsh Corgi", "Petit Basset Griffon Vendeen", "Pharaoh Hound",
    "Plott", "Pointer", "Polish Lowland Sheepdog", "Pomeranian", "Portuguese Water Dog",
    "Presa Canario", "Pug", "Puli", "Pumi", "Pyrenean Shepherd", "Rat Terrier",
    "Redbone Coonhound", "Rhodesian Ridgeback", "Rottweiler", "Saint Bernard", "Saluki",
    "Samoyed", "Schipperke", "Scottish Deerhound", "Scottish Terrier", "Sealyham Terrier",
    "Shetland Sheepdog", "Shiba Inu", "Shih Tzu", "Siberian Husky", "Silky Terrier",
    "Skye Terrier", "Sloughi", "Soft-Coated Wheaten Terrier", "Spanish Water Dog",
    "Spinone Italiano", "Staffordshire Bull Terrier", "Standard Schnauzer", "Sussex Spaniel",
    "Swedish Vallhund", "Tibetan Mastiff", "Tibetan Spaniel", "Tibetan Terrier",
    "Toy Fox Terrier", "Treeing Walker Coonhound", "Vizsla", "Weimaraner",
    "Welsh Springer Spaniel", "Welsh Terrier", "West Highland White Terrier", "Whippet",
    "Wire Fox Terrier", "Wirehaired Pointing Griffon", "Xoloitzcuintli", "Yorkshire Terrier"
  ];

  const importDogBreeds = async () => {
    try {
      setIsImporting(true);
      const existingDogBreeds = breeds?.filter(breed => breed.type === 'dog') ?? [];
      const existingBreedNames = new Set(existingDogBreeds.map(breed => breed.name));
      
      const missingBreeds = dogBreeds.filter(breed => !existingBreedNames.has(breed));
      
      if (missingBreeds.length === 0) {
        toast({ description: "All dog breeds are already imported!" });
        return;
      }

      for (const breedName of missingBreeds) {
        await addBreed({ 
          name: breedName, 
          type: 'dog',
          deleted: false,
          deletedAt: null 
        });
      }

      toast({ description: `Successfully imported ${missingBreeds.length} dog breeds!` });
    } catch (error) {
      toast({ 
        variant: "destructive", 
        description: "Failed to import dog breeds" 
      });
    } finally {
      setIsImporting(false);
    }
  };

  const importCatBreeds = async () => {
    try {
      setIsImportingCats(true);
      const existingCatBreeds = breeds?.filter(breed => breed.type === 'cat') ?? [];
      const existingBreedNames = new Set(existingCatBreeds.map(breed => breed.name));
      
      const missingBreeds = catBreeds.filter(breed => !existingBreedNames.has(breed));
      
      if (missingBreeds.length === 0) {
        toast({ description: "All cat breeds are already imported!" });
        return;
      }

      for (const breedName of missingBreeds) {
        await addBreed({ 
          name: breedName, 
          type: 'cat',
          deleted: false,
          deletedAt: null 
        });
      }

      toast({ description: `Successfully imported ${missingBreeds.length} cat breeds!` });
    } catch (error) {
      toast({ 
        variant: "destructive", 
        description: "Failed to import cat breeds" 
      });
    } finally {
      setIsImportingCats(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBreed) {
        await updateBreed({ id: editingBreed, name: breedName, type: breedType });
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
        <div className="flex gap-2">
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={importDogBreeds}
              disabled={isImporting}
            >
              {isImporting ? "Importing..." : "Import Dog Breeds"}
            </Button>
            <Button 
              variant="outline"
              onClick={importCatBreeds}
              disabled={isImportingCats}
            >
              {isImportingCats ? "Importing..." : "Import Cat Breeds"}
            </Button>
          </div>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Breed
          </Button>
        </div>
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
