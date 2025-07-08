import React, { useEffect, useState } from 'react';
import { Phone, Calendar, AlertCircle } from 'lucide-react';
import { Database } from '../lib/database.types';
import { fetchAIAgents } from '../lib/supabase';  // ✅ Use our new function
import { useAuthStore } from '../store/auth';

type Agent = Database['public']['Tables']['ai_agents']['Row'];

export function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useAuthStore();  // Get the user ID from the auth store

  useEffect(() => {
    async function loadAgents() {
      try {
        setLoading(true);
        setError(null);

        console.log('Fetching AI agents for user_id:', userId);

        // Fetch AI agents for the logged-in user by user_id
        const allAgents = await fetchAIAgents(); // Fetch all AI agents

        // Filter agents based on user_id
        const filteredAgents = allAgents.filter(agent => agent.user_id === userId);

        console.log('Filtered AI agents:', filteredAgents);
        setAgents(filteredAgents);
      } catch (err) {
        console.error('Error fetching AI agents:', err);
        setError('Failed to load agents. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      loadAgents();
    }
  }, [userId]);  // Reload agents if user_id changes

  if (!userId) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
          <p className="mt-2 text-sm text-gray-600">
            View and manage your AI agents
          </p>
        </div>
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center py-4 text-amber-600">
              User ID not found. Please check your account settings.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
          <p className="mt-2 text-sm text-gray-600">
            View and manage your AI agents
          </p>
        </div>
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
          <p className="mt-2 text-sm text-gray-600">
            View and manage your AI agents
          </p>
        </div>
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-center text-red-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
          <p className="mt-2 text-sm text-gray-600">
            View and manage your AI agents
          </p>
        </div>
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No AI agents assigned to you yet.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
        <p className="mt-2 text-sm text-gray-600">
          View and manage your AI agents
        </p>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Phone className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        {agent.phone_number}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {agent.vapi_agent_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-500">
                        {new Date(agent.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
