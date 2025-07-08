import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useCallsStore } from '../store/calls';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export function CallStats() {
  const { calls } = useCallsStore();

  // Process data for charts
  const callsByType = calls.reduce(
    (acc, call) => {
      acc[call.call_type]++;
      return acc;
    },
    { inbound: 0, outbound: 0 }
  );

  const callsByDuration = calls.reduce(
    (acc, call) => {
      const duration = call.duration;
      if (duration < 60) acc['< 1min']++;
      else if (duration < 300) acc['1-5min']++;
      else if (duration < 900) acc['5-15min']++;
      else acc['> 15min']++;
      return acc;
    },
    { '< 1min': 0, '1-5min': 0, '5-15min': 0, '> 15min': 0 }
  );

  const typeChartData = {
    labels: ['Inbound', 'Outbound'],
    datasets: [
      {
        label: 'Calls by Type',
        data: [callsByType.inbound, callsByType.outbound],
        backgroundColor: ['rgba(34, 197, 94, 0.5)', 'rgba(59, 130, 246, 0.5)'],
        borderColor: ['rgb(34, 197, 94)', 'rgb(59, 130, 246)'],
        borderWidth: 1,
      },
    ],
  };

  const durationChartData = {
    labels: Object.keys(callsByDuration),
    datasets: [
      {
        label: 'Calls by Duration',
        data: Object.values(callsByDuration),
        backgroundColor: 'rgba(147, 51, 234, 0.5)',
        borderColor: 'rgb(147, 51, 234)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Calls by Type</h3>
        <Bar data={typeChartData} options={options} />
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Calls by Duration</h3>
        <Bar data={durationChartData} options={options} />
      </div>
    </div>
  );
}