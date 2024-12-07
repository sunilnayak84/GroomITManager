import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type InsertPet } from "@/lib/schema";
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
  onSuccess?: (data: PetFormData) => void;
  onCancel?: () => void;
  defaultValues?: Partial<PetFormData>;
  pet?: InsertPet;
  customers?: Customer[];
  updatePet?: (id: string, data: Partial<InsertPet>) => Promise<void>;
  addPet: (data: InsertPet) => Promise<InsertPet>;
  id?: string;
};

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
  const convertToDate = (dateValue: Date | string | { seconds: number, nanoseconds: number } | null | undefined): Date | undefined => {
    if (!dateValue) return undefined;
    
    // If it's already a Date object, return it
    if (dateValue instanceof Date) return dateValue;
    
    // If it's a Firestore timestamp object
    if (typeof dateValue === 'object' && 'seconds' in dateValue) {
      return new Date(dateValue.seconds * 1000);
    }
    
    // If it's a string, try parsing
    if (typeof dateValue === 'string') {
      const parsedDate = new Date(dateValue);
      return !isNaN(parsedDate.getTime()) ? parsedDate : undefined;
    }
    
    return undefined;
  };

  // State for customer selection and image
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(
    defaultValues?.customerId || pet?.customerId
  );
  const [imagePreview, setImagePreview] = useState<string | null | undefined>(
    defaultValues?.image || pet?.image
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
  const form = useForm<PetFormData>({
    resolver: zodResolver(insertPetSchema),
    defaultValues: {
      name: defaultValues?.name || pet?.name || "",
      type: defaultValues?.type || pet?.type || "dog",
      breed: defaultValues?.breed || pet?.breed || "",
      customerId: defaultValues?.customerId || pet?.customerId || "",
      dateOfBirth: convertToDate(defaultValues?.dateOfBirth || pet?.dateOfBirth),
      age: defaultValues?.age || pet?.age,
      gender: defaultValues?.gender || pet?.gender,
      weight: defaultValues?.weight || pet?.weight,
      weightUnit: defaultValues?.weightUnit || pet?.weightUnit || "kg",
      image: defaultValues?.image || pet?.image,
      notes: defaultValues?.notes || pet?.notes
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
      Object.keys(formDefaults).forEach(key => 
        formDefaults[key] === undefined && delete formDefaults[key]
      );

      form.reset(formDefaults);
      
      // Set image preview if there's an existing image
      if (defaultValues?.imageUrl || pet?.imageUrl) {
        setImagePreview(defaultValues?.imageUrl || pet?.imageUrl);
      }

      // Update selected customer ID
      if (formDefaults.customerId) {
        setSelectedCustomerId(formDefaults.customerId);
      }
    }
  }, [defaultValues, pet, form, selectedCustomerId]);

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
        // Convert date to a consistent format
        dateOfBirth: data.dateOfBirth 
          ? (data.dateOfBirth instanceof Date 
            ? data.dateOfBirth 
            : new Date(data.dateOfBirth)) 
          : undefined
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
        
        await updatePet(pet.id.toString(), petData);
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
      form.setValue('image', file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
