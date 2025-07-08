import React, { useState, useEffect } from 'react';
import { CallFilters } from '../components/CallFilters';
import { CallDetailModal } from '../components/CallDetailModal';
import { Pagination } from '../components/Pagination';
import { ExportButton } from '../components/ExportButton';
import { useCallsStore } from '../store/calls';
import { Phone, Globe, Clock } from 'lucide-react';
import { Database } from '../lib/database.types';

const sentimentEmojiMap: Record<string, string> = {
  positive: '😊',
  neutral: '😐',
  negative: '😟'
};

type CallLog = Database['public']['Tables']['call_logs']['Row'];

function Calls() {
  const { calls, loading, fetchCalls } = useCallsStore();
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);

  useEffect(() => {
    console.log('Calls component mounted, fetching calls...');
    fetchCalls();
  }, [fetchCalls]);

  const getCallTypeInfo = (type: string) => {
    switch (type) {
      case 'inbound':
        return {
          label: 'Incoming',
          icon: <Phone className="h-5 w-5" />,
          className: 'bg-green-100 text-green-800'
        };
      case 'outbound':
        return {
          label: 'Outgoing',
          icon: <Phone className="h-5 w-5" />,
          className: 'bg-blue-100 text-blue-800'
        };
      case 'webCall':
        return {
          label: 'Web Call',
          icon: <Globe className="h-5 w-5" />,
          className: 'bg-purple-100 text-purple-800'
        };
      default:
        return {
          label: 'Unknown',
          icon: <Phone className="h-5 w-5" />,
          className: 'bg-gray-100 text-gray-800'
        };
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Recent Calls</h1>
        <ExportButton />
      </div>

      <CallFilters />

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AI
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No calls found
                  </td>
                </tr>
              ) : (
                calls.map((call) => {
                  const callTypeInfo = getCallTypeInfo(call.call_type);
                  const emoji = call.sentiment ? sentimentEmojiMap[call.sentiment] : '';
                  const scoreDisplay = call.score !== null && call.score !== undefined ? `(${call.score}/10)` : '';

                  return (
                    <tr
                      key={call.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedCall(call)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-full ${
                            call.call_type === 'inbound'
                              ? 'bg-green-100 text-green-600'
                              : call.call_type === 'webCall'
                              ? 'bg-purple-100 text-purple-600'
                              : 'bg-blue-100 text-blue-600'
                          }`}>
                            {callTypeInfo.icon}
                          </div>
                          <span className="ml-3 text-sm font-medium text-gray-900">
                            {call.caller_number}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${callTypeInfo.className}`}>
                          {callTypeInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="h-4 w-4 mr-1" />
                          {Math.floor(call.duration / 60)}m {call.duration % 60}s
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {emoji} {scoreDisplay}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(call.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination />
      </div>

      <CallDetailModal
        call={selectedCall}
        onClose={() => setSelectedCall(null)}
      />
    </div>
  );
}

export { Calls };
