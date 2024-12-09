import React, { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';

const LazyBarChart = React.lazy(() => import('recharts').then(mod => ({ default: mod.BarChart })));
const LazyBar = React.lazy(() => import('recharts').then(mod => ({ default: mod.Bar })));
const LazyXAxis = React.lazy(() => import('recharts').then(mod => ({ default: mod.XAxis })));
const LazyYAxis = React.lazy(() => import('recharts').then(mod => ({ default: mod.YAxis })));
const LazyCartesianGrid = React.lazy(() => import('recharts').then(mod => ({ default: mod.CartesianGrid })));
const LazyTooltip = React.lazy(() => import('recharts').then(mod => ({ default: mod.Tooltip })));
const LazyResponsiveContainer = React.lazy(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })));

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
          <Suspense fallback={<div>Loading chart...</div>}>
            <LazyResponsiveContainer width="100%" height="100%">
              <LazyBarChart data={chartData}>
                <LazyXAxis dataKey="name" stroke="#888888" />
                <LazyYAxis stroke="#888888" />
                <LazyCartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <LazyTooltip />
                <LazyBar
                  dataKey="total"
                  fill="currentColor"
                  radius={[4, 4, 0, 0]}
                  className="fill-primary"
                />
              </LazyBarChart>
            </LazyResponsiveContainer>
          </Suspense>
        </div>
      </CardContent>
    </Card>
  );
}
