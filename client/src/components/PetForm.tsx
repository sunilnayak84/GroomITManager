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
  customers?: Customer[];
  updatePet?: (id: string, data: Partial<InsertPet>) => Promise<void>;
  addPet: (data: InsertPet) => Promise<Pet>;
  id?: string;
}

export const PetForm: React.FC<PetFormProps> = ({
  onSuccess,
  onCancel,
  customers: initialCustomers,
  defaultValues,
  pet,
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
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>(
    defaultValues?.customerId ? Number(defaultValues.customerId) : 
    pet?.customerId ? Number(pet.customerId) : undefined
  );
  
  const [imagePreview, setImagePreview] = useState<string | null | undefined>(
    defaultValues?.image?.toString() || pet?.image || null
  );
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  // Customer data preparation
  const { data: fetchedCustomers } = useCustomers();
  const customerOptions = useMemo(() => {
    const allCustomers = [...(initialCustomers || [])];
    return [
      ...allCustomers,
      ...(fetchedCustomers || [])
    ].filter((customer): customer is Customer => !!customer && typeof customer.id === 'number');
  }, [initialCustomers, fetchedCustomers]);

  const defaultFormValues = useMemo(() => ({
    name: defaultValues?.name || pet?.name || "",
    type: (defaultValues?.type || pet?.type || "dog") as "dog" | "cat" | "bird" | "fish" | "other",
    breed: defaultValues?.breed || pet?.breed || "",
    customerId: defaultValues?.customerId?.toString() || pet?.customerId?.toString() || "",
    dateOfBirth: convertToDate(defaultValues?.dateOfBirth || pet?.dateOfBirth),
    age: defaultValues?.age || pet?.age || null,
    gender: (defaultValues?.gender || pet?.gender || "unknown") as "male" | "female" | "unknown",
    weight: defaultValues?.weight || pet?.weight || null,
    weightUnit: (defaultValues?.weightUnit || pet?.weightUnit || "kg") as "kg" | "lbs",
    image: defaultValues?.image || pet?.image || null,
    notes: defaultValues?.notes || pet?.notes || null
  }), [defaultValues, pet]);

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
        customerId: Number(defaultValues?.customerId || pet?.customerId),
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

      if (formDefaults.customerId) {
        setSelectedCustomerId(formDefaults.customerId);
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

      if (!data.customerId) {
        throw new Error("Please select a customer");
      }

      // Find the selected customer's details
      const selectedCustomer = customerOptions.find(c => c.id.toString() === data.customerId);
      if (!selectedCustomer) {
        throw new Error("Selected customer not found");
      }

      // Handle image upload if it's a File
      let imageUrl = data.image;
      if (data.image instanceof File) {
        try {
          imageUrl = await uploadFile(
            data.image,
            `pets/${data.customerId}/${Date.now()}_${data.image.name}`
          );
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          throw new Error('Failed to upload pet image');
        }
      }

      // Prepare pet data for Firebase
      const petData: InsertPet = {
        name: data.name.trim(),
        type: data.type,
        breed: data.breed.trim(),
        customerId: data.customerId,
        dateOfBirth: data.dateOfBirth,
        age: data.age,
        gender: data.gender,
        weight: data.weight,
        weightUnit: data.weightUnit,
        image: imageUrl,
        notes: data.notes,
        owner: selectedCustomer ? {
          id: selectedCustomer.id.toString(),
          firstName: selectedCustomer.firstName,
          lastName: selectedCustomer.lastName,
          phone: selectedCustomer.phone,
          email: selectedCustomer.email
        } : undefined
      };

      console.log('Prepared pet data for submission:', petData);

      console.log('Submitting pet data:', petData);

      console.log('Submitting pet data:', petData);

      if (pet?.id) {
        await updatePetFn(pet.id, petData);
        toast({
          title: "Success",
          description: `${data.name} has been updated successfully.`,
        });
      } else {
        await addPet(petData);
        toast({
          title: "Success",
          description: `${data.name} has been added successfully.`,
        });
      }

      onSuccess?.(data);
      onCancel?.();
      form.reset();
      setSelectedImage(null);
      setImagePreview(null);
    } catch (error) {
      console.error('Error submitting pet form:', error);
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
      <form 
        onSubmit={(e) => {
          console.log('Form submit event triggered');
          form.handleSubmit((data) => {
            console.log('Form validation passed, calling onSubmit');
            return onSubmit(data);
          })(e);
        }} 
        className="space-y-4 p-4 max-h-[60vh] overflow-y-auto pr-2"
      >
        {!defaultValues?.customerId && (
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Owner</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value)}
                  value={field.value || ''}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Customer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customerOptions.map((customer) => (
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
        )}

        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-2 relative overflow-hidden">
            {imagePreview ? (
              <img 
                src={imagePreview} 
                alt="Pet preview" 
                className="w-full h-full object-cover" 
              />
            ) : (
              <Upload className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <Input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
            id="pet-image"
          />
          <label htmlFor="pet-image" className="text-sm text-primary cursor-pointer">
            Choose Photo
          </label>
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
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
              <FormLabel>Pet Type *</FormLabel>
              <Select 
                onValueChange={field.onChange}
                value={field.value}
              >
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
              <FormLabel>Breed *</FormLabel>
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
                  value={field.value || ''}
                />
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
                <Input 
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  value={field.value || ''}
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
                onValueChange={(value) => field.onChange(value as PetGender)}
                value={field.value || "unknown"}
              >
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.1" 
                    {...field}
                    value={field.value || ''}
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
                      <SelectValue placeholder="Unit" />
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
                  {imagePreview && (
                    <img
                      src={imagePreview}
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
              <FormLabel>Additional Info</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={isSubmitting}
          >
            {pet ? "Update" : "Add"} Pet
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PetForm;
