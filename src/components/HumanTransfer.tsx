import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Phone, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  User,
  MessageSquare,
  ArrowRight,
  Star,
  Shield
} from 'lucide-react';
import { useAuthStore } from '../store/auth';

interface HumanAgent {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  skills: string[];
  current_calls: number;
  max_calls: number;
  rating: number;
  status: string;
}

interface TransferRequest {
  call_id: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  target_agent_id?: string;
  special_instructions: string;
}

interface HumanTransferProps {
  callId?: string;
  onTransferInitiated?: (transferId: string) => void;
  onClose?: () => void;
}

export function HumanTransfer({ callId, onTransferInitiated, onClose }: HumanTransferProps) {
  const { userId } = useAuthStore();
  const [availableAgents, setAvailableAgents] = useState<HumanAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [transferReason, setTransferReason] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferResult, setTransferResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  // Load available agents on component mount
  useEffect(() => {
    loadAvailableAgents();
  }, []);

  const loadAvailableAgents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/human-transfer/agents');
      const data = await response.json();
      
      if (data.status === 'success') {
        setAvailableAgents(data.agents);
      } else {
        setError('Failed to load available agents');
      }
    } catch (error) {
      console.error('Error loading agents:', error);
      setError('Error loading available agents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!callId || !transferReason.trim()) {
      setError('Call ID and transfer reason are required');
      return;
    }

    try {
      setIsTransferring(true);
      setError('');

      const transferRequest: TransferRequest = {
        call_id: callId,
        reason: transferReason,
        priority: priority,
        special_instructions: specialInstructions
      };

      if (selectedAgent) {
        transferRequest.target_agent_id = selectedAgent;
      }

      const response = await fetch('/api/human-transfer/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...transferRequest,
          supervisor_id: userId
        })
      });

      const result = await response.json();

      if (result.success) {
        setTransferResult(result);
        if (onTransferInitiated) {
          onTransferInitiated(result.transfer_id);
        }
      } else {
        setError(result.error || 'Transfer failed');
      }
    } catch (error) {
      console.error('Error initiating transfer:', error);
      setError('Failed to initiate transfer');
    } finally {
      setIsTransferring(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAgentStatusColor = (currentCalls: number, maxCalls: number) => {
    const utilization = (currentCalls / maxCalls) * 100;
    if (utilization >= 100) return 'text-red-600';
    if (utilization >= 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Show transfer result if transfer was successful
  if (transferResult) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Transfer Initiated Successfully
          </h3>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-green-800 font-medium">
              {transferResult.message}
            </p>
            <p className="text-green-700 text-sm mt-1">
              Transfer ID: {transferResult.transfer_id}
            </p>
          </div>

          {transferResult.human_agent && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center space-x-3">
                <User className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">
                    {transferResult.human_agent.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {transferResult.human_agent.email}
                  </p>
                  <div className="flex items-center space-x-1 mt-1">
                    {transferResult.human_agent.skills.map((skill: string) => (
                      <span
                        key={skill}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="text-sm text-gray-600 mb-4">
            <p>Estimated connection time: {transferResult.estimated_connection_time}s</p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={() => window.open(`/transfer-status/${transferResult.transfer_id}`, '_blank')}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Track Transfer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Transfer to Human Agent
            </h3>
          </div>
          {callId && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
              Call: {callId.slice(-8)}
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Transfer Reason */}
        <div>
          <label htmlFor="transferReason" className="block text-sm font-medium text-gray-700 mb-2">
            Transfer Reason *
          </label>
          <textarea
            id="transferReason"
            rows={3}
            value={transferReason}
            onChange={(e) => setTransferReason(e.target.value)}
            placeholder="Describe why this call needs human assistance..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Priority Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priority Level
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['low', 'medium', 'high', 'urgent'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setPriority(level)}
                className={`px-3 py-2 text-sm rounded-md border capitalize ${
                  priority === level
                    ? getPriorityColor(level)
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Available Agents */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Available Human Agents ({availableAgents.length})
          </label>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading agents...</p>
            </div>
          ) : availableAgents.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No agents currently available</p>
              <button
                onClick={loadAvailableAgents}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                Refresh
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <div
                className={`p-3 border rounded-lg cursor-pointer ${
                  selectedAgent === ''
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedAgent('')}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Auto-assign</p>
                    <p className="text-sm text-gray-600">Let the system choose the best available agent</p>
                  </div>
                </div>
              </div>

              {availableAgents.map((agent) => (
                <div
                  key={agent.id}
                  className={`p-3 border rounded-lg cursor-pointer ${
                    selectedAgent === agent.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedAgent(agent.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{agent.name}</p>
                        <p className="text-sm text-gray-600">{agent.email}</p>
                        
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs text-gray-600">{agent.rating}</span>
                          </div>
                          
                          <span className={`text-xs ${getAgentStatusColor(agent.current_calls, agent.max_calls)}`}>
                            {agent.current_calls}/{agent.max_calls} calls
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex flex-wrap gap-1 justify-end mb-1">
                        {agent.skills.slice(0, 2).map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {skill.replace('_', ' ')}
                          </span>
                        ))}
                        {agent.skills.length > 2 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            +{agent.skills.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Special Instructions */}
        <div>
          <label htmlFor="specialInstructions" className="block text-sm font-medium text-gray-700 mb-2">
            Special Instructions
          </label>
          <textarea
            id="specialInstructions"
            rows={2}
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Any specific context or instructions for the human agent..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={isTransferring}
          >
            Cancel
          </button>
          
          <button
            onClick={handleTransfer}
            disabled={!transferReason.trim() || isTransferring || availableAgents.length === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isTransferring ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Transferring...</span>
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                <span>Initiate Transfer</span>
              </>
            )}
          </button>
        </div>

        {/* Transfer Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Transfer Process:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>AI assistant will be put on hold with a professional message</li>
                <li>Selected human agent will be connected to the call</li>
                <li>Complete conversation context will be provided to the agent</li>
                <li>Call will be seamlessly transferred with no interruption to customer</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}