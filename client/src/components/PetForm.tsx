import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPetSchema, type InsertPet } from "@db/schema";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { usePets } from "../hooks/use-pets";
import { useToast } from "@/hooks/use-toast";

interface PetFormProps {
  onSuccess?: () => void;
  defaultValues?: Partial<InsertPet>;
}

export default function PetForm({ onSuccess, defaultValues }: PetFormProps) {
  const { addPet } = usePets();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertPetSchema),
    defaultValues: {
      name: "",
      type: "",
      breed: "",
      size: "",
      notes: "",
      customerId: 0,
      image: null,
      ...defaultValues,
    },
  });

  async function onSubmit(data: InsertPet) {
    try {
      await addPet({ ...data, createdAt: new Date() });
      form.reset();
      onSuccess?.();
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pet Name *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Max" />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type *</FormLabel>
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
              <FormLabel>Breed *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Golden Retriever" />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="size"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Size *</FormLabel>
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
                <Input {...field} value={field.value?.toString() || ''} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          Add Pet
        </Button>
      </form>
    </Form>
  );
}
