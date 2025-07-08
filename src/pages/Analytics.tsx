import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useCallsStore } from '../store/calls';
import { useAuthStore } from '../store/auth';
import { AlertCircle } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export function Analytics() {
  const { calls, loading, error } = useCallsStore();  // Get calls from zustand store
  const { userId } = useAuthStore();  // Get userId from auth store

  const [filteredCalls, setFilteredCalls] = useState<any[]>([]);

  // Debugging logs for userId and calls
  console.log("User ID from Auth Store:", userId);
  console.log("All Calls in Store:", calls);

  useEffect(() => {
    if (userId && calls) {
      // Filter calls by user_id only when userId is available
      const callsForUser = calls.filter(call => call.user_id === userId);
      console.log("Filtered Calls: ", callsForUser); // Log filtered calls for debugging
      setFilteredCalls(callsForUser);
    }
  }, [userId, calls]);  // Dependency array to re-run when userId or calls change

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Analytics</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Analytics</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-center text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (filteredCalls.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Analytics</h1>
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                No Call Data Available
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>Analytics will be available once:</p>
                <ul className="list-disc list-inside mt-2">
                  <li>AI agents are assigned to your account</li>
                  <li>Your agents start handling calls</li>
                  <li>Call data is collected and processed</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State Placeholders */}
        <div className="grid grid-cols-1 gap-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Call Volume Trends
            </h2>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <p className="text-gray-500 text-sm">
                Call volume data will appear here
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Call Duration Distribution
            </h2>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <p className="text-gray-500 text-sm">
                Duration statistics will appear here
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Key Metrics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Average Call Duration</p>
                <p className="text-2xl font-semibold text-gray-400">--:--</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Peak Call Hours</p>
                <p className="text-2xl font-semibold text-gray-400">--:--</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Successful Transfers</p>
                <p className="text-2xl font-semibold text-gray-400">--%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Process real data for charts when available
  const processCallTrends = () => {
    const callsByDate = filteredCalls.reduce((acc, call) => {
      const date = new Date(call.timestamp).toLocaleDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sortedDates = Object.keys(callsByDate).sort();

    return {
      labels: sortedDates,
      datasets: [
        {
          label: 'Total Calls',
          data: sortedDates.map(date => callsByDate[date]),
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1,
        },
      ],
    };
  };

  const processCallDurations = () => {
    const durations = {
      '< 1min': 0,
      '1-5min': 0,
      '5-15min': 0,
      '> 15min': 0,
    };

    filteredCalls.forEach(call => {
      if (call.duration < 60) durations['< 1min']++;
      else if (call.duration < 300) durations['1-5min']++;
      else if (call.duration < 900) durations['5-15min']++;
      else durations['> 15min']++;
    });

    return {
      labels: Object.keys(durations),
      datasets: [
        {
          label: 'Call Duration Distribution',
          data: Object.values(durations),
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 206, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)',
          ],
        },
      ],
    };
  };

  const calculateMetrics = () => {
    const totalDuration = filteredCalls.reduce((sum, call) => sum + call.duration, 0);
    const avgDuration = Math.round(totalDuration / filteredCalls.length);
    const avgMinutes = Math.floor(avgDuration / 60);
    const avgSeconds = avgDuration % 60;

    const callHours = filteredCalls.map(call => new Date(call.timestamp).getHours());
    const hourCounts = callHours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    const peakHour = Object.entries(hourCounts).reduce((a, b) => 
      b[1] > a[1] ? b : a
    )[0];

    const successfulCalls = filteredCalls.filter(call => call.duration > 30).length;
    const successRate = Math.round((successfulCalls / filteredCalls.length) * 100);

    return {
      avgDuration: `${avgMinutes}m ${avgSeconds}s`,
      peakHours: `${peakHour}:00`,
      successRate: `${successRate}%`,
    };
  };

  const metrics = calculateMetrics();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Analytics</h1>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Call Volume Trends
          </h2>
          <Line
            data={processCallTrends()}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top' as const,
                },
              },
            }}
          />
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Call Duration Distribution
          </h2>
          <Bar
            data={processCallDurations()}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top' as const,
                },
              },
            }}
          />
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Key Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Average Call Duration</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics.avgDuration}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Peak Call Hours</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics.peakHours}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Successful Transfers</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics.successRate}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
