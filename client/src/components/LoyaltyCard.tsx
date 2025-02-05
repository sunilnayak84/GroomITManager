
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Customer } from "@/lib/types";
import { Badge } from "./ui/badge";

interface LoyaltyCardProps {
  customer: Customer;
}

const tierThresholds = {
  bronze: 0,
  silver: 100,
  gold: 500,
  platinum: 1000
};

const tierColors = {
  bronze: "bg-orange-600",
  silver: "bg-gray-400",
  gold: "bg-yellow-400",
  platinum: "bg-purple-600"
};

export function LoyaltyCard({ customer }: LoyaltyCardProps) {
  const currentTier = customer.loyaltyTier;
  const nextTier = currentTier === "platinum" ? null : 
    currentTier === "gold" ? "platinum" :
    currentTier === "silver" ? "gold" : "silver";
  
  const progress = nextTier ? 
    ((customer.loyaltyPoints - tierThresholds[currentTier]) / 
    (tierThresholds[nextTier] - tierThresholds[currentTier])) * 100 : 100;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Loyalty Status</CardTitle>
          <Badge className={`${tierColors[currentTier]} text-white`}>
            {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
          </Badge>
        </div>
        <CardDescription>
          {customer.firstName}'s loyalty program details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2 text-sm">
              <span>Current Points</span>
              <span className="font-medium">{customer.loyaltyPoints}</span>
            </div>
            {nextTier && (
              <>
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  <span>{tierThresholds[currentTier]}</span>
                  <span>{tierThresholds[nextTier]}</span>
                </div>
                <p className="text-sm mt-2">
                  {tierThresholds[nextTier] - customer.loyaltyPoints} points needed for {nextTier}
                </p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
