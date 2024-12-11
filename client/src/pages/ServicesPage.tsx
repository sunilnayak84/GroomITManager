import React, { useState } from "react";
import { Plus } from "lucide-react";
import { useServices } from "@/hooks/use-services";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConsumablesModal } from "@/components/ConsumablesModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceSchema, type InsertService, type Service, type ServiceConsumable, ServiceCategory } from "@/lib/service-types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ServicesPage() {
  const { services, isLoading, addService, updateService, deleteService } = useServices();
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showConsumablesModal, setShowConsumablesModal] = useState(false);

  const { toast } = useToast();

  const form = useForm<InsertService>({
    resolver: zodResolver(insertServiceSchema),
    defaultValues: {
      name: "",
      description: "",
      category: ServiceCategory.SERVICE,
      duration: 30,
      price: 0,
      consumables: [],
      selectedServices: [],
      selectedAddons: []
    },
  });

  const onSubmit = async (data: InsertService) => {
    try {
      if (data.category === ServiceCategory.PACKAGE) {
        const selectedServices = form.getValues("selectedServices") || [];
        const selectedAddons = form.getValues("selectedAddons") || [];
        const selectedItems = [...selectedServices, ...selectedAddons];

        if (selectedItems.length === 0) {
          toast({
            title: "Validation Error",
            description: "Please select at least one service or add-on for the package",
            variant: "destructive",
          });
          return;
        }

        // Calculate total duration and price with 10% discount
        const totalDuration = selectedItems.reduce((sum, item) => sum + item.duration, 0);
        const totalPrice = selectedItems.reduce((sum, item) => sum + item.price, 0);
        
        // Use manual price if provided, otherwise calculate automatic price with discount
        const manualPrice = data.price;
        const automaticPrice = Math.floor(totalPrice * 0.9); // 10% discount
        const finalPrice = manualPrice || automaticPrice;
        const savedAmount = totalPrice - finalPrice;

        // Create package data with all required fields
        const packageData: InsertService = {
          name: data.name,
          description: data.description || 
            `Package including ${data.selectedServices?.length || 0} services and ${data.selectedAddons?.length || 0} add-ons. ${manualPrice ? 'Custom priced package' : `Save ₹${savedAmount} (10% off)`}`,
          category: ServiceCategory.PACKAGE,
          duration: totalDuration,
          price: finalPrice,
          consumables: [], // Packages don't require consumables
          isActive: true,
          selectedServices: selectedServices.map(service => ({
            service_id: service.service_id,
            name: service.name,
            duration: service.duration,
            price: service.price,
            category: service.category
          })),
          selectedAddons: selectedAddons.map(addon => ({
            service_id: addon.service_id,
            name: addon.name,
            duration: addon.duration,
            price: addon.price,
            category: addon.category
          }))
        };

        // Validate package contents
        if (!data.name.trim()) {
          toast({
            title: "Validation Error",
            description: "Please provide a name for the package",
            variant: "destructive",
          });
          return;
        }

        try {
          await addService(packageData);
          toast({
            title: "Success",
            description: `Package "${data.name}" created successfully with ${selectedItems.length} items`,
            variant: "default",
          });
          setShowPackageDialog(false);
          
          // Reset form data
          form.reset({
            name: "",
            description: "",
            category: ServiceCategory.PACKAGE,
            duration: 30,
            price: 0,
            consumables: [],
            selectedServices: [],
            selectedAddons: []
          });
        } catch (error) {
          console.error('Error creating package:', error);
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to create package",
            variant: "destructive",
          });
        }
      } else if (selectedService) {
        await updateService(selectedService.service_id, data);
        setShowServiceDialog(false);
      } else {
        await addService(data);
        setShowServiceDialog(false);
      }
      
      form.reset();
      setSelectedService(null);
    } catch (error) {
      console.error('Error submitting service:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save service",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (service: Service) => {
    setSelectedService(service);
    const formData = {
      name: service.name,
      description: service.description,
      category: service.category,
      duration: service.duration,
      price: service.price,
      consumables: service.consumables || [],
      selectedServices: service.selectedServices || [],
      selectedAddons: service.selectedAddons || []
    };
    form.reset(formData);
    
    if (service.category === ServiceCategory.PACKAGE) {
      setShowPackageDialog(true);
      setShowServiceDialog(false);
    } else {
      setShowServiceDialog(true);
      setShowPackageDialog(false);
    }
  };

  const handleDelete = (service: Service) => {
    setSelectedService(service);
    setShowDeleteConfirm(true);
  };

  const columns = [
    {
      header: "Name",
      cell: (service: Service) => service.name,
    },
    {
      header: "Category",
      cell: (service: Service) => service.category,
    },
    {
      header: "Duration",
      cell: (service: Service) => `${service.duration} mins`,
    },
    {
      header: "Price",
      cell: (service: Service) => `₹${service.price}`,
    },
    {
      header: "Status",
      cell: (service: Service) => (
        <Switch
          checked={service.isActive}
          onCheckedChange={async (checked) => {
            await updateService(service.service_id, { isActive: checked });
          }}
        />
      ),
    },
    {
      header: "Actions",
      cell: (service: Service) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleEdit(service)}>
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(service)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="relative h-48 rounded-xl overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1516734212186-a967f81ad0d7"
          alt="Professional Pet Grooming Services"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent flex items-center p-8">
          <div className="text-white">
            <h2 className="text-2xl font-bold">Services Management</h2>
            <p>Manage your pet grooming services and treatments</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <Button onClick={() => {
            setSelectedService(null);
            form.reset({
              name: "",
              description: "",
              category: ServiceCategory.SERVICE,
              duration: 30,
              price: 0,
              consumables: [],
              selectedServices: [],
              selectedAddons: []
            });
            setShowServiceDialog(true);
          }} 
            className="h-12 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
            <Plus className="mr-2 h-5 w-5" />
            Add New Service
          </Button>
          <Button onClick={() => {
            setSelectedService(null);
            form.reset({
              name: "",
              description: "",
              category: ServiceCategory.PACKAGE,
              duration: 30,
              price: 0,
              consumables: [],
              selectedServices: [],
              selectedAddons: []
            });
            setShowPackageDialog(true);
          }}
            variant="outline"
            className="h-12 px-6">
            <Plus className="mr-2 h-5 w-5" />
            Create Package
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead key={index}>{column.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.service_id}>
                {columns.map((column, index) => (
                  <TableCell key={index}>{column.cell(service)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedService ? "Edit Service" : "Add New Service"}
            </DialogTitle>
            <DialogDescription>
              Enter the service details below
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Service name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ServiceCategory.SERVICE}>Service</SelectItem>
                        <SelectItem value={ServiceCategory.ADDON}>Addon</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Service description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="15"
                        step="15"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowConsumablesModal(true)}
                >
                  Manage Consumables
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowServiceDialog(false);
                      form.reset();
                      setSelectedService(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {selectedService ? "Update Service" : "Add Service"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Service Package</DialogTitle>
            <DialogDescription>
              Combine services and add-ons to create a package
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Package name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Package description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Available Services</h3>
                  <div className="border rounded-md p-4 space-y-2 max-h-60 overflow-y-auto">
                    {services
                      .filter(s => s.category === ServiceCategory.SERVICE && s.isActive)
                      .map(service => (
                        <div key={service.service_id} className="flex items-center justify-between">
                          <span>{service.name}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const currentServices = form.getValues("selectedServices") || [];
                              const isAlreadySelected = currentServices.some(s => s.service_id === service.service_id);
                              
                              if (isAlreadySelected) {
                                toast({
                                  title: "Already Selected",
                                  description: "This service is already in the package",
                                  variant: "destructive"
                                });
                                return;
                              }
                              
                              const newService = {
                                service_id: service.service_id,
                                name: service.name,
                                duration: service.duration,
                                price: service.price,
                                category: service.category
                              };
                              
                              await form.setValue("selectedServices", [...currentServices, newService], {
                                shouldValidate: true,
                                shouldDirty: true,
                                shouldTouch: true
                              });
                              
                              form.trigger();
                              
                              toast({
                                title: "Service Added",
                                description: `Added ${service.name} to the package`,
                                variant: "default"
                              });
                            }}
                          >
                            Add
                          </Button>
                        </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Available Add-ons</h3>
                  <div className="border rounded-md p-4 space-y-2 max-h-60 overflow-y-auto">
                    {services
                      .filter(s => s.category === ServiceCategory.ADDON && s.isActive)
                      .map(addon => (
                        <div key={addon.service_id} className="flex items-center justify-between">
                          <span>{addon.name}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const currentAddons = form.getValues("selectedAddons") || [];
                              const isAlreadySelected = currentAddons.some(a => a.service_id === addon.service_id);
                              
                              if (isAlreadySelected) {
                                toast({
                                  title: "Already Selected",
                                  description: "This add-on is already in the package",
                                  variant: "destructive"
                                });
                                return;
                              }
                              
                              const newAddon = {
                                service_id: addon.service_id,
                                name: addon.name,
                                duration: addon.duration,
                                price: addon.price,
                                category: addon.category
                              };
                              
                              await form.setValue("selectedAddons", [...currentAddons, newAddon], {
                                shouldValidate: true,
                                shouldDirty: true,
                                shouldTouch: true
                              });
                              
                              form.trigger();
                              
                              toast({
                                title: "Add-on Added",
                                description: `Added ${addon.name} to the package`,
                                variant: "default"
                              });
                            }}
                          >
                            Add
                          </Button>
                        </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Selected Items</h3>
                <div className="border rounded-md p-4 space-y-2">
                  {[
                    ...(form.getValues("selectedServices") || []),
                    ...(form.getValues("selectedAddons") || [])
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span>{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {item.duration}min | ₹{item.price}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (item.category === ServiceCategory.SERVICE) {
                              const services = form.getValues("selectedServices") || [];
                              form.setValue("selectedServices", 
                                services.filter(s => s.service_id !== item.service_id)
                              );
                            } else {
                              const addons = form.getValues("selectedAddons") || [];
                              form.setValue("selectedAddons", 
                                addons.filter(a => a.service_id !== item.service_id)
                              );
                            }
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="mt-4 pt-4 border-t space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Original Total:</span>
                      <span>
                        {(() => {
                          const selected = [
                            ...(form.getValues("selectedServices") || []),
                            ...(form.getValues("selectedAddons") || [])
                          ];
                          const totalPrice = selected.reduce((sum, item) => sum + item.price, 0);
                          return `₹${totalPrice}`;
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Total Duration:</span>
                      <span>
                        {(() => {
                          const selected = [
                            ...(form.getValues("selectedServices") || []),
                            ...(form.getValues("selectedAddons") || [])
                          ];
                          const totalDuration = selected.reduce((sum, item) => sum + item.duration, 0);
                          return `${totalDuration} minutes`;
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Final Price:</span>
                      <span>
                        {(() => {
                          const selected = [
                            ...(form.getValues("selectedServices") || []),
                            ...(form.getValues("selectedAddons") || [])
                          ];
                          const totalPrice = selected.reduce((sum, item) => sum + item.price, 0);
                          const manualPrice = form.getValues("price");
                          const automaticPrice = Math.floor(totalPrice * 0.9); // 10% discount
                          if (manualPrice) {
                            const savings = totalPrice - manualPrice;
                            return `₹${manualPrice} (Save ₹${savings > 0 ? savings : 0})`;
                          }
                          const savings = totalPrice - automaticPrice;
                          return `₹${automaticPrice} (Save ₹${savings})`;
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package Price (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Leave empty for automatic calculation"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value ? parseInt(e.target.value) : undefined;
                          field.onChange(value);
                          form.trigger();
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPackageDialog(false);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Create Package
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              service.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (selectedService) {
                  await deleteService(selectedService.service_id);
                  setShowDeleteConfirm(false);
                  setSelectedService(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConsumablesModal
        open={showConsumablesModal}
        onOpenChange={setShowConsumablesModal}
        initialConsumables={form.getValues("consumables")}
        onSave={(consumables) => {
          form.setValue("consumables", consumables);
          setShowConsumablesModal(false);
        }}
      />
    </div>
  );
}
