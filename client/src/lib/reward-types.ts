import { z } from "zod";

// Define reward categories
export const RewardCategory = {
  PRODUCT: 'Product',
  SERVICE: 'Service',
  DISCOUNT: 'Discount',
} as const;

// Base reward schema
export const rewardSchema = z.object({
  reward_id: z.string(),
  name: z.string().min(2, "Reward name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.enum([RewardCategory.PRODUCT, RewardCategory.SERVICE, RewardCategory.DISCOUNT]),
  points_required: z.number().min(1, "Points required must be at least 1"),
  quantity_available: z.number().min(0, "Quantity cannot be negative"),
  image_url: z.string().url().nullable(),
  is_active: z.boolean().default(true),
  expiry_date: z.string().nullable(),
  terms_conditions: z.string().nullable(),
  created_at: z.date().or(z.string()).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  updated_at: z.date().or(z.string()).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
});

// Schema for creating a new reward
export const insertRewardSchema = z.object({
  name: z.string().min(2, "Reward name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.enum([RewardCategory.PRODUCT, RewardCategory.SERVICE, RewardCategory.DISCOUNT]),
  points_required: z.number().min(1, "Points required must be at least 1"),
  quantity_available: z.number().min(0, "Quantity cannot be negative"),
  image_url: z.string().url().nullable(),
  is_active: z.boolean().default(true),
  expiry_date: z.string().nullable(),
  terms_conditions: z.string().nullable(),
});

// Schema for redeeming a reward
export const redeemRewardSchema = z.object({
  reward_id: z.string(),
  customer_id: z.string(),
  points_spent: z.number().min(1),
  redemption_date: z.date().default(() => new Date()),
  status: z.enum(['pending', 'completed', 'cancelled']).default('pending'),
  notes: z.string().nullable(),
});

// Export types
export type Reward = z.infer<typeof rewardSchema>;
export type InsertReward = z.infer<typeof insertRewardSchema>;
export type RewardRedemption = z.infer<typeof redeemRewardSchema>;
export type UpdateReward = Partial<InsertReward>;
