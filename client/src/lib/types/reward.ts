import { z } from "zod";

export const rewardSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  pointsCost: z.number().min(0),
  category: z.enum(["service", "product", "discount"]),
  discountValue: z.number().optional(),
  discountType: z.enum(["percentage", "fixed"]).optional(),
  image: z.union([z.string(), z.instanceof(File), z.null()]),
  validUntil: z.string().nullable(),
  quantity: z.number().min(0).optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

export type Reward = z.infer<typeof rewardSchema>;

export const insertRewardSchema = rewardSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertReward = z.infer<typeof insertRewardSchema>;