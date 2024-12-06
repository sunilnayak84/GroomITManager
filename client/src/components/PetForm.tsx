import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPetSchema, type InsertPet } from "@db/schema";
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
  updatePet?: (id: string, data: Partial<InsertPet>) => Promise<InsertPet | null>;
  customers?: Customer[];
}

export default function PetForm({
  onSuccess,
  onCancel,
  defaultValues,
  pet,
  updatePet,
  customers
}: PetFormProps) {
  const { addPet } = usePets();
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PetFormData>({
    resolver: zodResolver(insertPetSchema),
    defaultValues: {
      name: "",
      type: "dog",
      breed: "",
      customerId: defaultValues?.customerId || "",
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
    },
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
    type: "dog" | "cat" | "other";
    breed: string;
    customerId: string;
    dateOfBirth?: string;
    age?: number;
    gender?: "male" | "female" | "other";
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

  const onSubmit = async (data: PetFormData) => {
    console.error('PET FORM: onSubmit called', { 
      data, 
      isSubmitting, 
      customers: customers?.map(c => c.id),
      formValues: form.getValues()
    });

    // Prevent multiple submissions
    if (isSubmitting) {
      console.error('PET FORM: Already submitting, preventing duplicate submission');
      return;
    }

    try {
      // Explicitly set submitting state
      setIsSubmitting(true);
      
      // Log form state at submission
      console.error('PET FORM: Form state at submission', {
        formData: data,
        formValues: form.getValues(),
        selectedCustomerId: form.getValues('customerId'),
        customers: customers?.map(c => ({ id: c.id, name: `${c.firstName} ${c.lastName}` }))
      });
      
      // Validate required fields with more detailed logging
      const requiredFields: (keyof PetFormData)[] = ['name', 'type', 'breed', 'customerId'];
      for (const field of requiredFields) {
        const value = data[field];
        console.error(`PET FORM: Checking required field ${field}`, { 
          value, 
          isEmpty: value === undefined || value === null || value === '' 
        });

        if (!value) {
          console.error(`PET FORM: Missing required field ${field}`, { data });
          toast({
            title: "Validation Error",
            description: `${field.charAt(0).toUpperCase() + field.slice(1)} is required`,
            variant: "destructive"
          });
          setIsSubmitting(false);
          return;
        }
      }
      
      // Clean the data by removing empty strings and undefined values
      const cleanedData = Object.fromEntries(
        Object.entries(data)
          .filter(([_, value]) => value !== undefined && value !== '')
          .map(([key, value]) => [key, value === '' ? null : value])
      ) as InsertPet;

      console.error('PET FORM: Cleaned submission data', { 
        cleanedData,
        isUpdate: !!pet,
        petId: pet?.id 
      });

      // Verify customer exists before submission
      const selectedCustomer = customers?.find(c => c.id === cleanedData.customerId);
      if (!selectedCustomer) {
        console.error('PET FORM: Selected customer not found', { 
          customerId: cleanedData.customerId,
          availableCustomers: customers?.map(c => c.id)
        });
        toast({
          title: "Customer Error",
          description: "Selected customer not found. Please select a valid customer.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Check if this is an update operation
      if (pet?.id) {
        // Validate that we have the updatePet function
        if (!updatePet) {
          console.error('PET FORM: Update function not available');
          throw new Error("Update function is not available");
        }

        const updateData: Partial<InsertPet> = {};

        // Check each field and add to updateData only if it's different from the original
        (Object.keys(cleanedData) as Array<keyof InsertPet>).forEach((key) => {
          const currentValue = cleanedData[key];
          const originalValue = pet?.[key];
          
          if (currentValue !== originalValue) {
            updateData[key] = currentValue;
          }
        });

        console.error('PET FORM: Update data', { updateData });

        // If no fields were changed, provide feedback
        if (Object.keys(updateData).length === 0) {
          toast({
            title: "No Changes Detected",
            description: "Please modify at least one field before updating.",
            variant: "default"
          });
          setIsSubmitting(false);
          return;
        }

        // Perform the update
        const updatedPet = await updatePet(pet.id, updateData);
        if (updatedPet) {
          toast({
            title: "Success",
            description: "Pet updated successfully",
            variant: "default"
          });
          onSuccess?.(updateData as PetFormData);
        }
      } else {
        // Add new pet
        const newPet = await addPet(cleanedData);
        
        console.error('PET FORM: New pet added', { newPet });

        toast({
          title: "Success",
          description: "Pet added successfully",
          variant: "default"
        });

        // Reset form and call onSuccess if provided
        form.reset();
        onSuccess?.(data);
      }
    } catch (error) {
      console.error('PET FORM: Submission error', { 
        error, 
        errorMessage: error instanceof Error ? error.message : 'Unknown error' 
      });

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add/update pet",
        variant: "destructive"
      });
    } finally {
      // Always reset submitting state
      setIsSubmitting(false);
    }
  };

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
                  <SelectItem value="other">Other</SelectItem>
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
