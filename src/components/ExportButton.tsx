import React from 'react';
import { Download } from 'lucide-react';
import { useCallsStore } from '../store/calls';

export function ExportButton() {
  const { calls } = useCallsStore();

  const exportToCsv = () => {
    const headers = [
      'Date & Time',
      'Type',
      'Phone Number',
      'Duration (seconds)',
      'Recording URL',
    ];

    const csvData = calls.map((call) => [
      new Date(call.timestamp).toLocaleString(),
      call.call_type,
      call.caller_number,
      call.duration,
      call.recording_url || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `call_logs_${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={exportToCsv}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      <Download className="w-4 h-4 mr-2" />
      Export to CSV
    </button>
  );
}