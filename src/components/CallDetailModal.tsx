import React, { useEffect } from 'react';
import { X, Phone, Globe, Clock, Calendar, User, Volume2, BrainCircuit, Smile, StickyNote } from 'lucide-react';
import { Database } from '../lib/database.types';

type CallLog = Database['public']['Tables']['call_logs']['Row'] & {
  score?: number;
  sentiment?: string;
  summary?: string;
  transcript?: string;
};

interface CallDetailModalProps {
  call: CallLog | null;
  onClose: () => void;
}

export function CallDetailModal({ call, onClose }: CallDetailModalProps) {
  if (!call) return null;

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      dateStyle: 'long',
      timeStyle: 'medium',
    });
  };

  const getCallTypeInfo = (type: string) => {
    switch (type) {
      case 'inbound':
        return {
          label: 'Incoming Call',
          icon: <Phone className="w-5 h-5 text-green-500" />,
          className: 'text-green-600'
        };
      case 'outbound':
        return {
          label: 'Outgoing Call',
          icon: <Phone className="w-5 h-5 text-blue-500" />,
          className: 'text-blue-600'
        };
      case 'webCall':
        return {
          label: 'Web Call',
          icon: <Globe className="w-5 h-5 text-purple-500" />,
          className: 'text-purple-600'
        };
      default:
        return {
          label: 'Unknown',
          icon: <Phone className="w-5 h-5 text-gray-500" />,
          className: 'text-gray-600'
        };
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600';
      case 'neutral': return 'text-yellow-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const callTypeInfo = getCallTypeInfo(call.call_type);

  // Close modal when clicking outside the modal area
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleBackdropClick}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-semibold text-gray-900">Call Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DetailItem
              icon={callTypeInfo.icon}
              label="Call Type"
              value={callTypeInfo.label}
              className={callTypeInfo.className}
            />

            <DetailItem
              icon={<User className="w-5 h-5 text-purple-500" />}
              label="Phone Number"
              value={call.caller_number}
            />

            <DetailItem
              icon={<Clock className="w-5 h-5 text-orange-500" />}
              label="Duration"
              value={formatDuration(call.duration)}
            />

            <DetailItem
              icon={<Calendar className="w-5 h-5 text-indigo-500" />}
              label="Date & Time"
              value={formatDate(call.timestamp)}
            />

            {call.sentiment && (
              <DetailItem
                icon={<Smile className="w-5 h-5 text-pink-500" />}
                label="Sentiment"
                value={call.sentiment.charAt(0).toUpperCase() + call.sentiment.slice(1)}
                className={getSentimentColor(call.sentiment)}
              />
            )}

            {typeof call.score === 'number' && (
              <DetailItem
                icon={<BrainCircuit className="w-5 h-5 text-blue-500" />}
                label="AI Score"
                value={`${call.score} / 10`}
                className="text-blue-600"
              />
            )}
          </div>

          {call.summary && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center">
                <StickyNote className="w-5 h-5 text-amber-500 mr-2" />
                AI Summary
              </h3>
              <p className="text-gray-700 text-sm whitespace-pre-line border border-gray-200 bg-gray-50 rounded-md p-4">
                {call.summary}
              </p>
            </div>
          )}

          {call.transcript && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center">
                <StickyNote className="w-5 h-5 text-amber-500 mr-2" />
                AI Transcript
              </h3>
              <div className="text-gray-700 text-sm whitespace-pre-line border border-gray-200 bg-gray-50 rounded-md p-4 max-h-60 overflow-y-auto">
                {call.transcript}
              </div>
            </div>
          )}

          {call.recording_url && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Volume2 className="w-5 h-5 text-teal-500 mr-2" />
                Call Recording
              </h3>
              <audio
                controls
                className="w-full"
                src={call.recording_url}
              >
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-4 rounded-b-lg">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface DetailItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}

function DetailItem({ icon, label, value, className = '' }: DetailItemProps) {
  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 mt-1">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-base font-medium ${className || 'text-gray-900'}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
