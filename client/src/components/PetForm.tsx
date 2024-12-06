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
import { format } from "date-fns";

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
  image: z.string().or(z.instanceof(File)).nullable().optional(),
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
    updatePet: usePetsUpdatePet 
  } = usePets();
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    defaultValues?.customerId || customers?.find(customer => customer.id === defaultValues?.customerId)?.id || pet?.customerId || fetchedCustomers?.find(customer => customer.id === defaultValues?.customerId)?.id || ""
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

  const form = useForm<PetFormData>({
    resolver: zodResolver(insertPetSchema),
    defaultValues: {
      name: "",
      type: "dog",
      breed: "",
      customerId: selectedCustomerId,
      dateOfBirth: pet?.dateOfBirth ? new Date(pet.dateOfBirth) : undefined,
      age: undefined,
      gender: undefined,
      weight: undefined,
      weightUnit: "kg",
      height: undefined,
      heightUnit: "cm",
      image: pet?.image || null,
      notes: undefined,
      ...defaultValues,
      ...(pet && {
        ...pet,
        dateOfBirth: pet.dateOfBirth ? new Date(pet.dateOfBirth) : undefined
      })
    },
    mode: 'onSubmit',
    reValidateMode: 'onSubmit'
  });

  useEffect(() => {
    if (defaultValues?.customerId || pet?.customerId) {
      const customerId = 
        defaultValues?.customerId || 
        pet?.customerId || 
        customers?.find(c => c.id === defaultValues?.customerId)?.id || 
        fetchedCustomers?.find(c => c.id === defaultValues?.customerId)?.id;
      
      if (customerId) {
        setSelectedCustomerId(customerId);
        form.setValue("customerId", customerId);
      }
    }
  }, [defaultValues?.customerId, pet?.customerId, customers, fetchedCustomers, form]);

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

  const onSubmit = async (data: PetFormData) => {
    console.error('PET FORM: Form submitted', { data });
    setIsSubmitting(true);

    try {
      const cleanedData = {
        ...data,
        dateOfBirth: data.dateOfBirth ? data.dateOfBirth.toISOString() : undefined,
        // If image is a string (existing image URL), pass it as is
        // If it's a File, it will be handled by the upload function
        image: data.image,
        customerId: selectedCustomerId,
      };

      if (pet?.id) {
        await usePetsUpdatePet(pet.id, cleanedData);
        onSuccess?.(cleanedData);
        toast({
          title: "Success",
          description: "Pet updated successfully",
        });
      } else {
        // Just call onSuccess with the cleaned data
        onSuccess?.(cleanedData);
      }

      setIsSubmitting(false);
    } catch (error) {
      console.error('PET FORM: Submission error', error);
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: "Failed to save pet. Please try again.",
        variant: "destructive",
      });
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

  return (
    <Form {...form}>
      <form 
        onSubmit={form.handleSubmit(onSubmit)} 
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
                  <FormLabel>Customer</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedCustomerId(value);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {((customers || [])?.concat(fetchedCustomers || [])).map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
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
        {renderImageUpload()}

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
                  value={field.value ? format(new Date(field.value), 'yyyy-MM-dd') : ''}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : undefined;
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
