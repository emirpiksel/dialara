import React from 'react';
import { X, Phone, Mail, Calendar, Clock, FileText, Globe, Users } from 'lucide-react';
import { Database } from '../lib/database.types';

type Lead = Database['public']['Tables']['leads']['Row'];

interface LeadDetailModalProps {
  lead: Lead | null;
  onClose: () => void;
}

export function LeadDetailModal({ lead, onClose }: LeadDetailModalProps) {
  if (!lead) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800';
      case 'qualified':
        return 'bg-green-100 text-green-800';
      case 'converted':
        return 'bg-purple-100 text-purple-800';
      case 'lost':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'call':
        return <Phone className="w-5 h-5 text-blue-500" />;
      case 'web':
        return <Globe className="w-5 h-5 text-green-500" />;
      case 'referral':
        return <Users className="w-5 h-5 text-purple-500" />;
      default:
        return null;
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose} // Clicking outside modal closes it
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 relative"
        onClick={(e) => e.stopPropagation()} // Prevent modal close when clicking inside
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-semibold text-gray-900">Lead Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-medium text-gray-600">
                {lead.full_name.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-medium text-gray-900">{lead.full_name}</h3>
              <div className="mt-1 flex items-center space-x-4 text-gray-500">
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-1" />
                  {lead.phone_number}
                </div>
                {lead.email && (
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-1" />
                    {lead.email}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status & Source */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DetailItem
              icon={<Clock className="w-5 h-5 text-gray-400" />}
              label="Status"
              value={
                <span className={`px-2 py-1 inline-flex text-sm font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                  {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                </span>
              }
            />
            <DetailItem
              icon={getSourceIcon(lead.source)}
              label="Source"
              value={lead.source.charAt(0).toUpperCase() + lead.source.slice(1)}
            />
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DetailItem
              icon={<Calendar className="w-5 h-5 text-indigo-500" />}
              label="Created"
              value={new Date(lead.created_at).toLocaleString()}
            />
            <DetailItem
              icon={<Clock className="w-5 h-5 text-orange-500" />}
              label="Last Updated"
              value={new Date(lead.updated_at).toLocaleString()}
            />
          </div>

          {/* Last Contact */}
          {lead.last_contact_date && (
            <DetailItem
              icon={<Phone className="w-5 h-5 text-green-500" />}
              label="Last Contact"
              value={new Date(lead.last_contact_date).toLocaleString()}
            />
          )}

          {/* Notes */}
          {lead.notes && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                <FileText className="w-5 h-5 text-gray-400 mr-2" />
                Notes
              </h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
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
  value: React.ReactNode;
}

function DetailItem({ icon, label, value }: DetailItemProps) {
  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 mt-1">{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <div className="text-base font-medium text-gray-900">{value}</div>
      </div>
    </div>
  );
}
