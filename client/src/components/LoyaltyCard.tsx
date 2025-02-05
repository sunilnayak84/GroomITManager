import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Customer } from "@/lib/types";
import { Badge } from "./ui/badge";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface LoyaltyCardProps {
  customer: Customer;
}

interface LoyaltyConfig {
  tierThresholds: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
  };
  pointsPerSpend: number;
}

const tierColors = {
  bronze: "bg-orange-600",
  silver: "bg-gray-400",
  gold: "bg-yellow-400",
  platinum: "bg-purple-600"
};

export function LoyaltyCard({ customer }: LoyaltyCardProps) {
  const [config, setConfig] = useState<LoyaltyConfig>({
    tierThresholds: {
      bronze: 0,
      silver: 2000,
      gold: 5000,
      platinum: 7500
    },
    pointsPerSpend: 1
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configRef = doc(db, "settings", "loyalty");
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
          const data = configSnap.data() as LoyaltyConfig;
          setConfig(data);
        }
      } catch (error) {
        console.error("Error fetching loyalty config:", error);
      }
    };

    fetchConfig();
  }, []);

  const currentTier = customer.loyaltyTier;
  const nextTier = currentTier === "platinum" ? null : 
    currentTier === "gold" ? "platinum" :
    currentTier === "silver" ? "gold" : "silver";

  const progress = nextTier ? 
    ((customer.loyaltyPoints - config.tierThresholds[currentTier]) / 
    (config.tierThresholds[nextTier] - config.tierThresholds[currentTier])) * 100 : 100;

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
                <Progress value={Math.min(100, Math.max(0, progress))} className="h-2" />
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  <span>{config.tierThresholds[currentTier]}</span>
                  <span>{config.tierThresholds[nextTier]}</span>
                </div>
                <p className="text-sm mt-2">
                  {config.tierThresholds[nextTier] - customer.loyaltyPoints} points needed for {nextTier}
                </p>
              </>
            )}
            <div className="mt-4 text-sm text-muted-foreground">
              <p>Earn {config.pointsPerSpend} points per ₹1 spent</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}