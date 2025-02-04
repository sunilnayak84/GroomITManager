
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppointments } from '@/hooks/use-appointments';
import { useCustomers } from '@/hooks/use-customers';
import { useServices } from '@/hooks/use-services';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, parseISO } from 'date-fns';

export default function DashboardStats() {
  const { data: appointments = [] } = useAppointments();
  const { customers } = useCustomers();
  const { services } = useServices();

  // Prepare appointments data grouped by day
  const appointmentChartData = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayAppointments = appointments.filter(apt => 
        format(parseISO(apt.date), 'yyyy-MM-dd') === dayStr
      );

      return {
        date: format(day, 'MMM dd'),
        appointments: dayAppointments.length,
        revenue: dayAppointments.reduce((sum, apt) => sum + apt.totalPrice, 0)
      };
    });
  }, [appointments]);

  // Service popularity data
  const serviceStats = useMemo(() => {
    const stats = new Map();
    appointments.forEach(apt => {
      apt.services.forEach(serviceId => {
        const count = stats.get(serviceId) || 0;
        stats.set(serviceId, count + 1);
      });
    });

    return Array.from(stats.entries()).map(([serviceId, count]) => ({
      name: services?.find(s => s.id === serviceId)?.name || serviceId,
      count
    }));
  }, [appointments, services]);

  // Customer growth data
  const customerGrowth = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return format(date, 'MMM yyyy');
    }).reverse();

    return months.map(month => ({
      month,
      customers: customers.filter(c => 
        format(parseISO(c.createdAt), 'MMM yyyy') === month
      ).length
    }));
  }, [customers]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Appointments</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={appointmentChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="appointments" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={appointmentChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Popular Services</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Growth</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={customerGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="customers" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
