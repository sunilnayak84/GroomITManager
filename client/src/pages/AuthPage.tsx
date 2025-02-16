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
      const userData = await login(data);
      
      if (!userData) {
        throw new Error('Login failed - no user data returned');
      }
      
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
      
      // Navigate after ensuring auth state is updated
      await new Promise(resolve => setTimeout(resolve, 1000));
      window.location.href = '/';
      
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to login. Please try again.",
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
          
          <div className="mt-4 text-center">
            <button 
              onClick={async () => {
                const email = form.getValues("email");
                if (!email) {
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Please enter your email address",
                  });
                  return;
                }
                
                try {
                  await auth.sendPasswordResetEmail(email);
                  toast({
                    title: "Success",
                    description: "Password reset email sent. Please check your inbox.",
                  });
                } catch (error: any) {
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: error.message || "Failed to send reset email",
                  });
                }
              }}
              className="text-sm text-primary hover:underline"
            >
              Forgot Password?
            </button>
          </div>
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
