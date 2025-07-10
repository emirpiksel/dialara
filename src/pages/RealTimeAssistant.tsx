import React, { useState } from 'react';
import RealTimeAssistant from '../components/crm/RealTimeAssistant';
import { Bot, Phone, MessageSquare, Activity } from 'lucide-react';

interface TranscriptMessage {
  id: string;
  speaker: 'agent' | 'customer';
  text: string;
  timestamp: Date;
  sentiment?: 'positive' | 'neutral' | 'negative';
  confidence?: number;
}

interface AIInsight {
  id: string;
  type: 'suggestion' | 'warning' | 'knowledge' | 'opportunity';
  title: string;
  content: string;
  confidence: number;
  timestamp: Date;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

const RealTimeAssistantPage: React.FC = () => {
  const [currentCall, setCurrentCall] = useState<string | null>(null);
  const [callTranscript, setCallTranscript] = useState<TranscriptMessage[]>([]);
  const [usedSuggestions, setUsedSuggestions] = useState<AIInsight[]>([]);

  const handleSuggestionUsed = (suggestion: AIInsight) => {
    setUsedSuggestions(prev => [...prev, suggestion]);
    
    // Log the suggestion usage for analytics
    fetch('/api/ai-assistant/suggestion-used', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        call_id: currentCall,
        suggestion_id: suggestion.id,
        suggestion_type: suggestion.type,
        timestamp: new Date().toISOString()
      })
    }).catch(err => console.error('Failed to log suggestion usage:', err));
  };

  const handleTranscriptUpdate = (transcript: TranscriptMessage[]) => {
    setCallTranscript(transcript);
    
    // Send transcript updates to backend for real-time analysis
    if (currentCall) {
      fetch('/api/ai-assistant/update-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          call_id: currentCall,
          transcript: transcript
        })
      }).catch(err => console.error('Failed to update transcript:', err));
    }
  };

  const startNewCall = () => {
    const callId = `call_${Date.now()}`;
    setCurrentCall(callId);
    setCallTranscript([]);
    setUsedSuggestions([]);
    
    // Notify backend of new call
    fetch('/api/ai-assistant/start-call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        call_id: callId,
        started_at: new Date().toISOString()
      })
    }).catch(err => console.error('Failed to start call tracking:', err));
  };

  const endCall = () => {
    if (currentCall) {
      // Save call summary
      fetch('/api/ai-assistant/end-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          call_id: currentCall,
          ended_at: new Date().toISOString(),
          transcript: callTranscript,
          suggestions_used: usedSuggestions.length
        })
      }).catch(err => console.error('Failed to end call tracking:', err));
    }
    
    setCurrentCall(null);
    setCallTranscript([]);
    setUsedSuggestions([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 flex items-center mb-2">
              <Bot className="mr-3 text-blue-600" size={40} />
              Real-Time AI Assistant
            </h1>
            <p className="text-gray-600 text-lg">
              AI-powered call assistance with live transcription and intelligent suggestions
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {currentCall ? (
              <>
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <Activity className="w-4 h-4 animate-pulse" />
                  <span>Call Active: {currentCall}</span>
                </div>
                <button
                  onClick={endCall}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  End Call
                </button>
              </>
            ) : (
              <button
                onClick={startNewCall}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <Phone className="w-4 h-4 mr-2" />
                Start New Call
              </button>
            )}
          </div>
        </div>

        {/* Instructions when no call is active */}
        {!currentCall && (
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200 mb-8">
            <div className="text-center">
              <Bot className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Welcome to AI Assistant</h2>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Start a new call to begin using the AI assistant. You'll get real-time transcription, 
                sentiment analysis, keyword detection, and intelligent suggestions to help you handle 
                customer conversations more effectively.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="text-center">
                  <MessageSquare className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-medium text-gray-800 mb-1">Live Transcription</h3>
                  <p className="text-sm text-gray-600">Real-time speech-to-text for both speakers</p>
                </div>
                <div className="text-center">
                  <Activity className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-medium text-gray-800 mb-1">Sentiment Analysis</h3>
                  <p className="text-sm text-gray-600">Track customer mood and engagement</p>
                </div>
                <div className="text-center">
                  <Bot className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-medium text-gray-800 mb-1">AI Suggestions</h3>
                  <p className="text-sm text-gray-600">Get intelligent recommendations in real-time</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Real-Time Assistant */}
        {currentCall && (
          <div className="h-[600px]">
            <RealTimeAssistant
              callId={currentCall}
              onSuggestionUsed={handleSuggestionUsed}
              onTranscriptUpdate={handleTranscriptUpdate}
            />
          </div>
        )}

        {/* Call Summary (when call is active) */}
        {currentCall && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Call Statistics</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Messages:</span>
                  <span className="font-medium">{callTranscript.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Suggestions Used:</span>
                  <span className="font-medium">{usedSuggestions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">
                    {currentCall ? `${Math.floor((Date.now() - parseInt(currentCall.split('_')[1])) / 60000)}m` : '0m'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Recent Suggestions</h3>
              <div className="space-y-2">
                {usedSuggestions.slice(-3).map((suggestion, index) => (
                  <div key={index} className="text-sm">
                    <div className="font-medium text-gray-800">{suggestion.title}</div>
                    <div className="text-gray-600 text-xs">{suggestion.type}</div>
                  </div>
                ))}
                {usedSuggestions.length === 0 && (
                  <p className="text-gray-500 text-sm">No suggestions used yet</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors">
                  Send Follow-up Email
                </button>
                <button className="w-full text-left px-3 py-2 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors">
                  Schedule Callback
                </button>
                <button className="w-full text-left px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition-colors">
                  Create Lead Record
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTimeAssistantPage;