import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { usePets } from "../hooks/use-pets";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { insertPetSchema, type InsertPet } from "@db/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";

export default function PetsPage() {
  const [open, setOpen] = useState(false);
  const { data: pets, isLoading, addPet } = usePets();
  const { toast } = useToast();

  const form = useForm<InsertPet>({
    resolver: zodResolver(insertPetSchema),
    defaultValues: {
      name: "",
      type: "",
      breed: "",
      size: "",
      notes: "",
    },
  });

  async function onSubmit(data: InsertPet) {
    try {
      await addPet(data);
      setOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Pet added successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add pet",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pets</h1>
          <p className="text-muted-foreground">Manage your client's pets</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Pet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Pet</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select pet type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="dog">Dog</SelectItem>
                          <SelectItem value="cat">Cat</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="breed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Breed</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Size</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Add Pet
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative h-48 rounded-xl overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b"
          alt="Pet Care"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent flex items-center p-8">
          <div className="text-white">
            <h2 className="text-2xl font-bold mb-2">Pet Profiles</h2>
            <p>Keep detailed records of all pets</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {(pets || []).map((pet: any) => (
          <div key={pet.id} className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <img
                src={pet.image || "https://api.dicebear.com/7.x/adventurer/svg?seed=" + pet.name}
                alt={pet.name}
                className="w-16 h-16 rounded-full"
              />
              <div>
                <h3 className="font-semibold text-lg">{pet.name}</h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {pet.breed} · {pet.size}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{pet.notes}</p>
            <Button variant="outline" className="w-full mt-4">
              View Details
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
