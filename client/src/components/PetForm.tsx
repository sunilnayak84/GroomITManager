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
import { useState, useEffect, useMemo } from "react";
import { Upload } from "lucide-react";

const petFormSchema = z.object({
  name: z.string().min(1, { message: "Pet name is required" }),
  type: z.enum(["dog", "cat", "bird", "fish", "other"] as const),
  breed: z.string().min(1, { message: "Breed is required" }),
  customerId: z.coerce.number().min(1, { message: "Customer is required" }),
  dateOfBirth: z.string().nullable(),
  age: z.coerce.number().nullable(),
  gender: z.enum(["male", "female", "unknown"] as const),
  weight: z.string().nullable(),
  weightUnit: z.enum(["kg", "lbs"] as const).default("kg"),
  image: z.union([z.string(), z.instanceof(File), z.null()]).nullable(),
  notes: z.string().nullable(),
  owner: z.object({
    id: z.number(),
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string().optional(),
    email: z.string().optional()
  }).optional()
});

type PetFormSchema = z.infer<typeof petFormSchema>;

interface PetFormProps {
  onSuccess?: (data: PetFormSchema) => void;
  onCancel?: () => void;
  defaultValues?: Partial<InsertPet>;
  pet?: Pet;
  customers?: Customer[];
  updatePet?: (id: number, data: Partial<InsertPet>) => Promise<void>;
  addPet: (data: InsertPet) => Promise<Pet>;
  id?: number;
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

  // Form initialization
  const form = useForm<PetFormSchema>({
    resolver: zodResolver(petFormSchema),
    defaultValues: {
      name: defaultValues?.name || pet?.name || "",
      type: (defaultValues?.type || pet?.type || "dog") as "dog" | "cat" | "bird" | "fish" | "other",
      breed: defaultValues?.breed || pet?.breed || "",
      customerId: Number(defaultValues?.customerId || pet?.customerId) || 0,
      dateOfBirth: convertToDate(defaultValues?.dateOfBirth || pet?.dateOfBirth),
      age: Number(defaultValues?.age || pet?.age) || null,
      gender: (defaultValues?.gender || pet?.gender || "unknown") as "male" | "female" | "unknown",
      weight: defaultValues?.weight?.toString() || pet?.weight?.toString() || null,
      weightUnit: (defaultValues?.weightUnit || pet?.weightUnit || "kg") as "kg" | "lbs",
      image: defaultValues?.image || pet?.image || null,
      notes: defaultValues?.notes || pet?.notes || null,
      owner: defaultValues?.owner || pet?.owner
    }
  });

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
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const customerId = Number(data.customerId || defaultValues?.customerId);
      
      if (!customerId) {
        throw new Error("Customer ID is required");
      }

      const owner = pet?.owner || defaultValues?.owner;
      const currentDate = new Date();

      const petData: InsertPet = {
        name: data.name,
        type: data.type,
        breed: data.breed,
        customerId,
        dateOfBirth: data.dateOfBirth || null,
        gender: data.gender || "unknown",
        age: data.age || null,
        weight: data.weight?.toString() || null,
        weightUnit: data.weightUnit || "kg",
        image: data.image instanceof File ? data.image : null,
        imageUrl: data.image instanceof File ? null : data.image?.toString() || null,
        notes: data.notes || null,
        owner,
        firebaseId: pet?.firebaseId || null,
        createdAt: currentDate,
        updatedAt: currentDate
      };

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
        onSubmit={form.handleSubmit(onSubmit)} 
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
                  onValueChange={(value) => field.onChange(Number(value))}
                  value={field.value?.toString()}
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
