import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, DollarSign, Users, Scissors } from "lucide-react";
import DashboardStats from "../components/DashboardStats";
import { useQuery } from "@tanstack/react-query";

export default function HomePage() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    }
  });

  const cards = [
    {
      title: "Total Appointments",
      value: stats?.appointments || 0,
      icon: Calendar,
      description: "Appointments this month"
    },
    {
      title: "Total Customers",
      value: stats?.customers || 0,
      icon: Users,
      description: "Active customers"
    },
    {
      title: "Services Completed",
      value: stats?.completed || 0,
      icon: Scissors,
      description: "Completed this month"
    },
    {
      title: "Revenue",
      value: `₹${stats?.revenue || 0}`,
      icon: DollarSign,
      description: "Revenue this month"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to GroomIT management system</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <DashboardStats />

      <div className="relative h-[300px] rounded-xl overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1519415387722-a1c3bbef716c"
          alt="Grooming Salon"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary/20 flex items-center p-8">
          <div className="text-white max-w-lg">
            <h2 className="text-3xl font-bold mb-4">Professional Pet Grooming</h2>
            <p className="text-lg">Providing the best care for your pets with our experienced groomers.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
