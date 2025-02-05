import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

const loyaltyConfigSchema = z.object({
  tierThresholds: z.object({
    bronze: z.number().default(0),
    silver: z.number().min(1, "Silver threshold must be greater than 0"),
    gold: z.number().min(1, "Gold threshold must be greater than 0"),
    platinum: z.number().min(1, "Platinum threshold must be greater than 0"),
  }),
  pointsPerSpend: z.number().min(0.01, "Points per spend must be greater than 0"),
});

type LoyaltyConfig = z.infer<typeof loyaltyConfigSchema>;

export default function LoyaltyProgramPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoyaltyConfig>({
    resolver: zodResolver(loyaltyConfigSchema),
    defaultValues: {
      tierThresholds: {
        bronze: 0,
        silver: 2000,
        gold: 5000,
        platinum: 7500,
      },
      pointsPerSpend: 1,
    },
  });

  useEffect(() => {
    const fetchLoyaltyConfig = async () => {
      try {
        const configRef = doc(db, "settings", "loyalty");
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
          const data = configSnap.data();
          const defaultValues = {
            tierThresholds: {
              bronze: 0,
              silver: data.tierThresholds?.silver ?? 2000,
              gold: data.tierThresholds?.gold ?? 5000,
              platinum: data.tierThresholds?.platinum ?? 7500,
            },
            pointsPerSpend: data.pointsPerSpend ?? 1,
          };
          
          if (!form.formState.isDirty) {
            form.reset(defaultValues);
          }
        }
      } catch (error) {
        console.error("Error fetching loyalty config:", error);
        toast({
          title: "Error",
          description: "Failed to fetch loyalty program settings",
          variant: "destructive",
        });
      }
    };

    fetchLoyaltyConfig();
  }, [toast]); // Remove form from dependencies

  const onSubmit = async (data: LoyaltyConfig) => {
    try {
      setIsLoading(true);
      const configRef = doc(db, "settings", "loyalty");
      await setDoc(configRef, data);
      toast({
        title: "Success",
        description: "Loyalty program settings updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update loyalty program settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Loyalty Program Settings</CardTitle>
          <CardDescription>
            Configure loyalty program tiers and points system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Tier Thresholds</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="tierThresholds.bronze"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bronze Tier (points)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            value={field.value}
                            disabled
                          />
                        </FormControl>
                        <FormDescription>
                          Starting tier (always 0)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tierThresholds.silver"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Silver Tier (points)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tierThresholds.gold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gold Tier (points)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tierThresholds.platinum"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platinum Tier (points)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="pointsPerSpend"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points per ₹1 spent</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      How many points customers earn per rupee spent
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}