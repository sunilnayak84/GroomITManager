import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Simple placeholder component until analytics is implemented
export default function DashboardStats() {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Appointments Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground">
          Analytics will be implemented soon
        </div>
      </CardContent>
    </Card>
  );
}
