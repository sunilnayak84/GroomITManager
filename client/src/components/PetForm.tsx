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
import { useState } from "react";
import { Upload } from "lucide-react";

interface PetFormProps {
  onSuccess?: (data: PetFormData) => void;
  onCancel?: () => void;
  defaultValues?: Partial<PetFormData>;
  pet?: InsertPet;
  updatePet?: (id: string, data: InsertPet) => Promise<InsertPet | null>;
}

export default function PetForm({ onSuccess, onCancel, defaultValues, pet, updatePet }: PetFormProps) {
  const { addPet } = usePets();
  const { data: customers } = useCustomers();
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  type PetFormData = {
    name: string;
    type: "dog" | "cat" | "other";
    breed: string;
    customerId: number;
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

  const form = useForm<PetFormData>({
    resolver: zodResolver(insertPetSchema),
    defaultValues: {
      name: "",
      type: "dog",
      breed: "",
      customerId: defaultValues?.customerId || 0,
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

  const onSubmit = async (data: InsertPet) => {
    try {
      // Log the raw form data for debugging
      console.log('Raw Form Data:', JSON.stringify(data, null, 2));

      // Ensure we have a valid customer ID
      if (!data.customerId) {
        toast({
          title: "Error",
          description: "Please select a customer",
          variant: "destructive"
        });
        return;
      }

      // Validate that updatePet function exists
      if (!updatePet) {
        console.error('updatePet function is not provided');
        toast({
          title: "Error",
          description: "Update function is not available",
          variant: "destructive"
        });
        return;
      }

      // Log initial form data and pet object for debugging
      console.log('Initial Form Data:', JSON.stringify(data, null, 2));
      console.log('Original Pet Object:', JSON.stringify(pet, null, 2));

      // Validate form data
      const cleanedData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => 
          v !== undefined && 
          v !== null && 
          (typeof v !== 'string' || v.trim() !== '')
        )
      );

      console.log('Cleaned Form Data:', JSON.stringify(cleanedData, null, 2));

      // Determine which fields have changed
      const updateData: Partial<InsertPet> = {};
      
      // Check each field and add to updateData only if it's different from the original
      (Object.keys(cleanedData) as Array<keyof InsertPet>).forEach((key) => {
        const currentValue = cleanedData[key];
        const originalValue = pet?.[key];
        
        console.log(`Comparing field ${key}:`, {
          currentValue, 
          originalValue, 
          isDifferent: currentValue !== originalValue,
          comparisonType: typeof currentValue
        });
        
        // More robust comparison
        const isDifferent = 
          currentValue !== originalValue && 
          !(currentValue === '' && originalValue === null) &&
          !(currentValue === null && originalValue === '') &&
          !(currentValue === undefined && originalValue === undefined);

        if (isDifferent) {
          updateData[key] = currentValue;
        }
      });

      console.log('Prepared Update Data:', JSON.stringify(updateData, null, 2));

      // If no changes were made, show info toast and return
      if (Object.keys(updateData).length === 0) {
        console.warn('No changes detected in pet update', {
          originalPet: pet,
          formData: cleanedData
        });
        toast({
          title: "Info",
          description: "No changes were made",
        });
        return;
      }

      // If editing an existing pet, use the ID
      if (pet) {
        console.log('Complete Pet Object:', JSON.stringify(pet, null, 2));
        
        // Robust ID parsing and validation
        let petId: string | undefined;
        
        // Check if the pet has a valid ID from Firestore document
        if (pet.id && typeof pet.id === 'string' && pet.id.trim() !== '') {
          petId = pet.id;
        } 
        // If no ID, try to find the ID in the original document
        else if (pet.createdAt && typeof pet.createdAt === 'object' && 'seconds' in pet.createdAt) {
          // Use createdAt timestamp as a fallback identifier
          petId = `pet_${pet.createdAt.seconds}_${pet.createdAt.nanoseconds}`;
        }

        console.log('Parsed Pet ID:', petId);
        console.log('Parsed Pet ID Type:', typeof petId);

        // Validate pet ID before update
        if (!petId) {
          console.error('No pet ID provided for update', { pet, data });
          toast({
            title: "Error",
            description: "Cannot update pet: Missing ID",
            variant: "destructive"
          });
          return;
        }

        try {
          // Add customerId to update data if it's not already included
          if (!updateData.customerId && data.customerId) {
            updateData.customerId = data.customerId;
          }

          console.log('Final Update Data:', JSON.stringify(updateData, null, 2));
          
          // Validate updatePet call
          if (typeof updatePet !== 'function') {
            throw new Error('updatePet is not a valid function');
          }

          const updateResult = await updatePet(petId, updateData);
          
          if (updateResult) {
            toast({
              title: "Success",
              description: "Pet updated successfully",
            });
            onCancel?.();
          } else {
            console.error('Update failed: No result returned', {
              petId,
              updateData
            });
            toast({
              title: "Error",
              description: "Failed to update pet",
              variant: "destructive"
            });
          }
        } catch (updateError) {
          console.error('Update Error:', {
            error: updateError,
            petId,
            updateData,
            errorType: typeof updateError,
            errorMessage: updateError instanceof Error ? updateError.message : String(updateError)
          });
          
          toast({
            title: "Error",
            description: `Failed to update pet: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`,
            variant: "destructive"
          });
          
          throw updateError;
        }
      } else {
        // If adding a new pet
        const newPet = await addPet({
          ...cleanedData,
          customerId: data.customerId
        });
        
        if (newPet) {
          toast({
            title: "Success", 
            description: "Pet added successfully",
          });
          onCancel?.();
        }
      }
    } catch (error) {
      console.error('Detailed Error in pet form submission:', {
        errorName: error instanceof Error ? error.name : 'Unknown Error',
        errorMessage: error instanceof Error ? error.message : 'No error message',
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        petObject: pet,
        formData: data
      });
      toast({
        title: "Error",
        description: "Failed to save pet details",
        variant: "destructive"
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {/* Customer Selection */}
        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer *</FormLabel>
              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.firstName} {customer.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

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
          <Button type="submit">
            {defaultValues ? "Update" : "Add"} Pet
          </Button>
        </div>
      </form>
    </Form>
  );
}
