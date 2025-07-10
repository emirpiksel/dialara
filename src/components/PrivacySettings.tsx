import React, { useState } from 'react';
import { Shield, Download, Trash2, AlertCircle, CheckCircle, FileText, Settings } from 'lucide-react';
import { ComplianceNotice } from './ComplianceNotice';

interface PrivacyPreferences {
  callRecording: boolean;
  dataRetention: '30' | '90' | '365' | 'indefinite';
  marketingConsent: boolean;
  analyticsConsent: boolean;
  dataSharing: boolean;
}

export function PrivacySettings() {
  const [preferences, setPreferences] = useState<PrivacyPreferences>({
    callRecording: true,
    dataRetention: '90',
    marketingConsent: false,
    analyticsConsent: true,
    dataSharing: false
  });
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'success' | 'error' | null>(null);

  const handlePreferenceChange = (key: keyof PrivacyPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const savePreferences = async () => {
    setIsUpdating(true);
    try {
      // Simulate API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      setUpdateStatus('success');
      setTimeout(() => setUpdateStatus(null), 3000);
    } catch (error) {
      setUpdateStatus('error');
      setTimeout(() => setUpdateStatus(null), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  const exportData = async () => {
    try {
      // This would typically call an API endpoint to generate data export
      const dataExport = {
        user_data: {
          export_date: new Date().toISOString(),
          includes: ['profile', 'call_logs', 'training_sessions', 'leads', 'preferences']
        },
        privacy_notice: 'This export contains all personal data held by Dialara in compliance with GDPR Article 20 (Right to Data Portability)'
      };
      
      const blob = new Blob([JSON.stringify(dataExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dialara-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const requestDataDeletion = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to request deletion of all your data? This action cannot be undone and will close your account.'
    );
    
    if (confirmed) {
      try {
        // This would call an API endpoint to initiate data deletion process
        alert('Data deletion request submitted. You will receive confirmation within 30 days as required by GDPR.');
      } catch (error) {
        alert('Failed to submit deletion request. Please contact support.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Privacy & Data Settings</h2>
        <p className="text-gray-600">
          Manage your privacy preferences and exercise your data protection rights.
        </p>
      </div>

      {/* Status Messages */}
      {updateStatus && (
        <div className={`p-4 rounded-lg ${
          updateStatus === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {updateStatus === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <span className={updateStatus === 'success' ? 'text-green-800' : 'text-red-800'}>
              {updateStatus === 'success' 
                ? 'Privacy preferences updated successfully'
                : 'Failed to update preferences'
              }
            </span>
          </div>
        </div>
      )}

      {/* Compliance Notice */}
      <ComplianceNotice compact />

      {/* Privacy Preferences */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Privacy Preferences</h3>
        </div>

        <div className="space-y-6">
          {/* Call Recording */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Call Recording</h4>
                <p className="text-sm text-gray-600">
                  Allow recording of calls for training and quality purposes
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.callRecording}
                  onChange={(e) => handlePreferenceChange('callRecording', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Data Retention */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Data Retention Period</h4>
            <p className="text-sm text-gray-600 mb-3">
              How long should we keep your call recordings and transcripts?
            </p>
            <select
              value={preferences.dataRetention}
              onChange={(e) => handlePreferenceChange('dataRetention', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="30">30 days</option>
              <option value="90">90 days (recommended)</option>
              <option value="365">1 year</option>
              <option value="indefinite">Keep indefinitely</option>
            </select>
          </div>

          {/* Marketing Consent */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Marketing Communications</h4>
                <p className="text-sm text-gray-600">
                  Receive product updates and marketing emails
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.marketingConsent}
                  onChange={(e) => handlePreferenceChange('marketingConsent', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Analytics Consent */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Analytics & Performance</h4>
                <p className="text-sm text-gray-600">
                  Help improve Dialara by sharing usage analytics
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.analyticsConsent}
                  onChange={(e) => handlePreferenceChange('analyticsConsent', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Data Sharing */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Data Sharing</h4>
                <p className="text-sm text-gray-600">
                  Share anonymized data for research and development
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.dataSharing}
                  onChange={(e) => handlePreferenceChange('dataSharing', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={savePreferences}
            disabled={isUpdating}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300"
          >
            {isUpdating ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>

      {/* Data Rights */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Your Data Rights</h3>
        </div>

        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Export Data */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Download className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium">Export Your Data</h4>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Download all your personal data in a portable format (GDPR Article 20)
              </p>
              <button
                onClick={exportData}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Request Data Export
              </button>
            </div>

            {/* Delete Data */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                <h4 className="font-medium">Delete Your Data</h4>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Request permanent deletion of all your personal data (GDPR Article 17)
              </p>
              <button
                onClick={requestDataDeletion}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Request Data Deletion
              </button>
            </div>
          </div>

          {/* Additional Rights */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <h4 className="font-medium">Additional Rights</h4>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• <strong>Right to Rectification:</strong> Request correction of inaccurate data</p>
              <p>• <strong>Right to Restriction:</strong> Limit how we process your data</p>
              <p>• <strong>Right to Object:</strong> Object to processing for legitimate interests</p>
              <p>• <strong>Right to Withdraw Consent:</strong> Withdraw consent for specific processing</p>
            </div>
            <p className="text-sm text-gray-600 mt-3">
              To exercise these rights, contact us at{' '}
              <a href="mailto:privacy@dialara.com" className="text-blue-600 hover:text-blue-800">
                privacy@dialara.com
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Questions about Privacy?</h4>
        <p className="text-blue-800 text-sm">
          Contact our Data Protection Officer at{' '}
          <a href="mailto:dpo@dialara.com" className="underline">dpo@dialara.com</a>{' '}
          or visit our{' '}
          <a href="/privacy-policy" className="underline">Privacy Policy</a>{' '}
          for detailed information about how we handle your data.
        </p>
      </div>
    </div>
  );
}