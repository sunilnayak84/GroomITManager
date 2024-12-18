import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { PawPrint } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  submit?: string;
}

export default function NewRegistrationPage() {
  const [_, setLocation] = useLocation();
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (formData.phone.length < 10) {
      newErrors.phone = 'Phone number must be at least 10 digits';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      await updateProfile(userCredential.user, {
        displayName: `${formData.firstName} ${formData.lastName}`
      });

      const idToken = await userCredential.user.getIdToken();
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone
        })
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to create user profile');
      }

      toast({
        title: "Success",
        description: "Account created successfully",
      });

      // Force token refresh to get new role claims
      await userCredential.user.getIdTokenResult(true);

      setLocation('/');
    } catch (error: any) {
      console.error('Registration error:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        setErrors({
          email: 'An account with this email already exists',
          submit: 'Registration failed: Email already in use'
        });
      } else if (error.code === 'auth/invalid-email') {
        setErrors({
          email: 'Please enter a valid email address',
          submit: 'Registration failed: Invalid email format'
        });
      } else if (error.code === 'auth/weak-password') {
        setErrors({
          password: 'Password should be at least 6 characters',
          submit: 'Registration failed: Password too weak'
        });
      } else {
        setErrors({
          submit: error.message || 'Failed to create account. Please try again.'
        });
      }

      toast({
        variant: "destructive",
        title: "Registration Error",
        description: error.message || 'Failed to create account',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8">
            <PawPrint className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">GroomIT</h1>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-6">Create your account</h2>
          </div>
        
          <form className="space-y-6" onSubmit={handleSubmit}>
            {errors.submit && (
              <div className="rounded-md bg-destructive/10 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-destructive">
                      {errors.submit}
                    </h3>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className={errors.firstName ? 'border-destructive' : ''}
                  placeholder="Your first name"
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive">{errors.firstName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className={errors.lastName ? 'border-destructive' : ''}
                  placeholder="Your last name"
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? 'border-destructive' : ''}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={handleChange}
                className={errors.phone ? 'border-destructive' : ''}
                placeholder="Your phone number"
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'border-destructive' : ''}
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => window.location.href = '/login'}
              className="text-sm"
            >
              Already have an account? Sign in
            </Button>
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
