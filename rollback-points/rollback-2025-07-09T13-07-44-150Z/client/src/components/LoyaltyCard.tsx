import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Customer } from "@/lib/types";
import { Badge } from "./ui/badge";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Skeleton } from "./ui/skeleton";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const configRef = doc(db, "settings", "loyalty");
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
          const data = configSnap.data() as LoyaltyConfig;
          setConfig(data);
        }
      } catch (error) {
        console.error("Error fetching loyalty config:", error);
        setError("Failed to load loyalty program configuration");
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // Calculate total points from pointsHistory
  const totalPoints = customer.pointsHistory.reduce((total, record) => {
    return record.type === 'earned' ? total + record.points : total - record.points;
  }, 0);

  // Calculate tier based on total points
  const calculateTier = (points: number): "bronze" | "silver" | "gold" | "platinum" => {
    if (points >= config.tierThresholds.platinum) return "platinum";
    if (points >= config.tierThresholds.gold) return "gold";
    if (points >= config.tierThresholds.silver) return "silver";
    return "bronze";
  };

  const currentTier = calculateTier(totalPoints);
  const nextTier = currentTier === "platinum" ? null : 
    currentTier === "gold" ? "platinum" :
    currentTier === "silver" ? "gold" : "silver";

  const progress = nextTier ? 
    ((totalPoints - config.tierThresholds[currentTier]) / 
    (config.tierThresholds[nextTier] - config.tierThresholds[currentTier])) * 100 : 100;

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-6 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Loyalty Status</CardTitle>
          <CardDescription className="text-red-500">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Loyalty Status</CardTitle>
          <Badge className={`${tierColors[currentTier]} text-white inline-flex display-block`}>
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
              <span className="font-medium">{totalPoints}</span>
            </div>
            {nextTier && (
              <>
                <Progress value={Math.min(100, Math.max(0, progress))} className="h-2" />
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  <span>{config.tierThresholds[currentTier]}</span>
                  <span>{config.tierThresholds[nextTier]}</span>
                </div>
                <p className="text-sm mt-2">
                  {config.tierThresholds[nextTier] - totalPoints} points needed for {nextTier}
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