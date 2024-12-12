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
      discount_percentage: 0,
      consumables: [],
      selectedServices: [],
      selectedAddons: []
    },
  });

  const onSubmit = async (data: InsertService) => {
    try {
      // Validate numeric fields and ensure they are not NaN
      const duration = Number(data.duration);
      const price = Number(data.price);
      const discount_percentage = Number(data.discount_percentage || 0);
      
      if (isNaN(duration) || isNaN(price) || isNaN(discount_percentage)) {
        toast({
          title: "Validation Error",
          description: "Please ensure all numeric fields have valid values",
          variant: "destructive",
        });
        return;
      }

      // Format consumables data with validated numeric values
      // Format and validate consumables data
      const formattedConsumables = data.consumables?.map(consumable => {
        // Validate required fields first
        if (!consumable?.inventory_item_id || !consumable?.name) {
          console.warn('Skipping consumable with missing required fields:', consumable);
          return null;
        }

        // Parse numeric values with fallbacks to 0
        const quantity = parseFloat(consumable.quantity_per_service?.toString() || '0');
        const currentStock = parseFloat(consumable.current_stock?.toString() || '0');
        const minQuantity = parseFloat(consumable.minimum_quantity?.toString() || '0');
        const costPerUnit = parseFloat(consumable.cost_per_unit?.toString() || '0');
        const reorderPoint = parseFloat(consumable.reorder_point?.toString() || '0');

        // Validate numeric values
        if (isNaN(quantity) || quantity < 0) {
          console.warn('Invalid quantity for consumable:', consumable.name);
          return null;
        }

        // Return validated consumable object
        return {
          inventory_item_id: consumable.inventory_item_id,
          name: consumable.name,
          quantity_per_service: quantity,
          unit: consumable.unit || 'unit',
          current_stock: Math.max(0, currentStock),
          track_inventory: Boolean(consumable.track_inventory),
          auto_deduct: Boolean(consumable.auto_deduct),
          minimum_quantity: Math.max(0, minQuantity),
          category: consumable.category || 'uncategorized',
          notes: consumable.notes || '',
          cost_per_unit: Math.max(0, costPerUnit),
          last_stock_check: new Date().toISOString(),
          reorder_point: Math.max(0, reorderPoint),
          service_linked: true
        };
      }).filter(Boolean) || [];

      const formattedData = {
        name: data.name.trim(),
        description: data.description?.trim() || '',
        category: data.category,
        duration: duration,
        price: price,
        discount_percentage: discount_percentage,
        consumables: formattedConsumables,
        isActive: true,
        selectedServices: [],
        selectedAddons: []
      };

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

        // Calculate total duration and original price
        const totalDuration = selectedItems.reduce((sum, item) => sum + (item?.duration || 0), 0);
        const totalPrice = selectedItems.reduce((sum, item) => sum + (item?.price || 0), 0);
        
        // Validate that a price is provided
        if (!price || price <= 0) {
          toast({
            title: "Validation Error",
            description: "Please enter a valid price for the package",
            variant: "destructive",
          });
          return;
        }

        // Create package data with all required fields
        const packageData: InsertService = {
          ...formattedData,
          duration: totalDuration,
          selectedServices: selectedServices.map(service => ({
            service_id: service.service_id || '',
            name: service.name || '',
            duration: service.duration || 0,
            price: service.price || 0,
            category: service.category || ServiceCategory.SERVICE
          })),
          selectedAddons: selectedAddons.map(addon => ({
            service_id: addon.service_id || '',
            name: addon.name || '',
            duration: addon.duration || 0,
            price: addon.price || 0,
            category: addon.category || ServiceCategory.ADDON
          }))
        };

        try {
          if (selectedService) {
            await updateService(selectedService.service_id, packageData);
            toast({
              title: "Success",
              description: `Package "${data.name}" updated successfully`,
            });
          } else {
            await addService(packageData);
            toast({
              title: "Success",
              description: `Package "${data.name}" created successfully with ${selectedItems.length} items`,
            });
          }
          setShowPackageDialog(false);
        } catch (error) {
          console.error('Error saving package:', error);
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to save package",
            variant: "destructive",
          });
        }
      } else {
        // For regular services and add-ons
        try {
          if (selectedService) {
            await updateService(selectedService.service_id, formattedData);
            toast({
              title: "Success",
              description: `Service "${formattedData.name}" updated successfully`,
            });
          } else {
            await addService(formattedData);
            toast({
              title: "Success",
              description: `Service "${formattedData.name}" added successfully`,
            });
          }
        } catch (error) {
          console.error('Error processing service:', error);
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to process service",
            variant: "destructive",
          });
        }
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
      discount_percentage: service.discount_percentage || 0,
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
            if (!service.service_id) return;
            await updateService(service.service_id, { ...service, isActive: checked });
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
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? 0 : Number(value));
                        }}
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
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? 0 : Number(value));
                        }}
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
            <DialogTitle>{selectedService ? "Edit Service Package" : "Create Service Package"}</DialogTitle>
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
                            onClick={() => {
                              const currentServices = form.getValues("selectedServices") || [];
                              const currentAddons = form.getValues("selectedAddons") || [];
                              
                              if (currentServices.some(s => s.service_id === service.service_id)) {
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
                              
                              const updatedServices = [...currentServices, newService];
                              form.setValue("selectedServices", updatedServices);
                              
                              // Update totals
                              const totalDuration = [...updatedServices, ...currentAddons]
                                .reduce((sum, item) => sum + (item?.duration || 0), 0);
                              const totalPrice = [...updatedServices, ...currentAddons]
                                .reduce((sum, item) => sum + (item?.price || 0), 0);
                              
                              form.setValue("duration", totalDuration);
                              form.setValue("price", totalPrice);
                              
                              toast({
                                title: "Service Added",
                                description: `Added ${service.name} to the package`,
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
                            onClick={() => {
                              const currentServices = form.getValues("selectedServices") || [];
                              const currentAddons = form.getValues("selectedAddons") || [];
                              
                              if (currentAddons.some(a => a.service_id === addon.service_id)) {
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
                              
                              const updatedAddons = [...currentAddons, newAddon];
                              form.setValue("selectedAddons", updatedAddons);
                              
                              // Update totals
                              const totalDuration = [...currentServices, ...updatedAddons]
                                .reduce((sum, item) => sum + (item?.duration || 0), 0);
                              const totalPrice = [...currentServices, ...updatedAddons]
                                .reduce((sum, item) => sum + (item?.price || 0), 0);
                              
                              form.setValue("duration", totalDuration);
                              form.setValue("price", totalPrice);
                              
                              toast({
                                title: "Add-on Added",
                                description: `Added ${addon.name} to the package`,
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
                          className="text-destructive"
                          onClick={() => {
                            const currentServices = form.getValues("selectedServices") || [];
                            const currentAddons = form.getValues("selectedAddons") || [];
                            
                            const isService = item.category === ServiceCategory.SERVICE;
                            const updatedServices = isService
                              ? currentServices.filter(s => s.service_id !== item.service_id)
                              : currentServices;
                            const updatedAddons = !isService
                              ? currentAddons.filter(a => a.service_id !== item.service_id)
                              : currentAddons;
                            
                            form.setValue("selectedServices", updatedServices);
                            form.setValue("selectedAddons", updatedAddons);
                            
                            // Update totals
                            const totalDuration = [...updatedServices, ...updatedAddons]
                              .reduce((sum, item) => sum + (item?.duration || 0), 0);
                            const totalPrice = [...updatedServices, ...updatedAddons]
                              .reduce((sum, item) => sum + (item?.price || 0), 0);
                            
                            form.setValue("duration", totalDuration);
                            form.setValue("price", totalPrice);
                            
                            toast({
                              title: "Item Removed",
                              description: `Removed ${item.name} from the package`,
                            });
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <FormField
                control={form.control}
                name="discount_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Percentage</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        placeholder="Enter discount percentage"
                        {...field}
                        value={field.value ? (field.value * 100).toString() : "0"}
                        onChange={(e) => {
                          const inputValue = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          if (isNaN(inputValue)) return;
                          
                          // Store as decimal (e.g., 10% -> 0.10)
                          const decimalValue = Math.min(Math.max(inputValue / 100, 0), 1);
                          field.onChange(decimalValue);
                          
                          // Calculate and set package price based on discount
                          const selectedItems = [
                            ...(form.getValues("selectedServices") || []),
                            ...(form.getValues("selectedAddons") || [])
                          ];
                          const totalPrice = selectedItems.reduce((sum, item) => sum + (item?.price || 0), 0);
                          const discountedPrice = Math.round(totalPrice * (1 - decimalValue));
                          form.setValue("price", discountedPrice);
                        }}
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
                    <FormLabel>Final Price (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? 0 : Number(value));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPackageDialog(false);
                    form.reset();
                    setSelectedService(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {selectedService ? "Update Package" : "Create Package"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConsumablesModal
        open={showConsumablesModal}
        onOpenChange={setShowConsumablesModal}
        onSubmit={(consumables) => {
          form.setValue("consumables", consumables, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        }}
        initialConsumables={form.getValues("consumables")}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              service{selectedService?.category === ServiceCategory.PACKAGE ? " package" : ""} and remove it from our records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  if (selectedService?.service_id) {
                    await deleteService(selectedService.service_id);
                    toast({
                      title: "Success",
                      description: "Service deleted successfully",
                    });
                  }
                  setShowDeleteConfirm(false);
                } catch (error) {
                  console.error('Error deleting service:', error);
                  toast({
                    title: "Error",
                    description: error instanceof Error ? error.message : "Failed to delete service",
                    variant: "destructive",
                  });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}