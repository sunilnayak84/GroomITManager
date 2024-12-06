import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { useCustomers } from "../hooks/use-customers";
import { usePets } from "../hooks/use-pets";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { insertCustomerSchema, type InsertCustomer, type Customer } from "@db/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { DataTable } from "@/components/ui/data-table";
import { useToast } from "@/hooks/use-toast";
import PetForm from "@/components/PetForm";

export default function CustomersPage() {
  const [open, setOpen] = useState(false);
  const { data: customers, isLoading, addCustomer } = useCustomers();
  const { toast } = useToast();
  
  const form = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: undefined,
      gender: undefined,
      address: "",
    },
  });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showPetList, setShowPetList] = useState(false);
  const [showAddPet, setShowAddPet] = useState(false);
  const { data: pets } = usePets();

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
      cell: (row: Customer) => {
        const customerPets = pets?.filter(pet => pet.customerId === row.id) || [];
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-primary/10"
              onClick={() => {
                setSelectedCustomer(row);
                setShowPetList(true);
              }}
            >
              {customerPets.length}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedCustomer(row);
                setShowAddPet(true);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
    {
      header: "Actions",
      cell: (row: Customer) => (
        <Button variant="outline" size="sm">
          View Details
        </Button>
      ),
    },
  ];

  async function onSubmit(data: InsertCustomer) {
    try {
      await addCustomer({
        ...data,
        createdAt: new Date(),
        password: data.password || null,
        address: data.address || null
      });
      setOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Customer added successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add customer",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage your customers</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
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
                        <Input type="email" {...field} />
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

      <div className="relative h-48 rounded-xl overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1450778869180-41d0601e046e"
          alt="Professional Pet Care"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent flex items-center p-8">
          <div className="text-white">
            <h2 className="text-2xl font-bold mb-2">Customer Management</h2>
            <p>Keep track of all your valued customers</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            className="pl-9"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={customers || []}
        isLoading={isLoading}
      />

      {/* Pet List Dialog */}
      <Dialog open={showPetList} onOpenChange={setShowPetList}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pets for {selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {pets?.filter(pet => pet.customerId === selectedCustomer?.id).map(pet => (
              <div key={pet.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <img
                  src={pet.image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${pet.name}`}
                  alt={pet.name}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <div className="font-medium">{pet.name}</div>
                  <div className="text-sm text-muted-foreground capitalize">{pet.breed} · {pet.type}</div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Pet Dialog */}
      <Dialog open={showAddPet} onOpenChange={setShowAddPet}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Pet</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div>
              {/* We'll reuse the PetForm component but pre-fill the customer */}
              <PetForm
                onSuccess={() => {
                  setShowAddPet(false);
                  toast({
                    title: "Success",
                    description: "Pet added successfully",
                  });
                }}
                defaultValues={{ customerId: selectedCustomer.id }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
