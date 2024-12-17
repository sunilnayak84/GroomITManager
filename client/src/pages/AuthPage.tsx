import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "../hooks/use-user";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PawPrint } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

export default function AuthPage() {
  const { login } = useUser();
  const { toast } = useToast();
  const form = useForm<{ email: string; password: string }>({
    resolver: zodResolver(
      z.object({
        email: z.string().email("Invalid email format"),
        password: z.string().min(6, "Password must be at least 6 characters"),
      })
    ),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: { email: string; password: string }) {
    try {
      console.log('Attempting login...');
      form.clearErrors();
      await login(data);
      
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
      
      // Use window.location.reload() instead of changing href to properly handle SPA navigation
      window.location.reload();
      
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to login. Please try again.";
      
      // Set form error
      form.setError('email', {
        type: 'manual',
        message: errorMessage
      });
      
      toast({
        variant: "destructive",
        title: "Login Error",
        description: errorMessage,
        duration: 5000,
      });
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8">
            <PawPrint className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">GroomIT</h1>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>
          </Form>
        </div>
      </div>

      <div className="flex-1 hidden lg:block relative">
        <img
          src="https://images.unsplash.com/photo-1672931653595-1e2e9d4050ef"
          alt="Pet Grooming"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/20" />
      </div>
    </div>
  );
}
