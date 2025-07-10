import React from 'react';
import { Save } from 'lucide-react';
import { HubSpotIntegration } from '../components/HubSpotIntegration';
import { CalendarIntegration } from '../components/CalendarIntegration';
import { KnowledgeBase } from '../components/KnowledgeBase';
import { LiveCallControl } from '../components/LiveCallControl';
import { HumanTransfer } from '../components/HumanTransfer';

export function Settings() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>

      <div className="space-y-6">
        {/* Clinic Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Clinic Information
            </h2>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label
                  htmlFor="clinicName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Clinic Name
                </label>
                <input
                  type="text"
                  name="clinicName"
                  id="clinicName"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="businessHours"
                  className="block text-sm font-medium text-gray-700"
                >
                  Business Hours
                </label>
                <input
                  type="text"
                  name="businessHours"
                  id="businessHours"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="e.g., Mon-Fri 9AM-5PM"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Notification Settings
            </h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="emailNotifications"
                  name="emailNotifications"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="emailNotifications"
                  className="ml-3 block text-sm font-medium text-gray-700"
                >
                  Email Notifications
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="smsNotifications"
                  name="smsNotifications"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="smsNotifications"
                  className="ml-3 block text-sm font-medium text-gray-700"
                >
                  SMS Notifications
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* HubSpot CRM Integration */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <HubSpotIntegration />
          </div>
        </div>

        {/* Google Calendar Integration */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <CalendarIntegration />
          </div>
        </div>

        {/* AI Knowledge Base */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <KnowledgeBase />
          </div>
        </div>

        {/* Live Call Control Panel */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <LiveCallControl />
          </div>
        </div>

        {/* Human Agent Transfer */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <HumanTransfer />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}