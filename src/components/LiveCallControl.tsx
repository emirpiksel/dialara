import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Pause, 
  Play, 
  Volume2, 
  VolumeX, 
  UserPlus, 
  MessageSquare, 
  Monitor,
  AlertTriangle,
  Clock,
  Activity,
  Users,
  MoreVertical,
  Eye,
  EyeOff,
  Mic,
  MicOff,
  RefreshCw,
  Settings
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { HumanTransfer } from './HumanTransfer';

interface LiveCall {
  call_id: string;
  user_id: string;
  caller_number: string;
  call_type: string;
  status: string;
  started_at: string;
  duration_seconds: number;
  agent_name: string;
  customer_name?: string;
  last_message: string;
  sentiment: string;
  is_ai_muted: boolean;
  intervention_count: number;
  is_monitored: boolean;
  supervisor_count: number;
  last_activity: string;
}

interface CallDetails {
  call: LiveCall;
  interventions: any[];
  active_supervisors: any[];
  full_transcript: string;
  supervisor_notes: string;
}

interface InterventionResult {
  success: boolean;
  intervention_id?: string;
  response?: string;
  call_status?: string;
}

export function LiveCallControl() {
  const { userId, user } = useAuthStore();
  const [activeCalls, setActiveCalls] = useState<LiveCall[]>([]);
  const [selectedCall, setSelectedCall] = useState<string | null>(null);
  const [callDetails, setCallDetails] = useState<CallDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5); // seconds
  const [interventionMessage, setInterventionMessage] = useState('');
  const [showTranscript, setShowTranscript] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Check if user has supervisor permissions
  const isSupervisor = user?.role && ['admin', 'superadmin', 'supervisor'].includes(user.role);

  useEffect(() => {
    if (userId && isSupervisor) {
      loadActiveCalls();
    }
  }, [userId, isSupervisor]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh && isSupervisor) {
      interval = setInterval(() => {
        loadActiveCalls();
        if (selectedCall) {
          loadCallDetails(selectedCall);
        }
      }, refreshInterval * 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval, selectedCall, isSupervisor]);

  // Auto-scroll transcript to bottom
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [callDetails?.full_transcript]);

  const loadActiveCalls = async () => {
    try {
      const response = await fetch(`/api/live-calls/active?supervisor_id=${userId}`);
      const data = await response.json();
      
      if (data.status === 'success') {
        setActiveCalls(data.calls);
      }
    } catch (error) {
      console.error('Error loading active calls:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCallDetails = async (callId: string) => {
    try {
      const response = await fetch(`/api/live-calls/${callId}/details`);
      const data = await response.json();
      
      if (data.status === 'success') {
        setCallDetails(data.details);
      }
    } catch (error) {
      console.error('Error loading call details:', error);
    }
  };

  const subscribeToCall = async (callId: string) => {
    try {
      const response = await fetch('/api/live-calls/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supervisor_id: userId,
          call_id: callId
        })
      });

      const result = await response.json();
      if (result.success) {
        setSelectedCall(callId);
        await loadCallDetails(callId);
        await loadActiveCalls(); // Refresh the list
      }
    } catch (error) {
      console.error('Error subscribing to call:', error);
    }
  };

  const unsubscribeFromCall = async (callId: string) => {
    try {
      await fetch('/api/live-calls/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supervisor_id: userId,
          call_id: callId
        })
      });

      setSelectedCall(null);
      setCallDetails(null);
      await loadActiveCalls();
    } catch (error) {
      console.error('Error unsubscribing from call:', error);
    }
  };

  const performIntervention = async (callId: string, interventionType: string, message?: string) => {
    try {
      const response = await fetch('/api/live-calls/intervene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call_id: callId,
          supervisor_id: userId,
          intervention_type: interventionType,
          message: message
        })
      });

      const result: InterventionResult = await response.json();
      
      if (result.success) {
        // Refresh call details to show the intervention
        await loadCallDetails(callId);
        await loadActiveCalls();
        
        // Clear message if it was a send_message intervention
        if (interventionType === 'send_message') {
          setInterventionMessage('');
        }
        
        // Show success feedback
        alert(`Intervention successful: ${result.response}`);
      } else {
        alert(`Intervention failed: ${result.response || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error performing intervention:', error);
      alert('Error performing intervention');
    }
  };

  const initiateHumanTransfer = async (callId: string) => {
    try {
      // Get transfer reason from user
      const reason = prompt('Reason for transfer to human agent:', 'Customer requested human agent');
      if (!reason) return;

      const priority = confirm('Is this a high priority transfer?') ? 'high' : 'medium';

      const response = await fetch('/api/human-transfer/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call_id: callId,
          supervisor_id: userId,
          reason: reason,
          priority: priority,
          special_instructions: 'Transferred from live call monitoring'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Transfer initiated: ${result.message}`);
        
        // Refresh call details
        await loadCallDetails(callId);
        await loadActiveCalls();
      } else {
        alert(`Transfer failed: ${result.error || result.message}`);
      }
    } catch (error) {
      console.error('Error initiating human transfer:', error);
      alert('Error initiating human transfer');
    }
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'text-green-600 bg-green-100';
      case 'on_hold': return 'text-yellow-600 bg-yellow-100';
      case 'transferring': return 'text-blue-600 bg-blue-100';
      case 'ended': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      case 'neutral': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  if (!isSupervisor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">Access Restricted</h3>
          <p className="text-gray-600">Live call control requires supervisor permissions.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="animate-pulse">Loading live call control panel...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Live Call Control Panel</h2>
          <p className="text-gray-600">Monitor and control active calls in real-time</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="auto-refresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="auto-refresh" className="text-sm text-gray-700">Auto-refresh</label>
          </div>
          
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            disabled={!autoRefresh}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value={3}>3s</option>
            <option value={5}>5s</option>
            <option value={10}>10s</option>
            <option value={30}>30s</option>
          </select>
          
          <button
            onClick={loadActiveCalls}
            className="p-2 text-gray-600 hover:text-gray-800"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Calls List */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold flex items-center">
                <Activity className="w-5 h-5 mr-2 text-green-600" />
                Active Calls ({activeCalls.length})
              </h3>
            </div>
            
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {activeCalls.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Phone className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No active calls</p>
                </div>
              ) : (
                activeCalls.map((call) => (
                  <div
                    key={call.call_id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedCall === call.call_id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => subscribeToCall(call.call_id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-sm">{call.caller_number}</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(call.status)}`}>
                            {call.status.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <p className="text-xs text-gray-600 mb-1">
                          {call.customer_name || 'Unknown Customer'}
                        </p>
                        
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDuration(call.duration_seconds)}
                          </span>
                          
                          <span className={`flex items-center ${getSentimentColor(call.sentiment)}`}>
                            <Activity className="w-3 h-3 mr-1" />
                            {call.sentiment}
                          </span>
                          
                          {call.supervisor_count > 0 && (
                            <span className="flex items-center text-blue-600">
                              <Users className="w-3 h-3 mr-1" />
                              {call.supervisor_count}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-2">
                          {call.is_ai_muted && (
                            <MicOff className="w-3 h-3 text-red-500" />
                          )}
                          
                          {call.intervention_count > 0 && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">
                              {call.intervention_count} interventions
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        {call.is_monitored ? (
                          <Eye className="w-4 h-4 text-blue-600" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Call Details and Controls */}
        <div className="lg:col-span-2">
          {selectedCall && callDetails ? (
            <div className="space-y-4">
              {/* Call Header */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Call Control: {callDetails.call.caller_number}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {callDetails.call.customer_name || 'Unknown Customer'} • {callDetails.call.agent_name}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => unsubscribeFromCall(selectedCall)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <EyeOff className="w-5 h-5" />
                  </button>
                </div>

                {/* Control Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button
                    onClick={() => performIntervention(selectedCall, callDetails.call.is_ai_muted ? 'unmute_ai' : 'mute_ai')}
                    className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm ${
                      callDetails.call.is_ai_muted
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {callDetails.call.is_ai_muted ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    <span>{callDetails.call.is_ai_muted ? 'Unmute AI' : 'Mute AI'}</span>
                  </button>

                  <button
                    onClick={() => performIntervention(selectedCall, callDetails.call.status === 'on_hold' ? 'resume_call' : 'pause_call')}
                    className="flex items-center justify-center space-x-2 px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
                  >
                    {callDetails.call.status === 'on_hold' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    <span>{callDetails.call.status === 'on_hold' ? 'Resume' : 'Pause'}</span>
                  </button>

                  <button
                    onClick={() => setShowTransferModal(true)}
                    className="flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Transfer</span>
                  </button>

                  <button
                    onClick={() => performIntervention(selectedCall, 'end_call')}
                    className="flex items-center justify-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>End Call</span>
                  </button>
                </div>

                {/* Supervisor Message */}
                <div className="mt-4">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={interventionMessage}
                      onChange={(e) => setInterventionMessage(e.target.value)}
                      placeholder="Send instruction to AI..."
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && interventionMessage.trim()) {
                          performIntervention(selectedCall, 'send_message', interventionMessage);
                        }
                      }}
                    />
                    <button
                      onClick={() => interventionMessage.trim() && performIntervention(selectedCall, 'send_message', interventionMessage)}
                      disabled={!interventionMessage.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 text-sm"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Transcript */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <h4 className="font-semibold">Live Transcript</h4>
                  <button
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {showTranscript ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {showTranscript && (
                  <div
                    ref={transcriptRef}
                    className="p-4 h-64 overflow-y-auto bg-gray-50 font-mono text-sm"
                  >
                    {callDetails.full_transcript ? (
                      <pre className="whitespace-pre-wrap">{callDetails.full_transcript}</pre>
                    ) : (
                      <p className="text-gray-500 italic">No transcript available yet...</p>
                    )}
                  </div>
                )}
              </div>

              {/* Intervention History */}
              {callDetails.interventions.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h4 className="font-semibold">Supervisor Interventions</h4>
                  </div>
                  
                  <div className="divide-y divide-gray-200 max-h-32 overflow-y-auto">
                    {callDetails.interventions.map((intervention, index) => (
                      <div key={index} className="p-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-gray-900">
                            {intervention.intervention_type.replace('_', ' ')}
                          </span>
                          <span className="text-gray-500">
                            {new Date(intervention.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {intervention.message && (
                          <p className="text-sm text-gray-600 mt-1">{intervention.message}</p>
                        )}
                        {intervention.response && (
                          <p className="text-xs text-green-600 mt-1">✓ {intervention.response}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <div className="text-center">
                <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Call to Monitor</h3>
                <p className="text-gray-600">
                  Choose an active call from the list to view details and access control options.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Human Transfer Modal */}
      {showTransferModal && selectedCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <HumanTransfer
              callId={selectedCall}
              onTransferInitiated={(transferId) => {
                console.log('Transfer initiated:', transferId);
                setShowTransferModal(false);
                // Refresh call details to show transfer status
                loadCallDetails(selectedCall);
              }}
              onClose={() => setShowTransferModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}