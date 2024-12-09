import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type InsertPet, type Customer } from "@/lib/types";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useEffect, useCallback } from "react";
import { Upload } from "lucide-react";

const petSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["dog", "cat", "bird", "fish", "other"]),
  breed: z.string().min(1, "Breed is required"),
  customerId: z.string().min(1, "Customer is required"),
  dateOfBirth: z.string().nullable(),
  age: z.union([z.number(), z.string()]).nullable().transform(val => 
    val ? (typeof val === 'string' ? Number(val) : val) : null
  ),
  gender: z.enum(["male", "female", "unknown"]),
  weight: z.string().nullable(),
  weightUnit: z.enum(["kg", "lbs"]),
  image: z.union([z.string(), z.instanceof(File), z.null()]),
  notes: z.string().nullable(),
});

type FormData = z.infer<typeof petSchema>;

interface PetFormProps {
  onSuccess?: (data: InsertPet) => void;
  onCancel?: () => void;
  defaultValues?: Partial<InsertPet>;
  customers?: Customer[];
  customerId?: string;
  selectedCustomer?: Customer;
  isEditing?: boolean;
  onSubmit: (data: InsertPet) => Promise<any>;
}

export function PetForm({
  onSuccess,
  onCancel,
  defaultValues,
  customers = [],
  customerId,
  selectedCustomer: initialSelectedCustomer,
  isEditing = false,
  addPet
}: PetFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
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
      age: defaultValues?.age ?? null,
      gender: defaultValues?.gender ?? "unknown",
      weight: defaultValues?.weight ?? null,
      weightUnit: defaultValues?.weightUnit ?? "kg",
      image: defaultValues?.image ?? null,
      notes: defaultValues?.notes ?? null,
    },
  });

  // Set initial customer when form loads
  useEffect(() => {
    if (customers.length > 0) {
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
        console.log('Setting initial customer:', {
          customerId: effectiveId,
          customerName: `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
        });
        form.setValue('customerId', effectiveId);
      }
    }
  }, [customers, customerId, form]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      form.setValue("image", file);
    }
  };

  const onSubmit = useCallback(async (data: FormData) => {
    if (isSubmitting) {
      console.log('Form submission blocked - already submitting');
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Generate submission ID if not already set
      const currentSubmissionId = submissionId || `${Date.now()}-${Math.random().toString(36).substring(2)}`;
      if (!submissionId) {
        setSubmissionId(currentSubmissionId);
      }

      console.log('Form submission started:', { data, submissionId: currentSubmissionId });

      // Find customer by either firebaseId or id
      const selectedCustomer = customers.find(c => 
        (c.firebaseId && c.firebaseId === data.customerId) || 
        c.id.toString() === data.customerId
      );

      if (!selectedCustomer) {
        throw new Error("Selected customer not found");
      }

      const petData = {
        ...data,
        customerId: selectedCustomer.id.toString(),
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        owner: {
          id: selectedCustomer.id,
          firstName: selectedCustomer.firstName,
          lastName: selectedCustomer.lastName,
          name: `${selectedCustomer.firstName} ${selectedCustomer.lastName}`,
          phone: selectedCustomer.phone || '',
          email: selectedCustomer.email || ''
        },
        submissionId: currentSubmissionId
      };

      console.log('Submitting pet data:', petData);
      
      const result = await onSubmit(petData);
      console.log('Pet creation result:', result);

      if (result) {
        toast({
          title: "Success",
          description: "Pet added successfully",
        });

        form.reset();
        setImagePreview(null);
        setSubmissionId(null);
        onSuccess?.(petData);
      }
    } catch (error) {
      console.error('Error submitting pet form:', error);
      toast({
        title: "Error",
        description: error instanceof Error 
          ? error.message 
          : "Failed to add pet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, submissionId, customers, addPet, form, onSuccess, toast]);

  if (customers.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">Please add at least one customer before adding a pet.</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto p-4">
        <div className="space-y-4">
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

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pet Name*</FormLabel>
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
                <FormLabel>Pet Type*</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
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
                <FormLabel>Breed*</FormLabel>
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
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
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
                <Select onValueChange={field.onChange} value={field.value}>
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
                    <Input {...field} value={field.value ?? ''} />
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
            name="image"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Image</FormLabel>
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
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('pet-image')?.click()}
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

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Notes</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="sticky bottom-0 bg-white pt-4 pb-2 flex justify-end gap-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={isSubmitting || !form.formState.isValid}
            className={isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {isSubmitting ? "Saving..." : "Save Pet"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default PetForm;