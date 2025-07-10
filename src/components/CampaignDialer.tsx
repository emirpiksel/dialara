import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Phone, Users, TrendingUp, Clock, Settings, Upload, Download, Copy, Trash2, BarChart3 } from 'lucide-react';
import { useAuthStore } from '../store/auth';

interface Contact {
  phone_number: string;
  name: string;
  email?: string;
  custom_variables?: Record<string, any>;
}

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  agent_id: string;
  contacts: Contact[];
  settings: CampaignSettings;
  stats: CampaignStats;
  created_at: string;
  scheduled_start?: string;
  scheduled_end?: string;
}

interface CampaignSettings {
  max_concurrent_calls: number;
  retry_attempts: number;
  retry_delay_minutes: number;
  call_timeout_seconds: number;
  respect_do_not_call: boolean;
  compliance_mode: string;
  time_zone: string;
  calling_hours_start: string;
  calling_hours_end: string;
  exclude_weekends: boolean;
}

interface CampaignStats {
  total_contacts: number;
  calls_attempted: number;
  calls_connected: number;
  calls_completed: number;
  calls_failed: number;
  average_duration: number;
  conversion_rate: number;
}

interface CreateCampaignData {
  name: string;
  description: string;
  agent_id: string;
  script_template?: string;
  contacts: Contact[];
  max_concurrent_calls: number;
  retry_attempts: number;
  retry_delay_minutes: number;
  call_timeout_seconds: number;
  respect_do_not_call: boolean;
  compliance_mode: string;
  time_zone: string;
  calling_hours_start: string;
  calling_hours_end: string;
  exclude_weekends: boolean;
  scheduled_start?: string;
  scheduled_end?: string;
}

export const CampaignDialer: React.FC = () => {
  const { user } = useAuthStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showContactImport, setShowContactImport] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create campaign form state
  const [campaignForm, setCampaignForm] = useState<CreateCampaignData>({
    name: '',
    description: '',
    agent_id: '',
    script_template: '',
    contacts: [],
    max_concurrent_calls: 5,
    retry_attempts: 3,
    retry_delay_minutes: 30,
    call_timeout_seconds: 300,
    respect_do_not_call: true,
    compliance_mode: 'standard',
    time_zone: 'UTC',
    calling_hours_start: '09:00',
    calling_hours_end: '17:00',
    exclude_weekends: true
  });

  // Contact import state
  const [contactText, setContactText] = useState('');
  const [contactFile, setContactFile] = useState<File | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/campaigns?user_id=${user.id}`);
      const result = await response.json();

      if (result.success) {
        setCampaigns(result.campaigns);
      } else {
        setError('Failed to load campaigns');
      }
    } catch (err) {
      setError('Error loading campaigns');
      console.error('Error loading campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const campaignData = {
        ...campaignForm,
        user_id: user.id
      };

      const response = await fetch('/api/campaigns/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(campaignData)
      });

      const result = await response.json();

      if (result.success) {
        setShowCreateForm(false);
        resetForm();
        loadCampaigns();
      } else {
        setError(result.error || 'Failed to create campaign');
      }
    } catch (err) {
      setError('Error creating campaign');
      console.error('Error creating campaign:', err);
    } finally {
      setLoading(false);
    }
  };

  const startCampaign = async (campaignId: string) => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/campaigns/${campaignId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: user.id })
      });

      const result = await response.json();

      if (result.success) {
        loadCampaigns();
      } else {
        setError(result.error || 'Failed to start campaign');
      }
    } catch (err) {
      setError('Error starting campaign');
      console.error('Error starting campaign:', err);
    } finally {
      setLoading(false);
    }
  };

  const pauseCampaign = async (campaignId: string) => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/campaigns/${campaignId}/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: user.id })
      });

      const result = await response.json();

      if (result.success) {
        loadCampaigns();
      } else {
        setError(result.error || 'Failed to pause campaign');
      }
    } catch (err) {
      setError('Error pausing campaign');
      console.error('Error pausing campaign:', err);
    } finally {
      setLoading(false);
    }
  };

  const stopCampaign = async (campaignId: string) => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/campaigns/${campaignId}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: user.id })
      });

      const result = await response.json();

      if (result.success) {
        loadCampaigns();
      } else {
        setError(result.error || 'Failed to stop campaign');
      }
    } catch (err) {
      setError('Error stopping campaign');
      console.error('Error stopping campaign:', err);
    } finally {
      setLoading(false);
    }
  };

  const importContacts = () => {
    const contacts: Contact[] = [];
    
    if (contactFile) {
      // Handle CSV file import
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvText = e.target?.result as string;
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          if (values.length >= headers.length) {
            const contact: Contact = {
              phone_number: '',
              name: '',
              email: ''
            };
            
            headers.forEach((header, index) => {
              const value = values[index]?.trim() || '';
              if (header.includes('phone') || header.includes('number')) {
                contact.phone_number = value;
              } else if (header.includes('name')) {
                contact.name = value;
              } else if (header.includes('email')) {
                contact.email = value;
              }
            });
            
            if (contact.phone_number) {
              contacts.push(contact);
            }
          }
        }
        
        setCampaignForm(prev => ({ ...prev, contacts }));
        setShowContactImport(false);
        setContactFile(null);
      };
      reader.readAsText(contactFile);
    } else if (contactText) {
      // Handle manual text input
      const lines = contactText.split('\n');
      lines.forEach(line => {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 1 && parts[0]) {
          const contact: Contact = {
            phone_number: parts[0],
            name: parts[1] || '',
            email: parts[2] || ''
          };
          contacts.push(contact);
        }
      });
      
      setCampaignForm(prev => ({ ...prev, contacts }));
      setShowContactImport(false);
      setContactText('');
    }
  };

  const resetForm = () => {
    setCampaignForm({
      name: '',
      description: '',
      agent_id: '',
      script_template: '',
      contacts: [],
      max_concurrent_calls: 5,
      retry_attempts: 3,
      retry_delay_minutes: 30,
      call_timeout_seconds: 300,
      respect_do_not_call: true,
      compliance_mode: 'standard',
      time_zone: 'UTC',
      calling_hours_start: '09:00',
      calling_hours_end: '17:00',
      exclude_weekends: true
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'scheduled': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Dialer</h1>
          <p className="text-gray-600 mt-1">Launch and manage automated outbound call campaigns</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Phone className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Campaign List */}
      <div className="grid gap-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
            <p className="text-gray-500 mb-4">Create your first automated call campaign to get started</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Campaign
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(campaign.status)}`}>
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{campaign.description}</p>
                    
                    {/* Campaign Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" />
                        <div>
                          <p className="text-sm text-gray-500">Contacts</p>
                          <p className="font-semibold">{campaign.stats.total_contacts}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-green-500" />
                        <div>
                          <p className="text-sm text-gray-500">Connected</p>
                          <p className="font-semibold">{campaign.stats.calls_connected}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-purple-500" />
                        <div>
                          <p className="text-sm text-gray-500">Conversion</p>
                          <p className="font-semibold">{campaign.stats.conversion_rate}%</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-500" />
                        <div>
                          <p className="text-sm text-gray-500">Avg Duration</p>
                          <p className="font-semibold">{formatDuration(campaign.stats.average_duration)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {campaign.status === 'active' && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{campaign.stats.calls_attempted} / {campaign.stats.total_contacts}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${(campaign.stats.calls_attempted / campaign.stats.total_contacts) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Campaign Controls */}
                  <div className="flex gap-2 ml-4">
                    {campaign.status === 'draft' || campaign.status === 'scheduled' || campaign.status === 'paused' ? (
                      <button
                        onClick={() => startCampaign(campaign.id)}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                        disabled={loading}
                      >
                        <Play className="w-4 h-4" />
                        Start
                      </button>
                    ) : null}

                    {campaign.status === 'active' ? (
                      <>
                        <button
                          onClick={() => pauseCampaign(campaign.id)}
                          className="bg-yellow-600 text-white px-3 py-2 rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-1"
                          disabled={loading}
                        >
                          <Pause className="w-4 h-4" />
                          Pause
                        </button>
                        <button
                          onClick={() => stopCampaign(campaign.id)}
                          className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
                          disabled={loading}
                        >
                          <Square className="w-4 h-4" />
                          Stop
                        </button>
                      </>
                    ) : null}

                    <button
                      onClick={() => setSelectedCampaign(campaign)}
                      className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-1"
                    >
                      <BarChart3 className="w-4 h-4" />
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Create New Campaign</h2>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Campaign Name *
                      </label>
                      <input
                        type="text"
                        value={campaignForm.name}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Q4 Sales Outreach"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={campaignForm.description}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Brief description of the campaign"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        AI Agent ID *
                      </label>
                      <input
                        type="text"
                        value={campaignForm.agent_id}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, agent_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Vapi Assistant ID"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Script Template
                      </label>
                      <textarea
                        value={campaignForm.script_template}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, script_template: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={4}
                        placeholder="Custom script or talking points for the AI agent"
                      />
                    </div>
                  </div>
                </div>

                {/* Contacts */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold">Contacts ({campaignForm.contacts.length})</h3>
                    <button
                      onClick={() => setShowContactImport(true)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors flex items-center gap-1"
                    >
                      <Upload className="w-4 h-4" />
                      Import Contacts
                    </button>
                  </div>
                  
                  {campaignForm.contacts.length > 0 ? (
                    <div className="border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                      {campaignForm.contacts.slice(0, 5).map((contact, index) => (
                        <div key={index} className="flex justify-between items-center py-1">
                          <span className="text-sm">{contact.name || 'Unnamed'} - {contact.phone_number}</span>
                        </div>
                      ))}
                      {campaignForm.contacts.length > 5 && (
                        <p className="text-sm text-gray-500 mt-2">
                          ... and {campaignForm.contacts.length - 5} more contacts
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No contacts imported yet</p>
                      <button
                        onClick={() => setShowContactImport(true)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Import contacts to get started
                      </button>
                    </div>
                  )}
                </div>

                {/* Campaign Settings */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Campaign Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Concurrent Calls
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={campaignForm.max_concurrent_calls}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, max_concurrent_calls: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Retry Attempts
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={campaignForm.retry_attempts}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, retry_attempts: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Calling Hours Start
                      </label>
                      <input
                        type="time"
                        value={campaignForm.calling_hours_start}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, calling_hours_start: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Calling Hours End
                      </label>
                      <input
                        type="time"
                        value={campaignForm.calling_hours_end}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, calling_hours_end: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={campaignForm.respect_do_not_call}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, respect_do_not_call: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Respect Do Not Call List</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={campaignForm.exclude_weekends}
                        onChange={(e) => setCampaignForm(prev => ({ ...prev, exclude_weekends: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Exclude Weekends</span>
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t">
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createCampaign}
                    disabled={!campaignForm.name || !campaignForm.agent_id || campaignForm.contacts.length === 0 || loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating...' : 'Create Campaign'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Import Modal */}
      {showContactImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Import Contacts</h2>
                <button
                  onClick={() => setShowContactImport(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload CSV File
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setContactFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    CSV should include columns: phone, name, email
                  </p>
                </div>

                <div className="text-center text-gray-500">OR</div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paste Contact Data
                  </label>
                  <textarea
                    value={contactText}
                    onChange={(e) => setContactText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={6}
                    placeholder="Enter contacts, one per line:&#10;+1234567890, John Doe, john@example.com&#10;+0987654321, Jane Smith, jane@example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Format: phone, name, email (one per line)
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowContactImport(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={importContacts}
                    disabled={!contactFile && !contactText.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Import Contacts
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">{selectedCampaign.name} - Details</h2>
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{selectedCampaign.stats.total_contacts}</p>
                  <p className="text-sm text-gray-600">Total Contacts</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Phone className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{selectedCampaign.stats.calls_connected}</p>
                  <p className="text-sm text-gray-600">Connected</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{selectedCampaign.stats.conversion_rate}%</p>
                  <p className="text-sm text-gray-600">Conversion Rate</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{formatDuration(selectedCampaign.stats.average_duration)}</p>
                  <p className="text-sm text-gray-600">Avg Duration</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Campaign Settings</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedCampaign.status)}`}>
                        {selectedCampaign.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Concurrent Calls:</span>
                      <span>{selectedCampaign.settings.max_concurrent_calls}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Calling Hours:</span>
                      <span>{selectedCampaign.settings.calling_hours_start} - {selectedCampaign.settings.calling_hours_end}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Retry Attempts:</span>
                      <span>{selectedCampaign.settings.retry_attempts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">DNC Compliance:</span>
                      <span>{selectedCampaign.settings.respect_do_not_call ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Performance Metrics</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Calls Attempted:</span>
                      <span>{selectedCampaign.stats.calls_attempted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Calls Completed:</span>
                      <span>{selectedCampaign.stats.calls_completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Calls Failed:</span>
                      <span>{selectedCampaign.stats.calls_failed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Success Rate:</span>
                      <span>
                        {selectedCampaign.stats.calls_attempted > 0 
                          ? Math.round((selectedCampaign.stats.calls_completed / selectedCampaign.stats.calls_attempted) * 100)
                          : 0
                        }%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};