import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type InsertPet, type Customer, type Pet, type PetFormData } from "@/lib/types";
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

export type PetFormProps = {
  onSuccess?: (data: PetFormSchema) => void;
  onCancel?: () => void;
  defaultValues?: Partial<InsertPet>;
  pet?: InsertPet & { id: number };
  customers?: Customer[];
  updatePet?: (id: number, data: Partial<InsertPet>) => Promise<void>;
  addPet: (data: InsertPet) => Promise<Pet>;
  id?: number;
};

export type PetFormSchema = z.infer<typeof petFormSchema>;

const petFormSchema = z.object({
  name: z.string().min(1, { message: "Pet name is required" }),
  type: z.enum(["dog", "cat", "bird", "fish", "other"] as const, { 
    required_error: "Pet type is required",
    invalid_type_error: "Invalid pet type selected"
  }),
  breed: z.string().min(1, { message: "Breed is required" }),
  customerId: z.coerce.number().min(1, { message: "Customer is required" }),
  dateOfBirth: z.string().nullable(),
  age: z.coerce.number().nullable(),
  gender: z.enum(["male", "female", "unknown"] as const).nullable(),
  weight: z.string().nullable(),
  weightUnit: z.enum(["kg", "lbs"] as const).default("kg"),
  image: z.union([z.string(), z.instanceof(File), z.null()]).optional(),
  notes: z.string().nullable(),
  id: z.number().optional(),
  firebaseId: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().nullable().optional(),
}).refine(data => {
  if (data.weight !== null && isNaN(Number(data.weight))) {
    throw new Error("Weight must be a valid number");
  }
  if (data.age !== null && isNaN(Number(data.age))) {
    throw new Error("Age must be a valid number");
  }
  return true;
}, {
  message: "Invalid optional field"
});

export type PetFormSchema = z.infer<typeof petFormSchema>;

export const PetForm: React.FC<PetFormProps> = ({
  onSuccess,
  onCancel,
  customers,
  defaultValues,
  pet,
  updatePet: externalUpdatePet,
  addPet,
  id
}: PetFormProps) => {
  const { 
    updatePet: usePetsUpdatePet,
  } = usePets();

  const { toast } = useToast();

  // Convert Firestore timestamp or date string to Date object
  const convertToDate = (dateValue: Date | string | { seconds: number, nanoseconds: number } | null | undefined): string | null => {
    if (!dateValue) return null;
    
    // If it's already a Date object, format it
    if (dateValue instanceof Date) {
      return dateValue.toISOString().split('T')[0];
    }
    
    // If it's a Firestore timestamp object
    if (typeof dateValue === 'object' && 'seconds' in dateValue) {
      const date = new Date(dateValue.seconds * 1000);
      return date.toISOString().split('T')[0];
    }
    
    // If it's a string, try parsing
    if (typeof dateValue === 'string') {
      const parsedDate = new Date(dateValue);
      return !isNaN(parsedDate.getTime()) 
        ? parsedDate.toISOString().split('T')[0]
        : null;
    }
    
    return null;
  };

  // State for customer selection and image
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(
    defaultValues?.customerId || pet?.customerId
  );
  const [imagePreview, setImagePreview] = useState<string | null | undefined>(
    typeof defaultValues?.image === 'string' ? defaultValues.image : 
    typeof pet?.image === 'string' ? pet.image : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prepare customers list
  const { data: fetchedCustomers } = useCustomers();
  const customerOptions = useMemo(() => {
    const allCustomers = [...(customers || [])];
    return [
      ...allCustomers,
      ...(fetchedCustomers || [])
    ].filter(customer => customer && customer.id);
  }, [customers, fetchedCustomers]);

  // Initialize form with default values
  const form = useForm<PetFormSchema>({
    resolver: zodResolver(petFormSchema),
    defaultValues: {
      name: defaultValues?.name || pet?.name || "",
      type: defaultValues?.type || pet?.type || "dog",
      breed: defaultValues?.breed || pet?.breed || "",
      customerId: defaultValues?.customerId || pet?.customerId || "",
      dateOfBirth: convertToDate(defaultValues?.dateOfBirth || pet?.dateOfBirth),
      age: defaultValues?.age || pet?.age || null,
      gender: defaultValues?.gender || pet?.gender || null,
      weight: defaultValues?.weight || pet?.weight || null,
      weightUnit: defaultValues?.weightUnit || pet?.weightUnit || "kg",
      image: defaultValues?.image || pet?.image || null,
      notes: defaultValues?.notes || pet?.notes || null
    },
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  });

  useEffect(() => {
    if (defaultValues || pet) {
      const formDefaults = {
        ...defaultValues,
        ...(pet || {}),
        dateOfBirth: convertToDate(defaultValues?.dateOfBirth || pet?.dateOfBirth),
        customerId: defaultValues?.customerId || pet?.customerId || selectedCustomerId,
        // Ensure weight is properly handled
        weight: defaultValues?.weight || pet?.weight || "",
        weightUnit: defaultValues?.weightUnit || pet?.weightUnit || "kg",
        // Handle optional fields
        gender: defaultValues?.gender || pet?.gender || "unknown",
        notes: defaultValues?.notes || pet?.notes || "",
        age: defaultValues?.age || pet?.age || undefined
      };

      // Remove undefined values
      Object.keys(formDefaults).forEach(key => {
        const k = key as keyof typeof formDefaults;
        if (formDefaults[k] === undefined) {
          delete formDefaults[k];
        }
      });

      form.reset(formDefaults);
      
      // Set image preview if there's an existing image
      if (defaultValues?.image || pet?.image) {
        setImagePreview(defaultValues?.image || pet?.image);
      }

      // Update selected customer ID
      if (formDefaults.customerId) {
        setSelectedCustomerId(formDefaults.customerId);
      }
    }
  }, [defaultValues, pet, form, selectedCustomerId]);

  const updatePet = externalUpdatePet || usePetsUpdatePet;

  const onSubmit = async (data: PetFormSchema) => {
    setIsSubmitting(true);
    try {
      const customerId = Number(defaultValues?.customerId || data.customerId || selectedCustomerId);
      
      if (!customerId) {
        throw new Error("Customer ID is required to add a pet");
      }

      const petData: InsertPet = {
        ...data,
        customerId: Number(customerId),
        image: imagePreview || null,
        dateOfBirth: data.dateOfBirth || null,
        gender: data.gender || null,
        age: data.age || null,
        weight: data.weight || null,
        notes: data.notes || null
      };

      console.log('PET FORM: Submitting Pet Data', { 
        petData, 
        defaultCustomerId: defaultValues?.customerId,
        formCustomerId: data.customerId,
        selectedCustomerId 
      });

      if (pet?.id) {
        // Update existing pet
        console.log('PET FORM: Updating existing pet', {
          petId: pet.id,
          updateData: petData
        });
        
        await updatePet(pet.id, petData);
        toast({
          title: "Pet Updated",
          description: `${data.name} has been updated successfully.`,
        });
        // Close form and trigger refresh
        onSuccess?.(petData);
        onCancel?.();
      } else {
        // Create new pet
        const addedPet = await addPet(petData);
        toast({
          title: "Pet Added",
          description: `${data.name} has been added successfully.`,
        });
        onSuccess?.(addedPet);
        onCancel?.();
      }

      form.reset();
      setImagePreview(null);
    } catch (error) {
      console.error('PET FORM: Submission error', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save pet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderImageUpload = () => {
    return (
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
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a valid image (JPEG, PNG, or GIF)",
          variant: "destructive"
        });
        return;
      }

      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: "Image must be less than 5MB",
          variant: "destructive"
        });
        return;
      }

      // Set image for form
      form.setValue('image', file as File);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Using InsertPet type from schema directly

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(onSubmit)} 
        className="space-y-4 p-4 max-h-[60vh] overflow-y-auto pr-2"
      >
        {/* Customer Selection */}
        {!defaultValues?.customerId && (
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Owner</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Customer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customerOptions.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.firstName} {customer.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        )}

        {/* Pet Image Upload */}
        {renderImageUpload()}

        {/* Owner Details */}
        {pet?.owner && (
          <div className="text-sm text-gray-600 mt-2">
            <p>Owner: {pet.owner.firstName} {pet.owner.lastName}</p>
            {pet.owner.phone && <p>Phone: {pet.owner.phone}</p>}
            {pet.owner.email && <p>Email: {pet.owner.email}</p>}
          </div>
        )}

        {/* Name */}
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

        {/* Pet Type */}
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

        {/* Breed */}
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

        {/* Date of Birth */}
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
                  value={field.value && !isNaN(new Date(field.value).getTime()) 
                    ? new Date(field.value).toISOString().split('T')[0] 
                    : ''}
                  onChange={(e) => {
                    const date = e.target.value 
                      ? new Date(e.target.value + 'T00:00:00Z') 
                      : undefined;
                    field.onChange(date);
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Age */}
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
                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                  value={field.value || ''}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Gender */}
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

        {/* Weight with unit */}
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
                  onValueChange={(value) => field.onChange(value || null)}
                  value={field.value || ""}
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

        {/* Additional Info */}
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
            {defaultValues ? "Update" : "Add"} Pet
          </Button>
        </div>
      </form>
    </Form>
  );
}
