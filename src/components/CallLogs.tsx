import React, { useEffect } from 'react';
import { Phone, Globe, Clock } from 'lucide-react';
import { useCallsStore } from '../store/calls';
import { Database } from '../lib/database.types';

type CallLog = Database['public']['Tables']['call_logs']['Row'];

export function CallLogs() {
  const { calls, loading, fetchCalls } = useCallsStore();

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const getCallTypeStyles = (type: string) => {
    switch (type) {
      case 'inbound':
        return 'bg-green-100 text-green-600';
      case 'outbound':
        return 'bg-blue-100 text-blue-600';
      case 'webCall':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getCallTypeIcon = (type: string) => {
    switch (type) {
      case 'webCall':
        return <Globe className="w-5 h-5" />;
      default:
        return <Phone className="w-5 h-5" />;
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading calls...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Recent Calls</h2>
      {calls.length === 0 ? (
        <p className="text-gray-500">No recent calls</p>
      ) : (
        <div className="space-y-2">
          {calls.map((call) => (
            <div
              key={call.id}
              className="bg-white p-4 rounded-lg shadow flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-full ${getCallTypeStyles(call.call_type)}`}>
                  {getCallTypeIcon(call.call_type)}
                </div>
                <div>
                  <p className="font-medium">{call.caller_number}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(call.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{Math.floor(call.duration / 60)}m {call.duration % 60}s</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}