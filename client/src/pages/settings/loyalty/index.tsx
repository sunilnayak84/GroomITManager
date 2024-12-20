
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLoyalty } from "@/hooks/use-loyalty";
import { loyaltyConfigSchema, type LoyaltyConfig } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

export default function LoyaltySettingsPage() {
  const { config, updateConfig } = useLoyalty();
  const { toast } = useToast();

  const form = useForm<LoyaltyConfig>({
    resolver: zodResolver(loyaltyConfigSchema),
    defaultValues: config || {
      pointsPerRupee: 0.1,
      redemptionRatePerPoint: 0.25,
      minimumPointsForRedemption: 100,
      maximumRedemptionPercentage: 20,
      expiryDays: 365,
    },
  });

  async function onSubmit(data: LoyaltyConfig) {
    try {
      await updateConfig(data);
      toast({
        title: "Success",
        description: "Loyalty program settings updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loyalty Program Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="pointsPerRupee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Points Per Rupee</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="redemptionRatePerPoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rupees Per Point (Redemption)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="minimumPointsForRedemption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Points for Redemption</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maximumRedemptionPercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Bill Percentage for Redemption</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expiryDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Points Expiry (Days)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Save Settings</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLoyalty } from "@/hooks/use-loyalty";
import { loyaltyConfigSchema, type LoyaltyConfig } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

export default function LoyaltySettingsPage() {
  const { config, updateConfig } = useLoyalty();
  const { toast } = useToast();

  const form = useForm<LoyaltyConfig>({
    resolver: zodResolver(loyaltyConfigSchema),
    defaultValues: config || {
      pointsPerRupee: 0.1,
      redemptionRatePerPoint: 0.25,
      minimumPointsForRedemption: 100,
      maximumRedemptionPercentage: 20,
      expiryDays: 365,
    },
  });

  async function onSubmit(data: LoyaltyConfig) {
    try {
      await updateConfig(data);
      toast({
        title: "Success",
        description: "Loyalty program settings updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loyalty Program Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="pointsPerRupee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Points Per Rupee</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="redemptionRatePerPoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rupees Per Point (Redemption)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="minimumPointsForRedemption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Points for Redemption</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maximumRedemptionPercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Bill Percentage for Redemption</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expiryDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Points Expiry (Days)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Save Settings</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
