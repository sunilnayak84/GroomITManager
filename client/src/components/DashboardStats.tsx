import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';

export default function DashboardStats() {
  const { data: stats } = useQuery({
    queryKey: ["appointments-stats"],
    queryFn: async () => {
      const res = await fetch("/api/appointments/stats");
      if (!res.ok) throw new Error("Failed to fetch appointment stats");
      return res.json();
    }
  });

  const statCards = stats ? Object.entries(stats).map(([key, value]) => ({
    title: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
    value: typeof value === 'number' ? value.toLocaleString() : value
  })) : [];

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Appointments Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <div key={index} className="p-4 border rounded-lg bg-card">
              <h3 className="text-sm font-medium text-muted-foreground">{stat.title}</h3>
              <p className="text-2xl font-bold mt-2">{stat.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
