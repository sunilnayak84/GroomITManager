import { useForm } from "react-hook-form";
import { useBreeds } from "@/hooks/use-breeds";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type InsertPet, type Customer } from "@/lib/types";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import React, { useState, useEffect } from "react";
import { Upload } from "lucide-react";

const petSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["dog", "cat", "bird", "fish", "other"], {
    required_error: "Pet type is required"
  }),
  breed: z.string().min(1, "Breed is required"),
  customerId: z.string().min(1, "Customer is required"),
  dateOfBirth: z.string().nullable(),
  age: z.number().nullable().or(z.string().transform(val => val ? Number(val) : null)),
  gender: z.enum(["male", "female", "unknown", "other"], {
    required_error: "Gender is required"
  }).nullable(),
  weight: z.union([
    z.string().transform(val => val ? Number(val) : null),
    z.number(),
    z.null()
  ]).nullable(),
  weightUnit: z.enum(["kg", "lbs"], {
    required_error: "Weight unit is required"
  }).default("kg"),
  image: z.union([z.string(), z.instanceof(File), z.null()]).nullable(),
  notes: z.string().nullable(),
  submissionId: z.string().optional()
});

type FormData = z.infer<typeof petSchema>;

interface PetFormProps {
  handleSubmit: (data: InsertPet) => Promise<any>;
  onSuccess?: (data: InsertPet) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
  defaultValues?: Partial<InsertPet>;
  customers?: Customer[];
  customerId?: string;
  hideCustomerField?: boolean;
  isEditing?: boolean;
}

export function PetForm({
  handleSubmit: submitForm,
  onSuccess,
  onError,
  onCancel,
  defaultValues,
  customers = [],
  customerId,
  hideCustomerField = false,
  isEditing = false,
}: PetFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(
    typeof defaultValues?.image === 'string' ? defaultValues.image : null
  );

  const form = useForm<FormData>({
    resolver: zodResolver(petSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      type: defaultValues?.type ?? "dog",
      breed: defaultValues?.breed ?? "",
      customerId: customerId ?? "",
      dateOfBirth: defaultValues?.dateOfBirth ?? null,
      age: defaultValues?.age ? Number(defaultValues.age) : null,
      gender: (defaultValues?.gender as "male" | "female" | "unknown" | null) ?? "unknown",
      weight: defaultValues?.weight ? Number(defaultValues.weight) : null,
      weightUnit: defaultValues?.weightUnit ?? "kg",
      image: defaultValues?.image ?? null,
      notes: defaultValues?.notes ?? null,
      submissionId: undefined // Initialize submissionId to undefined
    },
  });

  // Set initial customer when form loads
  useEffect(() => {
    if (!hideCustomerField && customers.length > 0) {
      let selectedCustomer;
      if (customerId) {
        selectedCustomer = customers.find(c =>
          (c.firebaseId && c.firebaseId === customerId) ||
          c.id.toString() === customerId
        );
      }
      if (!selectedCustomer) {
        selectedCustomer = customers[0];
      }
      if (selectedCustomer) {
        const effectiveId = selectedCustomer.firebaseId || selectedCustomer.id.toString();
        form.setValue('customerId', effectiveId);
      }
    }
  }, [customers, customerId, form, hideCustomerField]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }

      try {
        const imageUrl = URL.createObjectURL(file);
        setImagePreview(imageUrl);
        form.setValue("image", file);
      } catch (error) {
        console.error('Error handling image:', error);
        toast({
          title: "Error",
          description: "Failed to process image. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (data) => {
          if (isSubmitting) {
            console.log('PetForm: Already submitting, skipping');
            return;
          }

          console.log('PetForm: Starting form submission', { formData: data });
          setIsSubmitting(true);

          try {
            const petData = {
              name: data.name,
              type: data.type,
              breed: data.breed,
              customerId: customerId || data.customerId,
              dateOfBirth: data.dateOfBirth,
              age: data.age,
              gender: data.gender,
              weight: data.weight,
              weightUnit: data.weightUnit,
              image: data.image,
              notes: data.notes,
              owner: hideCustomerField ? defaultValues?.owner : null,
              submissionId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            };

            console.log('PetForm: Submitting pet data:', petData);
            const result = await submitForm(petData);

            if (!result) {
              throw new Error('Failed to save pet');
            }

            form.reset();
            toast({
              title: "Success",
              description: "Pet saved successfully"
            });
            onSuccess?.(petData);
          } catch (error) {
            console.error('PetForm: Submit error details:', {
              error,
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
              formData: data
            });
            toast({
              title: "Error",
              description: error instanceof Error ? error.message : "Failed to save pet",
              variant: "destructive"
            });
            onError?.(error instanceof Error ? error : new Error('Unknown error'));
          } finally {
            setIsSubmitting(false);
          }
        })}
        className="space-y-4"
      >
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="image"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pet Image</FormLabel>
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
                        disabled={isSubmitting}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('pet-image')?.click()}
                        disabled={isSubmitting}
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

          {!hideCustomerField && (
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner*</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select owner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map((customer) => {
                        const value = customer.firebaseId || customer.id.toString();
                        return (
                          <SelectItem
                            key={value}
                            value={value}
                          >
                            {customer.firstName} {customer.lastName}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pet Name*</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isSubmitting} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => {
              const { breeds } = useBreeds();
              const uniqueTypes = [...new Set(breeds?.map(breed => breed.type) || [])].sort();

              return (
                <FormItem>
                  <FormLabel>Pet Type*</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select pet type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {uniqueTypes.map((type) => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="breed"
            render={({ field }) => {
              const { breeds } = useBreeds();
              const filteredBreeds = breeds?.filter(breed => breed.type === form.watch('type'))
                .sort((a, b) => a.name.localeCompare(b.name)) || [];

              return (
                <FormItem>
                  <FormLabel>Breed*</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select breed" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredBreeds.map((breed) => (
                        <SelectItem key={breed.id} value={breed.name}>
                          {breed.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              );
            }}
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
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    disabled={isSubmitting}
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
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    disabled={isSubmitting}
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
                <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isSubmitting}>
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
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value || null);
                      }}
                      disabled={isSubmitting}
                    />
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
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
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
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Notes</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} disabled={isSubmitting} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="sticky bottom-0 bg-white pt-4 pb-2 flex justify-end gap-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting}
            className={isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {isSubmitting ? "Saving..." : isEditing ? "Update Pet" : "Save Pet"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default PetForm;