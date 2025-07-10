import React, { useState, useEffect } from 'react';
import { 
  ExternalLink, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Unlink, 
  Download,
  Upload,
  ArrowUpDown,
  Users,
  Calendar
} from 'lucide-react';
import { useAuthStore } from '../store/auth';

interface HubSpotStatus {
  connected: boolean;
  status: 'not_connected' | 'active' | 'expired' | 'error';
  portal_id?: string;
  scopes?: string;
  last_sync?: string;
  expires_at?: string;
  error?: string;
}

interface SyncResult {
  status: 'success' | 'error';
  imported_count?: number;
  total_contacts?: number;
  errors?: string[];
  error?: string;
}

export function HubSpotIntegration() {
  const { userId } = useAuthStore();
  const [hubspotStatus, setHubSpotStatus] = useState<HubSpotStatus>({
    connected: false,
    status: 'not_connected'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  useEffect(() => {
    if (userId) {
      checkHubSpotStatus();
    }
  }, [userId]);

  const checkHubSpotStatus = async () => {
    try {
      const response = await fetch(`/api/hubspot/status?user_id=${userId}`);
      const status = await response.json();
      setHubSpotStatus(status);
    } catch (error) {
      console.error('Error checking HubSpot status:', error);
      setHubSpotStatus({
        connected: false,
        status: 'error',
        error: 'Failed to check connection status'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const connectHubSpot = () => {
    // In production, this would redirect to HubSpot OAuth
    const hubspotAuthUrl = `https://app.hubspot.com/oauth/authorize?client_id=your_client_id&redirect_uri=${encodeURIComponent(window.location.origin + '/api/hubspot/callback')}&scope=contacts%20crm.objects.contacts.read%20crm.objects.contacts.write`;
    
    // For demo purposes, show connection dialog
    const confirmed = window.confirm(
      'This would redirect you to HubSpot to authorize the connection. ' +
      'In a production environment, you would be redirected to HubSpot OAuth. ' +
      'Click OK to simulate a successful connection.'
    );
    
    if (confirmed) {
      // Simulate successful connection
      setHubSpotStatus({
        connected: true,
        status: 'active',
        portal_id: 'demo-portal-123',
        scopes: 'contacts crm.objects.contacts.read crm.objects.contacts.write',
        last_sync: new Date().toISOString()
      });
    }
  };

  const disconnectHubSpot = async () => {
    const confirmed = window.confirm('Are you sure you want to disconnect HubSpot? This will stop syncing contacts and call data.');
    
    if (!confirmed) return;

    try {
      await fetch(`/api/hubspot/disconnect`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId })
      });

      setHubSpotStatus({
        connected: false,
        status: 'not_connected'
      });
      setSyncResult(null);
    } catch (error) {
      console.error('Error disconnecting HubSpot:', error);
    }
  };

  const syncContacts = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch('/api/hubspot/sync-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId })
      });

      const result = await response.json();
      setSyncResult(result);
    } catch (error) {
      setSyncResult({
        status: 'error',
        error: 'Failed to sync contacts'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'expired': return 'text-yellow-600 bg-yellow-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'expired': return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading HubSpot integration...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">HubSpot CRM Integration</h2>
        <p className="text-gray-600">
          Sync contacts between Dialara and HubSpot for seamless CRM workflow.
        </p>
      </div>

      {/* Connection Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <ExternalLink className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">HubSpot Connection</h3>
              <p className="text-sm text-gray-600">
                {hubspotStatus.connected ? 'Connected and syncing' : 'Not connected'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {getStatusIcon(hubspotStatus.status)}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(hubspotStatus.status)}`}>
              {hubspotStatus.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>

        {hubspotStatus.connected ? (
          <div className="space-y-4">
            {/* Connection Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Portal ID:</span>
                <span className="ml-2 text-gray-800">{hubspotStatus.portal_id}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Last Sync:</span>
                <span className="ml-2 text-gray-800">
                  {hubspotStatus.last_sync 
                    ? new Date(hubspotStatus.last_sync).toLocaleString()
                    : 'Never'
                  }
                </span>
              </div>
              {hubspotStatus.scopes && (
                <div className="col-span-2">
                  <span className="font-medium text-gray-600">Permissions:</span>
                  <span className="ml-2 text-gray-800">{hubspotStatus.scopes}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={syncContacts}
                disabled={isSyncing}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300"
              >
                {isSyncing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{isSyncing ? 'Syncing...' : 'Import Contacts'}</span>
              </button>

              <button
                onClick={checkHubSpotStatus}
                className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Status</span>
              </button>

              <button
                onClick={disconnectHubSpot}
                className="flex items-center space-x-2 bg-red-100 text-red-700 px-4 py-2 rounded-md hover:bg-red-200"
              >
                <Unlink className="w-4 h-4" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              Connect your HubSpot account to automatically sync contacts and call activities.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">What you'll get:</h4>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• Automatic contact import from HubSpot</li>
                <li>• Call summaries saved as HubSpot notes</li>
                <li>• Lead status synchronization</li>
                <li>• Two-way data sync for seamless workflow</li>
              </ul>
            </div>

            <button
              onClick={connectHubSpot}
              className="flex items-center space-x-2 bg-orange-600 text-white px-6 py-3 rounded-md hover:bg-orange-700"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Connect HubSpot</span>
            </button>
          </div>
        )}
      </div>

      {/* Sync Results */}
      {syncResult && (
        <div className={`p-4 rounded-lg ${
          syncResult.status === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start space-x-2">
            {syncResult.status === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              {syncResult.status === 'success' ? (
                <div>
                  <h4 className="font-medium text-green-800">Sync Successful!</h4>
                  <p className="text-green-700 text-sm mt-1">
                    Imported {syncResult.imported_count} contacts out of {syncResult.total_contacts} total.
                  </p>
                  {syncResult.errors && syncResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-green-700 text-sm font-medium">Some contacts had issues:</p>
                      <ul className="text-green-700 text-sm mt-1 list-disc list-inside">
                        {syncResult.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {syncResult.errors.length > 5 && (
                          <li>... and {syncResult.errors.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h4 className="font-medium text-red-800">Sync Failed</h4>
                  <p className="text-red-700 text-sm mt-1">
                    {syncResult.error || 'An error occurred during sync.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Features Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Integration Features</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Download className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium">Contact Import</h4>
                <p className="text-sm text-gray-600">
                  Import contacts from HubSpot into Dialara leads automatically
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Upload className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">Call Sync</h4>
                <p className="text-sm text-gray-600">
                  Call summaries and outcomes sync back to HubSpot as notes
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <ArrowUpDown className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium">Two-Way Sync</h4>
                <p className="text-sm text-gray-600">
                  Keep lead statuses synchronized between both platforms
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h4 className="font-medium">Deal Tracking</h4>
                <p className="text-sm text-gray-600">
                  View HubSpot deals and opportunities within Dialara
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      {!hubspotStatus.connected && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Setup Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Click "Connect HubSpot" above to start the OAuth flow</li>
            <li>Log in to your HubSpot account and authorize permissions</li>
            <li>Return to Dialara to complete the connection</li>
            <li>Import your contacts and start syncing call data</li>
          </ol>
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-yellow-800 text-sm">
              <strong>Note:</strong> You'll need admin access to your HubSpot account to set up this integration.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}