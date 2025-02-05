import { useState } from "react";
import { useRewards } from "@/hooks/use-rewards";
import { useCustomers } from "@/hooks/use-customers";
import { useUser } from "@/hooks/use-user";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RewardCategory } from "@/lib/reward-types";

export default function MarketplacePage() {
  const { rewards, isLoading, redeemReward } = useRewards();
  const { customers } = useCustomers();
  const { user } = useUser();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Get current customer's data
  const currentCustomer = customers.find(c => c.id === user?.id);
  const currentPoints = currentCustomer?.pointsHistory.reduce(
    (total, record) => record.type === 'earned' ? total + record.points : total - record.points,
    0
  ) ?? 0;

  const handleRedeem = async (rewardId: string, pointsRequired: number) => {
    try {
      if (!currentCustomer) {
        toast({
          title: "Error",
          description: "Customer information not found",
          variant: "destructive",
        });
        return;
      }

      await redeemReward({
        reward_id: rewardId,
        customer_id: currentCustomer.id,
        points_spent: pointsRequired,
      });

      toast({
        title: "Success",
        description: "Reward redeemed successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to redeem reward",
        variant: "destructive",
      });
    }
  };

  const filteredRewards = rewards.filter(reward => 
    selectedCategory === "all" || reward.category === selectedCategory
  );

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Rewards Marketplace</h1>
          <p className="text-muted-foreground">
            Redeem your loyalty points for exclusive rewards
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Available Points</p>
          <p className="text-2xl font-bold">{currentPoints}</p>
        </div>
      </div>

      <Tabs defaultValue="all" className="mb-6">
        <TabsList>
          <TabsTrigger value="all" onClick={() => setSelectedCategory("all")}>
            All Rewards
          </TabsTrigger>
          {Object.values(RewardCategory).map(category => (
            <TabsTrigger
              key={category}
              value={category}
              onClick={() => setSelectedCategory(category)}
            >
              {category}s
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-muted rounded-t-lg" />
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredRewards.map(reward => (
            <Card key={reward.reward_id}>
              {reward.image_url && (
                <div className="aspect-video relative overflow-hidden rounded-t-lg">
                  <img
                    src={reward.image_url}
                    alt={reward.name}
                    className="object-cover w-full h-full"
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle>{reward.name}</CardTitle>
                  <Badge variant="secondary">
                    {reward.points_required} pts
                  </Badge>
                </div>
                <CardDescription>{reward.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {reward.terms_conditions && (
                  <p className="text-sm text-muted-foreground">
                    {reward.terms_conditions}
                  </p>
                )}
                {reward.quantity_available <= 5 && (
                  <p className="text-sm text-orange-600 mt-2">
                    Only {reward.quantity_available} left!
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      className="w-full"
                      disabled={
                        currentPoints < reward.points_required ||
                        reward.quantity_available === 0
                      }
                    >
                      {currentPoints < reward.points_required
                        ? "Insufficient Points"
                        : reward.quantity_available === 0
                        ? "Out of Stock"
                        : "Redeem Reward"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Redemption</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to redeem {reward.name} for{" "}
                        {reward.points_required} points?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRedeem(reward.reward_id, reward.points_required)}
                      >
                        Confirm Redemption
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
