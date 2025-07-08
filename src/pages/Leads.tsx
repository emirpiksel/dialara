import React, { useEffect, useState } from 'react';
import { useLeadsStore } from '../store/leads';
import { LeadForm } from '../components/LeadForm';
import { LeadDetailModal } from '../components/LeadDetailModal';
import { Database } from '../lib/database.types';
import {
  Phone,
  Mail,
  Search,
  Plus,
  Calendar,
  Trash2,
  Edit,
  Globe,
  Users,
} from 'lucide-react';

type Lead = Database['public']['Tables']['leads']['Row'];

export function Leads() {
  const {
    leads,
    loading,
    fetchLeads,
    selectedStatus,
    searchQuery,
    setStatus,
    setSearchQuery,
    createLead,
    updateLead,
    deleteLead,
  } = useLeadsStore();

  const [showForm, setShowForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    fetchLeads({ limit: 100 }); // Ensures all leads are fetched
  }, []);

  const handleEditLead = (lead: Lead) => {
    if (!lead || !lead.id) {
      console.error("❌ Attempted to edit a lead without an ID!");
      return;
    }
  
    setSelectedLead(lead);
    setShowForm(true);
    setShowDetailModal(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      await deleteLead(id);
      fetchLeads({ limit: 100 }); // Refetch to ensure UI updates properly
    }
  };

  // ✅ FIXED: Now properly updates instead of creating a new lead
  const handleCreateOrUpdateLead = async (data: Partial<Lead>) => {
    if (selectedLead && selectedLead.id) {
      console.log("Updating existing lead:", selectedLead.id);
      await updateLead(selectedLead.id, data);
    } else {
      console.log("Creating new lead");
      await createLead(data as Omit<Lead, 'id' | 'created_at' | 'updated_at'>);
    }
    setShowForm(false);
    fetchLeads({ limit: 100 });
  };

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
        return <Phone className="h-4 w-4 text-blue-500" />;
      case 'web':
        return <Globe className="h-4 w-4 text-green-500" />;
      case 'referral':
        return <Users className="h-4 w-4 text-purple-500" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
  };

  return (
    <div className="px-6 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <button
          onClick={() => {
            setSelectedLead(null);
            setShowForm(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Lead
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                id="search"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Lead
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Last Contact
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedLead(lead);
                      setShowDetailModal(true);
                    }}
                  >
                    <td className="px-6 py-4 flex items-center space-x-4">
                      <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-lg font-medium text-gray-600">
                          {lead.full_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{lead.full_name}</div>
                        <div className="text-sm text-gray-500 flex items-center space-x-2">
                          <Phone className="h-4 w-4" />
                          <span>{lead.phone_number}</span>
                          {lead.email && (
                            <>
                              <Mail className="h-4 w-4" />
                              <span>{lead.email}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 text-xs font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                        {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getSourceIcon(lead.source)}</td>
                    <td className="px-6 py-4">{formatDate(lead.last_contact_date)}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-blue-600 hover:text-blue-900 mr-3" onClick={(e) => { e.stopPropagation(); handleEditLead(lead); }}>
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900" onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && <LeadForm lead={selectedLead} onSubmit={handleCreateOrUpdateLead} onClose={() => setShowForm(false)} />}
      {showDetailModal && <LeadDetailModal lead={selectedLead} onClose={() => setShowDetailModal(false)} />}
    </div>
  );
}
