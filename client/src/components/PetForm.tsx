import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type InsertPet, type Pet } from "@/lib/schema";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { usePets } from "../hooks/use-pets";
import { useCustomers } from "../hooks/use-customers";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { Upload } from "lucide-react";
import { format } from "date-fns";

export type PetFormData = {
  name: string;
  type: "dog" | "cat" | "bird" | "fish" | "other";
  breed: string;
  customerId: number;
  dateOfBirth?: string;
  age?: number;
  gender?: "male" | "female" | "unknown";
  weight?: string;
  weightUnit?: "kg" | "lbs";
  image?: File | string | null;
  notes?: string;
};

export type PetFormProps = {
  onSuccess?: (data: PetFormData) => void;
  onCancel?: () => void;
  defaultValues?: Partial<PetFormData>;
  pet?: Pet;
  updatePetFn?: (id: number, data: Partial<PetFormData>) => Promise<void>;
};

const petFormSchema = z.object({
  name: z.string().min(1, { message: "Pet name is required" }),
  type: z.enum(["dog", "cat", "bird", "fish", "other"], { 
    required_error: "Pet type is required",
    invalid_type_error: "Invalid pet type selected"
  }),
  breed: z.string().min(1, { message: "Breed is required" }),
  customerId: z.number().min(1, { message: "Customer is required" }),
  dateOfBirth: z.string().nullable().optional(),
  age: z.number().nullable().optional(),
  gender: z.enum(["male", "female", "unknown"]).nullable().optional(),
  weight: z.string().nullable().optional(),
  weightUnit: z.enum(["kg", "lbs"]).default("kg"),
  image: z.any().optional().nullable(),
  notes: z.string().nullable().optional()
});

export function PetForm({
  onSuccess,
  onCancel,
  defaultValues,
  pet,
  updatePetFn,
}: PetFormProps) {
  const { addPet } = usePets();
  const { data: customersQuery } = useCustomers();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const customers = useMemo(() => customersQuery || [], [customersQuery]);

  const form = useForm<PetFormData>({
    resolver: zodResolver(petFormSchema),
    defaultValues: {
      ...defaultValues,
      customerId: defaultValues?.customerId || 0,
      type: defaultValues?.type || "dog",
      weightUnit: defaultValues?.weightUnit || "kg",
    },
  });

  useEffect(() => {
    if (pet) {
      form.reset({
        name: pet.name,
        type: pet.type,
        breed: pet.breed,
        customerId: pet.customerId,
        dateOfBirth: pet.dateOfBirth || undefined,
        age: pet.age || undefined,
        gender: pet.gender || undefined,
        weight: pet.weight || undefined,
        weightUnit: pet.weightUnit,
        notes: pet.notes || undefined,
        image: pet.image || undefined,
      });
    }
  }, [pet, form]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      form.setValue("image", file);
    }
  };

  const onSubmit = async (data: PetFormData) => {
    try {
      setIsSubmitting(true);

      if (pet?.id && updatePetFn) {
        await updatePetFn(pet.id, data);
        toast({
          title: "Pet Updated",
          description: `${data.name} has been updated successfully.`,
        });
      } else {
        await addPet(data);
        toast({
          title: "Pet Added",
          description: `${data.name} has been added successfully.`,
        });
      }

      onSuccess?.(data);
      form.reset();
      setSelectedImage(null);
    } catch (error) {
      console.error("Error submitting pet form:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save pet",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem
                      key={customer.id}
                      value={customer.id.toString()}
                    >
                      {customer.firstName} {customer.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

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
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {["dog", "cat", "bird", "fish", "other"].map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
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
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Birth</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  value={field.value || ""}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value || undefined}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {["male", "female", "unknown"].map((gender) => (
                    <SelectItem key={gender} value={gender}>
                      {gender.charAt(0).toUpperCase() + gender.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="weightUnit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="lbs">lbs</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="image"
          render={({ field: { value, onChange, ...field } }) => (
            <FormItem>
              <FormLabel>Image</FormLabel>
              <FormControl>
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="pet-image"
                    {...field}
                  />
                  <label
                    htmlFor="pet-image"
                    className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-gray-50"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Image</span>
                  </label>
                  {selectedImage && (
                    <span className="text-sm text-gray-500">
                      {selectedImage.name}
                    </span>
                  )}
                  {typeof value === "string" && value && (
                    <img
                      src={value}
                      alt="Pet"
                      className="w-16 h-16 object-cover rounded-md"
                    />
                  )}
                </div>
              </FormControl>
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
                <Input {...field} value={field.value || ""} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : pet ? "Update Pet" : "Add Pet"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
