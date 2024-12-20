
import React from 'react';
import { Card } from './ui/card';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement
);

export function AnalyticsDashboard() {
  const revenueData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Monthly Revenue',
      data: [12000, 19000, 15000, 25000, 22000, 30000],
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      borderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 1
    }]
  };

  const serviceData = {
    labels: ['Basic Grooming', 'Full Service', 'Nail Trim', 'Bath Only', 'De-matting'],
    datasets: [{
      label: 'Popular Services',
      data: [300, 250, 200, 150, 100],
      backgroundColor: [
        'rgba(255, 99, 132, 0.2)',
        'rgba(54, 162, 235, 0.2)',
        'rgba(255, 206, 86, 0.2)',
        'rgba(75, 192, 192, 0.2)',
        'rgba(153, 102, 255, 0.2)',
      ],
      borderColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
      ],
      borderWidth: 1
    }]
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Revenue Trends</h3>
        <Line data={revenueData} options={{
          responsive: true,
          plugins: {
            legend: {
              position: 'top' as const,
            }
          }
        }} />
      </Card>
      
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Popular Services</h3>
        <Bar data={serviceData} options={{
          responsive: true,
          plugins: {
            legend: {
              position: 'top' as const,
            }
          }
        }} />
      </Card>
    </div>
  );
}
