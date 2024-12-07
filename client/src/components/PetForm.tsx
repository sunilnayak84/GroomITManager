import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type InsertPet } from "@db/schema";
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

interface PetFormProps {
  onSuccess?: (data: PetFormData) => void;
  onCancel?: () => void;
  defaultValues?: Partial<PetFormData>;
  pet?: InsertPet;
  customers?: Customer[];
  updatePet?: (data: { id: string; [key: string]: any }) => Promise<void>;
}

const insertPetSchema = z.object({
  name: z.string().min(1, { message: "Pet name is required" }),
  type: z.enum(["dog", "cat", "bird", "fish", "other"], { 
    required_error: "Pet type is required",
    invalid_type_error: "Invalid pet type selected"
  }),
  breed: z.string().min(1, { message: "Breed is required" }),
  customerId: z.string().min(1, { message: "Customer is required" }),
  dateOfBirth: z.coerce.date().optional(),
  age: z.coerce.number().optional(),
  gender: z.enum(["male", "female", "unknown"]).optional(),
  weight: z.coerce.number().optional(),
  weightUnit: z.enum(["kg", "lbs"]).default("kg"),
  image: z.string().or(z.instanceof(File)).nullable().optional(),
  notes: z.string().optional()
}).refine(data => {
  // Ensure that if optional fields are provided, they are valid
  if (data.weight !== undefined && isNaN(data.weight)) {
    throw new Error("Weight must be a valid number");
  }
  if (data.age !== undefined && isNaN(data.age)) {
    throw new Error("Age must be a valid number");
  }
  return true;
}, {
  message: "Invalid optional field"
});

export default function PetForm({
  onSuccess,
  onCancel,
  customers,
  defaultValues,
  pet,
  updatePet: externalUpdatePet
}: PetFormProps) {
  const { 
    updatePet: usePetsUpdatePet,
    addPet
  } = usePets();
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    defaultValues?.customerId || ""
  );

  console.log('PET FORM: Component Mounted', { 
    customers, 
    defaultValues, 
    pet, 
    selectedCustomerId 
  });

  useEffect(() => {
    // Set image preview when pet prop changes
    if (pet?.image) {
      setImagePreview(pet.image);
    }
  }, [pet]);

  // Initialize form with default values
  const form = useForm<PetFormData>({
    resolver: zodResolver(insertPetSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      type: defaultValues?.type || "dog",
      breed: defaultValues?.breed || "",
      customerId: defaultValues?.customerId || "",
      dateOfBirth: defaultValues?.dateOfBirth,
      age: defaultValues?.age,
      gender: defaultValues?.gender,
      weight: defaultValues?.weight,
      weightUnit: defaultValues?.weightUnit || "kg",
      image: defaultValues?.image || undefined,
      notes: defaultValues?.notes
    },
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  });

  // Reset form when defaultValues change
  useEffect(() => {
    if (defaultValues) {
      console.log('PET FORM: Resetting form with default values:', defaultValues);
      form.reset({
        name: defaultValues.name || "",
        type: defaultValues.type || "dog",
        breed: defaultValues.breed || "",
        customerId: defaultValues.customerId || "",
        dateOfBirth: defaultValues.dateOfBirth,
        age: defaultValues.age,
        gender: defaultValues.gender,
        weight: defaultValues.weight,
        weightUnit: defaultValues.weightUnit || "kg",
        image: defaultValues.image || undefined,
        notes: defaultValues.notes
      });
    }
  }, [defaultValues, form]);

  // Ensure selectedCustomerId is always set from defaultValues
  useEffect(() => {
    if (defaultValues?.customerId) {
      const customerId = defaultValues.customerId;
      setSelectedCustomerId(customerId);
      form.setValue("customerId", customerId);
    }
  }, [defaultValues?.customerId, form]);

  // Simplified logging with more robust checks
  useEffect(() => {
    console.log('PET FORM: Component Details', {
      customersCount: customers?.length || 0,
      defaultCustomerId: defaultValues?.customerId,
      selectedCustomerId: selectedCustomerId,
      formCustomerId: form.getValues('customerId')
    });
  }, [customers, defaultValues, selectedCustomerId, form]);

  type PetFormData = {
    name: string;
    type: "dog" | "cat" | "bird" | "fish" | "other";
    breed: string;
    customerId: string;
    dateOfBirth?: string;
    age?: number;
    gender?: "male" | "female" | "unknown";
    weight?: string;
    weightUnit: "kg" | "lbs";
    image?: string | null;
    notes?: string;
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
      form.setValue('image', file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const updatePet = externalUpdatePet || usePetsUpdatePet;

  const onSubmit = async (data: PetFormData) => {
    setIsSubmitting(true);
    try {
      const customerId = defaultValues?.customerId || data.customerId || selectedCustomerId;
      
      if (!customerId) {
        throw new Error("Customer ID is required to add a pet");
      }

      const petData: InsertPet = {
        ...data,
        customerId: customerId,
        imageUrl: imagePreview || undefined,
      };

      console.log('PET FORM: Submitting Pet Data', { 
        petData, 
        defaultCustomerId: defaultValues?.customerId,
        formCustomerId: data.customerId,
        selectedCustomerId 
      });

      if (pet) {
        // Update existing pet
        await updatePet({ id: pet.id, ...petData });
        toast({
          title: "Pet Updated",
          description: `${data.name} has been updated successfully.`,
        });
      } else {
        // Create new pet
        const addedPet = await addPet(petData);
        toast({
          title: "Pet Added",
          description: `${data.name} has been added successfully.`,
        });
        onSuccess?.(addedPet);
      }

      form.reset();
      setImagePreview(null);
      onCancel?.();
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

  const { data: fetchedCustomers } = useCustomers();

  // Safely handle fetched customers
  const availableCustomers = useMemo(() => {
    return [
      ...(customers || []),
      ...(fetchedCustomers || [])
    ].filter(customer => customer && customer.id);
  }, [customers, fetchedCustomers]);

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
                    {availableCustomers.map((customer) => (
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
            <p>Owner: {pet.owner.name}</p>
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
                onValueChange={field.onChange}
                value={field.value}
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
