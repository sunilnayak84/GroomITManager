import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';

export default function DashboardStats() {
  const { data: chartData } = useQuery({
    queryKey: ["appointments-stats"],
    queryFn: async () => {
      const res = await fetch("/api/appointments/stats");
      if (!res.ok) throw new Error("Failed to fetch appointment stats");
      return res.json();
    }
  });

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Appointments Overview</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#888888" />
              <YAxis stroke="#888888" />
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <Tooltip />
              <Bar
                dataKey="total"
                fill="currentColor"
                radius={[4, 4, 0, 0]}
                className="fill-primary"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
