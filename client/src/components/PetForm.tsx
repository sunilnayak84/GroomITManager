import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type InsertPet, type Customer, type Pet, type PetGender } from "@/lib/types";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { usePets } from "../hooks/use-pets";
import { useCustomers } from "../hooks/use-customers";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useEffect, useMemo } from "react";
import { Upload } from "lucide-react";

const petFormSchema = z.object({
  name: z.string().min(1, { message: "Pet name is required" }),
  type: z.enum(["dog", "cat", "bird", "fish", "other"] as const),
  breed: z.string().min(1, { message: "Breed is required" }),
  customerId: z.string().min(1, { message: "Customer is required" }),
  dateOfBirth: z.string().nullable(),
  age: z.union([z.number(), z.string()]).nullable().transform(val => {
    if (!val) return null;
    return typeof val === 'string' ? Number(val) : val;
  }),
  gender: z.enum(["male", "female", "unknown"] as const),
  weight: z.string().nullable(),
  weightUnit: z.enum(["kg", "lbs"] as const).default("kg"),
  image: z.union([z.string(), z.instanceof(File), z.null()]).nullable(),
  notes: z.string().nullable(),
  owner: z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string().optional(),
    email: z.string().optional()
  }).optional()
}).transform(data => ({
  ...data,
  customerId: data.customerId.toString(),
  age: data.age ? Number(data.age) : null,
  weight: data.weight || null,
  notes: data.notes || null,
  dateOfBirth: data.dateOfBirth || null
}));

type PetFormSchema = z.infer<typeof petFormSchema>;

interface PetFormProps {
  onSuccess?: (data: PetFormSchema) => void;
  onCancel?: () => void;
  defaultValues?: Partial<InsertPet>;
  pet?: Pet;
  customerId: string;
  updatePet?: (id: string, data: Partial<InsertPet>) => Promise<void>;
  addPet: (data: InsertPet) => Promise<Pet>;
  id?: string;
}

export const PetForm: React.FC<PetFormProps> = ({
  onSuccess,
  onCancel,
  defaultValues,
  pet,
  customerId,
  updatePet: externalUpdatePet,
  addPet,
  id
}) => {
  const { updatePet: usePetsUpdatePet } = usePets();
  const { toast } = useToast();

  // Convert date values to proper format
  const convertToDate = (dateValue: Date | string | null | undefined): string | null => {
    if (!dateValue) return null;
    
    if (dateValue instanceof Date) {
      return dateValue.toISOString().split('T')[0];
    }
    
    if (typeof dateValue === 'string') {
      const parsedDate = new Date(dateValue);
      return !isNaN(parsedDate.getTime()) 
        ? parsedDate.toISOString().split('T')[0]
        : null;
    }
    
    return null;
  };

  // State management
  const [imagePreview, setImagePreview] = useState<string | null | undefined>(
    defaultValues?.image?.toString() || pet?.image || null
  );
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  // Customer data preparation
  const defaultFormValues = useMemo(() => ({
    name: defaultValues?.name || pet?.name || "",
    type: (defaultValues?.type || pet?.type || "dog") as "dog" | "cat" | "bird" | "fish" | "other",
    breed: defaultValues?.breed || pet?.breed || "",
    customerId: customerId,
    dateOfBirth: convertToDate(defaultValues?.dateOfBirth || pet?.dateOfBirth),
    age: defaultValues?.age || pet?.age || null,
    gender: (defaultValues?.gender || pet?.gender || "unknown") as "male" | "female" | "unknown",
    weight: defaultValues?.weight || pet?.weight || null,
    weightUnit: (defaultValues?.weightUnit || pet?.weightUnit || "kg") as "kg" | "lbs",
    image: defaultValues?.image || pet?.image || null,
    notes: defaultValues?.notes || pet?.notes || null
  }), [defaultValues, pet, customerId]);

  const form = useForm<PetFormSchema>({
    resolver: zodResolver(petFormSchema),
    mode: "onChange",
    defaultValues: defaultFormValues
  });

  // Update form when default values change
  useEffect(() => {
    if (defaultValues || pet) {
      form.reset(defaultFormValues);
    }
  }, [defaultFormValues, form]);

  useEffect(() => {
    if (defaultValues || pet) {
      const formDefaults = {
        name: defaultValues?.name || pet?.name || "",
        type: (defaultValues?.type || pet?.type || "dog") as "dog" | "cat" | "bird" | "fish" | "other",
        breed: defaultValues?.breed || pet?.breed || "",
        customerId: customerId,
        dateOfBirth: convertToDate(defaultValues?.dateOfBirth || pet?.dateOfBirth),
        age: Number(defaultValues?.age || pet?.age) || null,
        gender: (defaultValues?.gender || pet?.gender || "unknown") as "male" | "female" | "unknown",
        weight: defaultValues?.weight?.toString() || pet?.weight?.toString() || null,
        weightUnit: (defaultValues?.weightUnit || pet?.weightUnit || "kg") as "kg" | "lbs",
        image: defaultValues?.image || pet?.image || null,
        notes: defaultValues?.notes || pet?.notes || null,
        owner: defaultValues?.owner || pet?.owner
      };

      form.reset(formDefaults);
      
      if (defaultValues?.image || pet?.image) {
        setImagePreview(defaultValues?.image?.toString() || pet?.image || null);
      }
    }
  }, [defaultValues, pet, form]);

  const updatePetFn = externalUpdatePet || usePetsUpdatePet;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      form.setValue("image", file);
    }
  };

  const onSubmit = async (data: PetFormSchema) => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Form submission started:', { data });

      // Handle image upload if it's a File
      let imageUrl = data.image;
      if (data.image instanceof File) {
        // For now, we'll just use the file name as the URL
        // In a real app, you would upload this to storage
        imageUrl = data.image.name;
      }

      const petData: InsertPet = {
        name: data.name,
        type: data.type,
        breed: data.breed,
        customerId: customerId, // Use the provided customerId
        dateOfBirth: data.dateOfBirth,
        age: data.age,
        gender: data.gender as PetGender,
        weight: data.weight,
        weightUnit: data.weightUnit,
        image: imageUrl,
        notes: data.notes,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('Submitting pet data:', petData);

      const newPet = await addPet(petData);
      console.log('Pet created successfully:', newPet);

      toast({
        title: "Success",
        description: "Pet added successfully",
      });

      if (onSuccess) {
        onSuccess(data);
      }
    } catch (error) {
      console.error('Error submitting pet form:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add pet",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-4">
        <div className="space-y-4 pr-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name*</FormLabel>
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
                <FormLabel>Pet Type*</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pet type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="dog">Dog</SelectItem>
                    <SelectItem value="cat">Cat</SelectItem>
                    <SelectItem value="bird">Bird</SelectItem>
                    <SelectItem value="fish">Fish</SelectItem>
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
                <FormLabel>Breed*</FormLabel>
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
                  <Input type="date" {...field} value={field.value || ''} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="age"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Age</FormLabel>
                <FormControl>
                  <Input type="number" {...field} value={field.value || ''} />
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <div className="flex gap-4">
            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Weight</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value || ''} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="weightUnit"
              render={({ field }) => (
                <FormItem className="w-24">
                  <FormLabel>Unit</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            render={({ field }) => (
              <FormItem>
                <FormLabel>Image</FormLabel>
                <FormControl>
                  <div className="flex flex-col items-center gap-4">
                    {imagePreview && (
                      <img
                        src={imagePreview}
                        alt="Pet preview"
                        className="w-32 h-32 object-cover rounded-full"
                      />
                    )}
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="pet-image"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('pet-image')?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Image
                      </Button>
                    </div>
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
                <FormLabel>Additional Info</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <div className="sticky bottom-0 bg-white pt-4 pb-2 flex justify-end gap-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Pet"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PetForm;
