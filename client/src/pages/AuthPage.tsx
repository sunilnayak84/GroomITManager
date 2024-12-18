import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useUser } from "../hooks/use-user";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PawPrint } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from "firebase/auth";

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { login } = useUser();
  const [isLogin, setIsLogin] = useState(true);
  const [resetEmail, setResetEmail] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
    },
  });

  async function handleLogin(data: LoginFormData) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      await login(data);
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
      window.location.reload();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to login";
      toast({
        variant: "destructive",
        title: "Login Error",
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegister(data: RegisterFormData) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      const idToken = await user.getIdToken();
      
      // Update user profile with name
      await updateProfile(user, {
        displayName: data.name
      });
      
      // Get user role from Firebase RBAC
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:3000/api/users/${user.uid}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ 
          role: 'staff',
          name: data.name,
          phone: data.phone,
          email: data.email
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast({
        title: "Success",
        description: "Account created successfully",
      });
      
      // Log in the user
      await login({ email: data.email, password: data.password });
      window.location.reload();
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to register";
      toast({
        variant: "destructive",
        title: "Registration Error",
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: "Success",
        description: "Password reset email sent",
      });
      setShowReset(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send reset email",
      });
    } finally {
      setIsSubmitting(false);
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

          {!showReset ? (
            <>
              {isLogin ? (
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your email" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your password" type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Logging in..." : "Login"}
                    </Button>
                  </form>
                </Form>
              ) : (
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your email" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter password" type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input placeholder="Confirm password" type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter phone number" type="tel" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Creating Account..." : "Register"}
                    </Button>
                  </form>
                </Form>
              )}

              <div className="mt-4 text-center space-y-2">
                <Button
                  variant="link"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    loginForm.reset();
                    registerForm.reset();
                  }}
                  className="text-sm"
                >
                  {isLogin ? "Need an account? Register" : "Already have an account? Login"}
                </Button>
                <Button
                  variant="link"
                  onClick={() => setShowReset(true)}
                  className="text-sm block mx-auto"
                >
                  Forgot Password?
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Reset Password</h2>
              <Input
                type="email"
                placeholder="Enter your email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
              <Button 
                onClick={handleResetPassword} 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </Button>
              <Button
                variant="link"
                onClick={() => setShowReset(false)}
                className="block mx-auto"
              >
                Back to Login
              </Button>
            </div>
          )}
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
