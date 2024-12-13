import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PetDetails } from "@/components/PetDetails";
import { Plus, Search, Loader2 } from "lucide-react";
import { useCustomers } from "@/hooks/use-customers";
import { usePets } from "@/hooks/use-pets";
import { Timestamp } from "firebase/firestore";
import type { FirestoreTimestamp } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { insertCustomerSchema, type InsertCustomer } from "@/lib/schema";
import type { Customer } from "@/lib/schema";
import type { Pet, InsertPet, FirestoreDate } from "@/lib/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DataTable } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import { PetForm } from "@/components/PetForm";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

export default function CustomersPage() {
  const [open, setOpen] = useState(false);
  const [showPetList, setShowPetList] = useState(false);
  const [showAddPet, setShowAddPet] = useState(false);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const formatDate = (date: FirestoreTimestamp | string | null | undefined) => {
    if (!date) return 'N/A';
    try {
      if (date instanceof Timestamp) {
        return date.toDate().toLocaleDateString();
      }
      if (typeof date === 'string') {
        const parsedDate = new Date(date);
        return !isNaN(parsedDate.getTime()) ? parsedDate.toLocaleDateString() : 'Invalid Date';
      }
      return 'N/A';
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };
  const [showPetDetails, setShowPetDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const { 
    customersQuery, 
    updateCustomerMutation, 
    deleteCustomerMutationHook, 
    addCustomerMutation 
  } = useCustomers();
  const { pets = [], isLoading: isPetsLoading, addPet, updatePet, deletePet } = usePets();
  const queryClient = useQueryClient();
  
  // Convert pets to proper type
  const typedPets = useMemo(() => 
    pets.map(pet => ({
      ...pet,
      type: pet.type as "dog" | "cat" | "bird" | "fish" | "other",
      gender: pet.gender as "male" | "female" | "unknown" | null
    })), 
    [pets]
  );

  // Type guard for Pet type
  const isPet = (pet: any): pet is Pet => {
    return pet && 
      typeof pet.id === 'string' && 
      typeof pet.name === 'string' &&
      ['dog', 'cat', 'bird', 'fish', 'other'].includes(pet.type);
  };

  // Convert Firestore customer data to match the expected type
  const customersData = useMemo(() => {
    return (customersQuery.data || []).map(customer => {
      const processTimestamp = (timestamp: FirestoreTimestamp | string | null | undefined): string | null => {
        if (!timestamp) return null;
        if (typeof timestamp === 'string') return timestamp;
        if (timestamp instanceof Timestamp) {
          return timestamp.toDate().toISOString();
        }
        return null;
      };

      return {
        ...customer,
        id: String(customer.id),
        gender: customer.gender as "male" | "female" | "other" | null,
        createdAt: processTimestamp(customer.createdAt) || new Date().toISOString(),
        updatedAt: processTimestamp(customer.updatedAt),
        petCount: typeof customer.petCount === 'number' ? customer.petCount : 0
      };
    });
  }, [customersQuery.data]);

  // Memoize the pets data
  const petsData = useMemo(() => ({
    petsAvailable: !!pets,
    petsCount: pets?.length,
    petsMap: new Map(pets?.map(p => [p.id, p]) ?? [])
  }), [pets]);

  const form = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      gender: undefined,
      address: "",
    },
  });

  const editForm = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      gender: "male",
      address: "",
    },
  });

  // Populate edit form when customer is selected
  useEffect(() => {
    if (selectedCustomer && isEditing) {
      editForm.reset({
        firstName: selectedCustomer.firstName,
        lastName: selectedCustomer.lastName,
        email: selectedCustomer.email,
        phone: selectedCustomer.phone,
        gender: selectedCustomer.gender,
        address: selectedCustomer.address || "",
      });
    }
  }, [selectedCustomer, isEditing]);

  const columns = [
    {
      header: "Customer",
      cell: (row: Customer) => (
        <div className="flex items-center gap-2">
          <img
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(`${row.firstName} ${row.lastName}`)}`}
            alt={`${row.firstName} ${row.lastName}`}
            className="w-10 h-10 rounded-full bg-primary/10"
          />
          <div>
            <div className="font-medium">{`${row.firstName} ${row.lastName}`}</div>
            <div className="text-sm text-muted-foreground">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Phone",
      cell: (row: Customer) => row.phone,
    },
    {
      header: "Address",
      cell: (row: Customer) => row.address || "N/A",
    },
    {
      header: "Pet Count",
      cell: (row: Customer) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="text-lg font-medium"
            onClick={() => {
              setSelectedCustomer(row);
              setShowPetList(true);
            }}
          >
            {row.petCount || 0}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedCustomer(row);
              setShowAddPet(true);
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
    {
      header: "Actions",
      cell: (row: Customer) => (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            setSelectedCustomer(row);
            setShowCustomerDetails(true);
          }}
        >
          View Details
        </Button>
      ),
    },
  ];

  // Memoize the filtered pets for the selected customer
  const selectedCustomerPets = useMemo(() => {
    if (!selectedCustomer?.id || !Array.isArray(pets)) return [];
    return pets.filter(pet => pet.customerId?.toString() === selectedCustomer.id.toString())
      .map(pet => ({
        ...pet,
        id: String(pet.id),
        name: String(pet.name),
        breed: String(pet.breed),
        type: (pet.type || 'other') as Pet['type'],
        image: pet.image ? String(pet.image) : null,
        gender: (pet.gender || 'unknown') as Pet['gender'],
        customerId: String(pet.customerId),
        createdAt: typeof pet.createdAt === 'string' 
          ? pet.createdAt 
          : new Date().toISOString(),
        updatedAt: null
      }));
  }, [selectedCustomer?.id, pets]);

  // Memoize the pets map for quick lookup
  const petsMap = useMemo(() => {
    if (!Array.isArray(pets)) return new Map();
    return new Map(pets.map(pet => [pet.customerId?.toString(), pet]));
  }, [pets]);

  async function onSubmit(data: InsertCustomer) {
    setIsSubmitting(true);
    try {
      // Validate required fields
      const validationErrors: string[] = [];

      // Validate firstName
      if (!data.firstName || data.firstName.trim().length < 2) {
        validationErrors.push("First name must be at least 2 characters");
      }

      // Validate lastName
      if (!data.lastName || data.lastName.trim().length < 2) {
        validationErrors.push("Last name must be at least 2 characters");
      }

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!data.email || !emailRegex.test(data.email)) {
        validationErrors.push("Invalid email format");
      }

      // Validate phone
      const phoneRegex = /^[0-9]{10,}$/;
      const phoneDigits = data.phone.replace(/\D/g, '');
      if (!data.phone || !phoneRegex.test(phoneDigits)) {
        validationErrors.push("Phone number must be at least 10 digits");
      }

      // Validate gender
      const validGenders = ['male', 'female', 'other'];
      if (!data.gender || !validGenders.includes(data.gender)) {
        validationErrors.push("Invalid gender selection");
      }

      // If there are validation errors, show them
      if (validationErrors.length > 0) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: validationErrors.join('; ')
        });
        setIsSubmitting(false);
        return;
      }

      // Log the attempt to create a customer
      console.log('ADD_CUSTOMER: Attempting to create customer', { data });

      // Mutate using the addCustomerMutation
      await addCustomerMutation.mutateAsync({
        ...data,
        address: data.address || null
      } as InsertCustomer);

      // Reset form and close dialog
      setOpen(false);
      form.reset();

      // Show success toast
      toast({
        title: "Success",
        description: "Customer added successfully",
      });
    } catch (error) {
      // Log the full error details
      console.error('ADD_CUSTOMER: Error in onSubmit', { 
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        customerData: data
      });

      // Show error toast with more details
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error 
          ? error.message 
          : "Failed to add customer. Please check your input and try again."
      });
    } finally {
      // Ensure submitting state is reset
      setIsSubmitting(false);
    }
  }

  async function editCustomer(data: InsertCustomer) {
    try {
      // Use the updateCustomerMutation from the hook
      if (!selectedCustomer?.id) {
        throw new Error('No customer selected for update');
      }
      
      await updateCustomerMutation.mutateAsync({ 
        id: selectedCustomer.id, 
        data: {
          ...data
        } as InsertCustomer
      });
      
      // Update the selected customer with type casting for gender
      setSelectedCustomer(prev => prev ? {
        ...prev,
        ...data,
        gender: data.gender as "male" | "female" | "other" | null
      } : null);
      
      setIsSubmitting(false);
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });
    } catch (error) {
      setIsSubmitting(false);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update customer",
      });
    }
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="relative h-48 rounded-xl overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 mb-6">
        <img
          src="https://images.unsplash.com/photo-1573497620053-ea5300f94f21"
          alt="Professional Customer Service"
          className="w-full h-full object-cover opacity-50 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/40 flex items-center px-10">
          <div className="text-white">
            <h2 className="text-3xl font-bold mb-2">Customer Management</h2>
            <p className="text-lg opacity-90">Keep track of all your valued customers</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              className="pl-10 h-10 text-sm bg-white"
            />
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="h-12 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Plus className="mr-2 h-5 w-5" /> Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Fill out the form below to add a new customer to your system.
              </p>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="John" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Doe" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <div className="flex">
                          <select className="h-10 rounded-l-md border border-r-0 bg-background px-3 text-sm ring-offset-background">
                            <option value="+91">🇮🇳 +91</option>
                          </select>
                          <Input className="rounded-l-none" {...field} placeholder="Enter phone number" />
                        </div>
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
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            className="form-radio h-4 w-4"
                            name="gender"
                            value="male"
                            checked={field.value === 'male'}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                          <span className="ml-2">Male</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            className="form-radio h-4 w-4"
                            name="gender"
                            value="female"
                            checked={field.value === 'female'}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                          <span className="ml-2">Female</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            className="form-radio h-4 w-4"
                            name="gender"
                            value="other"
                            checked={field.value === 'other'}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                          <span className="ml-2">Other</span>
                        </label>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value?.toString() || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Create Owner
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {customersQuery.isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="p-1">
            <DataTable 
              columns={columns} 
              data={customersData as Customer[]}
            />
          </div>
        )}
      </div>

      {/* Pet List Dialog */}
      <Dialog open={showPetList} onOpenChange={setShowPetList}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Pets for {selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : ''}</DialogTitle>
            <div className="text-sm text-muted-foreground">
              View and manage pets for this customer
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Pets</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPetList(false);
                  setShowAddPet(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Pet
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {isPetsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : !selectedCustomerPets || selectedCustomerPets.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p>No pets found for this customer</p>
                  <p className="text-sm text-muted-foreground mt-2">Click the "Add Pet" button to add a new pet.</p>
                </div>
              ) : (
                selectedCustomerPets.map(pet => (
                  <div key={pet.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent transition-colors">
                    <img
                      src={pet.image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${String(pet.name)}`}
                      alt={String(pet.name)}
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{String(pet.name)}</div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {String(pet.breed) || 'Unknown breed'} · {String(pet.type) || 'Unknown type'}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      onClick={() => {
                        const typedPet: Pet = {
                          id: String(pet.id),
                          firebaseId: null,
                          image: pet.image ? String(pet.image) : null,
                          name: String(pet.name),
                          breed: String(pet.breed),
                          type: (pet.type || 'other') as Pet['type'],
                          gender: (pet.gender || 'unknown') as Pet['gender'],
                          customerId: String(pet.customerId),
                          dateOfBirth: pet.dateOfBirth ? String(pet.dateOfBirth) : null,
                          age: typeof pet.age === 'number' ? pet.age : null,
                          weight: typeof pet.weight === 'number' ? pet.weight : typeof pet.weight === 'string' ? parseFloat(pet.weight) : null,
                          weightUnit: pet.weightUnit || 'kg',
                          notes: pet.notes ? String(pet.notes) : null,
                          createdAt: typeof pet.createdAt === 'string' ? pet.createdAt : new Date().toISOString(),
                          updatedAt: null,
                          submissionId: pet.submissionId ? String(pet.submissionId) : undefined,
                          owner: pet.owner ? {
                            id: String(pet.owner.id),
                            name: String(pet.owner.name),
                            email: pet.owner.email ? String(pet.owner.email) : null
                          } : null
                        };
                        setSelectedPet(typedPet);
                        setShowPetDetails(true);
                      }}
                    >
                      View
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Pet Dialog */}
      <Dialog open={showAddPet} onOpenChange={setShowAddPet}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Pet</DialogTitle>
            <DialogDescription>Enter the details for the new pet below.</DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div>
              {/* We'll reuse the PetForm component but pre-fill the customer */}
              <PetForm
                handleSubmit={async (data) => {
                  if (!selectedCustomer) return false;
                  
                  try {
                    // Ensure proper type conversion and validation
                    const petData: InsertPet = {
                      name: data.name,
                      type: data.type,
                      breed: data.breed,
                      customerId: selectedCustomer.id.toString(),
                      dateOfBirth: data.dateOfBirth,
                      age: data.age,
                      gender: data.gender,
                      weight: data.weight,
                      weightUnit: data.weightUnit || "kg",
                      image: data.image,
                      notes: data.notes,
                      owner: {
                        id: selectedCustomer.id.toString(),
                        name: `${selectedCustomer.firstName} ${selectedCustomer.lastName}`,
                        email: selectedCustomer.email || null
                      }
                    };

                    console.log('Submitting pet data:', petData);
                    await addPet(petData);
                    
                    // Refresh both pets and customers data
                    await Promise.all([
                      queryClient.invalidateQueries({ queryKey: ['pets'] }),
                      queryClient.invalidateQueries({ queryKey: ['customers'] })
                    ]);
                    
                    toast({
                      title: "Success",
                      description: "Pet added successfully",
                    });
                    
                    setShowAddPet(false);
                    return true;
                  } catch (error) {
                    console.error('Error adding pet:', error);
                    toast({
                      variant: "destructive",
                      title: "Error",
                      description: error instanceof Error ? error.message : "Failed to add pet",
                    });
                    return false;
                  }
                }}
                defaultValues={{
                  customerId: selectedCustomer.id,
                  type: "dog",
                  weightUnit: "kg",
                  gender: "unknown"
                }}
                hideCustomerField={true}
                customerId={selectedCustomer.id}
                customers={customersQuery.data || []}
                onCancel={() => setShowAddPet(false)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Customer Details Dialog */}
      <Dialog open={showCustomerDetails} onOpenChange={setShowCustomerDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription className="sr-only">Customer information and details</DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              {isEditing ? (
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(editCustomer)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={editForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <div className="flex gap-4">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                className="form-radio h-4 w-4"
                                name="gender"
                                value="male"
                                checked={field.value === 'male'}
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                              <span className="ml-2">Male</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                className="form-radio h-4 w-4"
                                name="gender"
                                value="female"
                                checked={field.value === 'female'}
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                              <span className="ml-2">Female</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                className="form-radio h-4 w-4"
                                name="gender"
                                value="other"
                                checked={field.value === 'other'}
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                              <span className="ml-2">Other</span>
                            </label>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-4">
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                      <Button type="button" variant="outline" className="flex-1" onClick={() => {
                        setIsEditing(false);
                        editForm.reset();
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div>
                  <div className="flex items-center gap-4">
                    <img
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(`${selectedCustomer.firstName} ${selectedCustomer.lastName}`)}`}
                      alt={`${selectedCustomer.firstName} ${selectedCustomer.lastName}`}
                      className="w-20 h-20 rounded-full bg-primary/10"
                    />
                    <div>
                      <h2 className="text-2xl font-bold">{`${selectedCustomer.firstName} ${selectedCustomer.lastName}`}</h2>
                      <p className="text-muted-foreground">{selectedCustomer.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h3 className="font-semibold">Contact Information</h3>
                      <p><span className="text-muted-foreground">Phone:</span> {selectedCustomer.phone}</p>
                      <p><span className="text-muted-foreground">Email:</span> {selectedCustomer.email}</p>
                      <p><span className="text-muted-foreground">Address:</span> {selectedCustomer.address || 'N/A'}</p>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold">Additional Information</h3>
                      <p><span className="text-muted-foreground">Gender:</span> {selectedCustomer.gender}</p>
                      <p><span className="text-muted-foreground">Member Since:</span> {
                        selectedCustomer.createdAt 
                          ? new Date(selectedCustomer.createdAt).toLocaleDateString()
                          : 'N/A'
                      }</p>
                    </div>
                  </div>
                </div>
              )}

              {!isEditing && (
                <div className="flex justify-center gap-2 mt-6">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm"
                      >
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the customer and all associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            if (!selectedCustomer) return;
                            deleteCustomerMutationHook.mutate(selectedCustomer.id, {
                              onSuccess: () => {
                                setShowCustomerDetails(false);
                                setSelectedCustomer(null);
                              }
                            });
                          }}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pet Details Dialog */}
      <Dialog open={showPetDetails} onOpenChange={setShowPetDetails}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Pet Details</DialogTitle>
            <DialogDescription>View and manage pet information</DialogDescription>
          </DialogHeader>
          {selectedPet && (
            <div className="space-y-6">
              <PetDetails 
                pet={selectedPet}
                formatDate={formatDate}
                onEdit={() => {
                  setShowEditModal(true);
                  setShowPetDetails(false);
                }}
                onDelete={() => {
                  setShowDeleteConfirm(true);
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Pet Dialog */}
      <Dialog open={showEditModal} onOpenChange={(open) => {
        setShowEditModal(open);
        if (!open) {
          setShowPetDetails(true);
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Pet</DialogTitle>
            <DialogDescription>Update the pet information below.</DialogDescription>
          </DialogHeader>
          {selectedPet && <PetForm
            handleSubmit={async (data) => {
              try {
                await updatePet({ 
                  petId: selectedPet.id, 
                  updateData: data 
                });
                await queryClient.invalidateQueries({ queryKey: ['pets'] });
                setShowEditModal(false);
                setShowPetDetails(false);
                setSelectedPet(null);
                toast({
                  title: "Success",
                  description: "Pet updated successfully"
                });
                return true;
              } catch (error) {
                console.error('Error updating pet:', error);
                toast({
                  variant: "destructive",
                  title: "Error",
                  description: error instanceof Error ? error.message : "Failed to update pet"
                });
                return false;
              }
            }}
            onCancel={() => {
              setShowEditModal(false);
              setShowPetDetails(true);
            }}
            customers={customersData}
            defaultValues={selectedPet}
            customerId={selectedPet.customerId}
            hideCustomerField={true}
          />}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this pet?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the pet's record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (selectedPet) {
                try {
                  await deletePet(selectedPet.id);
                  await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ['pets'] }),
                    queryClient.invalidateQueries({ queryKey: ['customers'] })
                  ]);
                  await queryClient.refetchQueries({ queryKey: ['pets'] });
                  setShowDeleteConfirm(false);
                  setShowPetDetails(false);
                  setSelectedPet(null);
                  toast({
                    title: "Success",
                    description: "Pet deleted successfully"
                  });
                } catch (error) {
                  console.error('Error deleting pet:', error);
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: error instanceof Error ? error.message : "Failed to delete pet"
                  });
                }
              }
            }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}