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
import { useState, useEffect } from "react";
import { Upload } from "lucide-react";

interface PetFormProps {
  onSuccess?: (data: PetFormData) => void;
  onCancel?: () => void;
  defaultValues?: Partial<PetFormData>;
  pet?: InsertPet;
  customers?: Customer[];
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
  height: z.coerce.number().optional(),
  heightUnit: z.enum(["cm", "inches"]).default("cm"),
  image: z.instanceof(File).nullable().optional(),
  notes: z.string().optional()
}).refine(data => {
  // Ensure that if optional fields are provided, they are valid
  if (data.weight !== undefined && isNaN(data.weight)) {
    throw new Error("Weight must be a valid number");
  }
  if (data.height !== undefined && isNaN(data.height)) {
    throw new Error("Height must be a valid number");
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
  pet
}: PetFormProps) {
  const { 
    addPet, 
    updatePet: usePetsUpdatePet 
  } = usePets();
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    defaultValues?.customerId || pet?.customerId || ""
  );

  console.error('PET FORM: Component Mounted', { 
    customers, 
    defaultValues, 
    pet, 
    selectedCustomerId 
  });

  const form = useForm<PetFormData>({
    resolver: zodResolver(insertPetSchema),
    defaultValues: {
      name: "",
      type: "dog",
      breed: "",
      customerId: selectedCustomerId,
      dateOfBirth: undefined,
      age: undefined,
      gender: undefined,
      weight: undefined,
      weightUnit: "kg",
      height: undefined,
      heightUnit: "cm",
      image: null,
      notes: undefined,
      ...defaultValues,
      ...pet
    },
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  });

  // Log customers and form details on component mount
  useEffect(() => {
    console.error('PET FORM: Component Mounted', { 
      customers: customers?.map(c => ({
        id: c.id, 
        name: `${c.firstName} ${c.lastName}`,
        petCount: c.petCount
      })),
      defaultValues,
      pet,
      selectedCustomerId: form.getValues('customerId')
    });
  }, [customers, defaultValues, pet, form]);

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
    height?: string;
    heightUnit: "cm" | "inches";
    image?: string | null;
    notes?: string;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        form.setValue("image", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    console.log('PET FORM: Submit button clicked', { event, formValues: form.getValues(), formErrors: form.formState.errors });

    // Validate form
    const validationResult = insertPetSchema.safeParse(form.getValues());
    console.log('PET FORM: Form submission event', { 
      event, 
      isValid: validationResult.success, 
      errors: !validationResult.success ? validationResult.error.flatten().fieldErrors : {} 
    });

    if (!validationResult.success) {
      const fieldErrors = validationResult.error.flatten().fieldErrors;
      
      // Display specific toast errors
      Object.entries(fieldErrors).forEach(([field, errors]) => {
        if (errors.length > 0) {
          toast({
            title: field.charAt(0).toUpperCase() + field.slice(1),
            description: errors[0],
            variant: "destructive"
          });
        }
      });

      return;
    }

    // Start submission
    console.log('PET FORM: Submission started', { formData: form.getValues(), formState: form.formState });

    // Prepare cleaned data outside try-catch to ensure it's in scope
    const cleanedData: InsertPet = {
      ...form.getValues(),
      customerId: selectedCustomerId,
      // Convert date to timestamp if needed
      ...(form.getValues().dateOfBirth ? { 
        dateOfBirth: form.getValues().dateOfBirth instanceof Date 
          ? form.getValues().dateOfBirth 
          : new Date(form.getValues().dateOfBirth) 
      } : {})
    };

    console.log('PET FORM: Cleaned submission data', { 
      cleanedData, 
      isUpdate: !!pet, 
      petId: pet?.id, 
      selectedCustomer: customers?.find(c => c.id === cleanedData.customerId)
    });

    try {
      // Verify customer exists before submission
      const selectedCustomer = customers?.find(c => c.id === cleanedData.customerId);
      if (!selectedCustomer) {
        console.error('PET FORM: Selected customer not found', { 
          customerId: cleanedData.customerId,
          availableCustomers: customers?.map(c => ({ 
            id: c.id, 
            name: `${c.firstName} ${c.lastName}` 
          }))
        });
        
        form.setError('customerId', {
          type: 'validate',
          message: 'Selected customer not found'
        });

        toast({
          title: "Customer Error",
          description: "Selected customer not found",
          variant: "destructive"
        });
        return;
      }

      // Perform add or update
      if (pet) {
        // Update existing pet
        await usePetsUpdatePet(pet.id, cleanedData);
        toast({
          title: "Success",
          description: "Pet updated successfully!",
          variant: "default"
        });
      } else {
        // Add new pet
        await addPet(cleanedData);
        toast({
          title: "Success",
          description: "Pet added successfully!",
          variant: "default"
        });
      }

      // Reset form and call onSuccess if provided
      form.reset();
      onSuccess?.(form.getValues());
    } catch (error) {
      console.error('PET FORM: Error adding pet', { 
        error, 
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        cleanedData 
      });

      // Specific error handling for different types of errors
      if (error instanceof Error) {
        if (error.message.includes('Missing required fields')) {
          toast({
            title: "Validation Error",
            description: "Please fill in all required fields",
            variant: "destructive"
          });
        } else if (error.message.includes('Customer')) {
          toast({
            title: "Customer Error",
            description: "Invalid customer selected",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error",
            description: `Failed to ${pet ? 'update' : 'add'} pet: ${error.message}`,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Error",
          description: `Failed to ${pet ? 'update' : 'add'} pet`,
          variant: "destructive"
        });
      }
    }
  };

  return (
    <Form {...form}>
      <form 
        onSubmit={onSubmit} 
        className="space-y-4 p-4 max-h-[60vh] overflow-y-auto pr-2"
      >
        {/* Customer Selection */}
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <FormLabel className="text-right" htmlFor="customerId">
              Owner
            </FormLabel>
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer *</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      console.error('PET FORM: Customer Selected', { 
                        selectedCustomerId: value,
                        selectedCustomer: customers?.find(c => c.id === value)
                      });
                      field.onChange(value);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem 
                          key={customer.id} 
                          value={customer.id}
                        >
                          {customer.firstName} {customer.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Pet Image Upload */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-2 relative overflow-hidden">
            {imagePreview ? (
              <img src={imagePreview} alt="Pet preview" className="w-full h-full object-cover" />
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
                  value={field.value || ''}
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

        {/* Height with unit */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="height"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Height</FormLabel>
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
            name="heightUnit"
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
                    <SelectItem value="cm">cm</SelectItem>
                    <SelectItem value="inches">inches</SelectItem>
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
