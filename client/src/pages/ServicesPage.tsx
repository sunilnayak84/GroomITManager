import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useServices } from "@/hooks/use-services";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceSchema, type InsertService } from "@db/schema";
import type { Service } from "@/hooks/use-services";
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
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import React, { useState } from "react";

export default function ServicesPage() {
  const { services, isLoading, addService, updateService, deleteService } = useServices();
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { toast } = useToast();

  const form = useForm<InsertService>({
    resolver: zodResolver(insertServiceSchema),
    defaultValues: {
      name: "",
      description: "",
      duration: 60,
      price: 0,
    },
  });

  // Populate form when service is selected for editing
  React.useEffect(() => {
    if (selectedService && isEditing) {
      form.reset({
        name: selectedService.name,
        description: selectedService.description,
        duration: selectedService.duration,
        price: selectedService.price,
      });
    }
  }, [selectedService, isEditing, form]);

  const handleSubmit = async (data: InsertService) => {
    try {
      if (isEditing && selectedService) {
        await updateService(selectedService.id, data);
      } else {
        await addService(data);
      }
      setShowServiceDialog(false);
      setSelectedService(null);
      setIsEditing(false);
      form.reset();
    } catch (error) {
      console.error('Error handling service:', error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price / 100);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const columns = [
    {
      header: "Service",
      cell: (service: Service) => (
        <div>
          <div className="font-medium">{service.name}</div>
          <div className="text-sm text-muted-foreground">{service.description}</div>
        </div>
      ),
    },
    {
      header: "Duration",
      cell: (service: Service) => formatDuration(service.duration),
    },
    {
      header: "Price",
      cell: (service: Service) => formatPrice(service.price),
    },
    {
      header: "Status",
      cell: (service: Service) => (
        <Switch
          checked={service.isActive}
          onCheckedChange={async (checked) => {
            await updateService(service.id, { isActive: checked });
          }}
        />
      ),
    },
    {
      header: "Actions",
      cell: (service: Service) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedService(service);
              setIsEditing(true);
              setShowServiceDialog(true);
            }}
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
      ),
    },
  ];

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Services</h2>
          <p className="text-muted-foreground">
            Manage your grooming services and packages
          </p>
        </div>
        <Button
          onClick={() => {
            setIsEditing(false);
            setSelectedService(null);
            form.reset();
            setShowServiceDialog(true);
          }}
        >
          Add Service
        </Button>
      </div>

      <div className="relative h-48 rounded-xl overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1516734212186-a967f81ad0d7"
          alt="Pet Grooming Services"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent flex items-center p-8">
          <div className="text-white">
            <h2 className="text-2xl font-bold mb-2">Service Management</h2>
            <p>Create and manage your grooming packages</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.header}>{column.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {services?.map((service) => (
              <TableRow key={service.id}>
                {columns.map((column) => (
                  <TableCell key={`${service.id}-${column.header}`}>
                    {column.cell(service)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={showServiceDialog}
        onOpenChange={(open) => {
          setShowServiceDialog(open);
          if (!open) {
            setSelectedService(null);
            setIsEditing(false);
            form.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Service' : 'Add Service'}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the service details below"
                : "Fill in the details to create a new service"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Service description"
                        className="resize-none"
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
                        min="1"
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
                    <FormLabel>Price (in cents)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                  onClick={() => setShowServiceDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {isEditing ? 'Update Service' : 'Add Service'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this service?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the service
              and remove it from all future appointments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (selectedService) {
                  await deleteService(selectedService.id);
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
