import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useServices } from "@/hooks/use-services";
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
import { toast } from "@/components/ui/use-toast";

export default function ServicesPage() {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [selectedService, setSelectedService] = React.useState(null);
  const { services, addService, updateService, deleteService } = useServices();
  const [isEditing, setIsEditing] = React.useState(false);

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      category: "Service",
      duration: 30,
      price: 0,
      discount_percentage: 0,
      isActive: true,
      selectedServices: [],
      selectedAddons: [],
    }
  });

  const handleSubmit = async (data) => {
    try {
      const formattedData = {
        ...data,
        price: Number(data.price),
        duration: Number(data.duration),
        discount_percentage: Number(data.discount_percentage),
        updated_at: new Date().toISOString(),
      };

      if (isEditing && selectedService) {
        await updateService(selectedService.service_id, formattedData);
        toast({
          title: "Success",
          description: "Service updated successfully",
        });
      } else {
        await addService(formattedData);
        toast({
          title: "Success",
          description: "Service added successfully",
        });
      }

      resetForm();
    } catch (error) {
      console.error("Error submitting service:", error);
      toast({
        title: "Error",
        description: "Failed to save service",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    form.reset({
      name: "",
      description: "",
      category: "Service",
      duration: 30,
      price: 0,
      discount_percentage: 0,
      isActive: true,
      selectedServices: [],
      selectedAddons: [],
    });
    setIsEditing(false);
    setSelectedService(null);
  };

  const editService = (service) => {
    setSelectedService(service);
    setIsEditing(true);
    form.reset({
      name: service.name,
      description: service.description,
      category: service.category,
      duration: service.duration,
      price: service.price,
      discount_percentage: service.discount_percentage,
      isActive: service.isActive,
      selectedServices: service.selectedServices || [],
      selectedAddons: service.selectedAddons || [],
    });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Services</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">
            {isEditing ? "Edit Service" : "Add New Service"}
          </h2>
          
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input {...form.register("name")} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Textarea {...form.register("description")} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <Input {...form.register("category")} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
              <Input type="number" {...form.register("duration")} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Price</label>
              <Input type="number" step="0.01" {...form.register("price")} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Discount Percentage</label>
              <Input type="number" step="0.01" {...form.register("discount_percentage")} />
            </div>
            
            <div className="flex gap-2">
              <Button type="submit">
                {isEditing ? "Update Service" : "Add Service"}
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </div>

        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Service List</h2>
          <div className="space-y-4">
            {services?.map((service) => (
              <div
                key={service.service_id}
                className="p-4 border rounded-lg flex justify-between items-center"
              >
                <div>
                  <h3 className="font-medium">{service.name}</h3>
                  <p className="text-sm text-gray-600">{service.description}</p>
                  <p className="text-sm">
                    Duration: {service.duration} minutes | Price: ${service.price}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editService(service)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setSelectedService(service);
                      setShowDeleteConfirm(true);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
    </div>
  );
}