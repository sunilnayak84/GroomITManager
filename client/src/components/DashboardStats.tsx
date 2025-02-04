
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppointments } from '@/hooks/use-appointments';
import { useCustomers } from '@/hooks/use-customers';
import { useServices } from '@/hooks/use-services';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';
import { useInventory } from '@/hooks/use-inventory';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, parseISO } from 'date-fns';

export default function DashboardStats() {
  const { data: appointments = [] } = useAppointments();
  const { customers } = useCustomers();
  const { services } = useServices();
  const { inventory } = useInventory();

  // Calculate total appointments this month
  const totalAppointments = useMemo(() => {
    const currentMonth = new Date().getMonth();
    return appointments.filter(apt => 
      new Date(apt.date).getMonth() === currentMonth
    ).length;
  }, [appointments]);

  // Calculate total active customers
  const totalCustomers = customers.length;

  // Calculate completed services this month
  const completedServices = useMemo(() => {
    const currentMonth = new Date().getMonth();
    return appointments.filter(apt => 
      apt.status === 'completed' && 
      new Date(apt.date).getMonth() === currentMonth
    ).length;
  }, [appointments]);

  // Calculate total revenue this month
  const totalRevenue = useMemo(() => {
    const currentMonth = new Date().getMonth();
    return appointments
      .filter(apt => 
        apt.status === 'completed' && 
        new Date(apt.date).getMonth() === currentMonth
      )
      .reduce((sum, apt) => sum + (apt.totalPrice || 0), 0);
  }, [appointments]);

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
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAppointments}</div>
            <p className="text-xs text-muted-foreground">Appointments this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Active customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Services Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedServices}</div>
            <p className="text-xs text-muted-foreground">Completed this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalRevenue}</div>
            <p className="text-xs text-muted-foreground">Revenue this month</p>
          </CardContent>
        </Card>
      </div>

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

        <Card>
          <CardHeader>
            <CardTitle>Popular Inventory Items</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventory?.sort((a, b) => 
                (b.quantity_per_use || 0) * (b.cost_per_unit || 0) - 
                (a.quantity_per_use || 0) * (a.cost_per_unit || 0)
              ).slice(0, 5).map(item => ({
                name: item.name,
                value: (item.quantity_per_use || 0) * (item.cost_per_unit || 0),
                stock: item.quantity
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" name="Usage Value" />
                <Bar dataKey="stock" fill="#82ca9d" name="Current Stock" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {inventory?.filter(item => 
              item.quantity <= item.minimum_quantity || 
              (item.reorder_point > 0 && item.quantity <= item.reorder_point)
            ).map(item => (
              <div 
                key={item.item_id} 
                className={`p-3 rounded-lg ${
                  item.quantity <= item.minimum_quantity 
                    ? 'bg-destructive/10 text-destructive' 
                    : 'bg-orange-100 text-orange-700'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm">
                      Current stock: {item.quantity} {item.unit}
                      {item.quantity <= item.minimum_quantity 
                        ? ` (Below minimum of ${item.minimum_quantity})`
                        : ` (Below reorder point of ${item.reorder_point})`
                      }
                    </p>
                  </div>
                  <div className="text-sm font-medium">
                    Reorder: {item.reorder_quantity} {item.unit}
                  </div>
                </div>
              </div>
            ))}
            {inventory?.filter(item => 
              item.quantity <= item.minimum_quantity || 
              (item.reorder_point > 0 && item.quantity <= item.reorder_point)
            ).length === 0 && (
              <p className="text-sm text-muted-foreground">No inventory alerts at this time</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
