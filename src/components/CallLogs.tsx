import React, { useEffect, useState } from 'react';
import { Phone, Globe, Clock, Play, Pause, FileText, ChevronDown, ChevronUp, Volume2 } from 'lucide-react';
import { useCallsStore } from '../store/calls';
import { CallLog } from '../types';

export function CallLogs() {
  const { calls, isLoading, fetchCalls } = useCallsStore();
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const getCallTypeStyles = (type: string) => {
    switch (type) {
      case 'inbound':
        return 'bg-green-100 text-green-600';
      case 'outbound':
        return 'bg-blue-100 text-blue-600';
      case 'webCall':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getCallTypeIcon = (type: string) => {
    switch (type) {
      case 'webCall':
        return <Globe className="w-5 h-5" />;
      default:
        return <Phone className="w-5 h-5" />;
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 bg-green-50';
      case 'negative':
        return 'text-red-600 bg-red-50';
      case 'neutral':
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const toggleExpanded = (callId: string) => {
    setExpandedCall(expandedCall === callId ? null : callId);
  };

  const toggleAudio = (call: CallLog) => {
    if (!call.recording_url) return;

    if (currentlyPlaying === call.id) {
      // Pause current audio
      if (audioElements[call.id]) {
        audioElements[call.id].pause();
      }
      setCurrentlyPlaying(null);
    } else {
      // Stop any currently playing audio
      if (currentlyPlaying && audioElements[currentlyPlaying]) {
        audioElements[currentlyPlaying].pause();
      }

      // Create or get audio element
      let audio = audioElements[call.id];
      if (!audio) {
        audio = new Audio(call.recording_url);
        audio.addEventListener('ended', () => setCurrentlyPlaying(null));
        audio.addEventListener('error', (e) => {
          console.error('Audio playback error:', e);
          setCurrentlyPlaying(null);
        });
        setAudioElements(prev => ({ ...prev, [call.id]: audio }));
      }

      // Play audio
      audio.play().then(() => {
        setCurrentlyPlaying(call.id);
      }).catch(error => {
        console.error('Error playing audio:', error);
      });
    }
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading calls...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Call History & Recordings</h2>
      {calls.length === 0 ? (
        <p className="text-gray-500">No recent calls</p>
      ) : (
        <div className="space-y-2">
          {calls.map((call) => (
            <div
              key={call.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200"
            >
              {/* Main call row */}
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                   onClick={() => toggleExpanded(call.id)}>
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${getCallTypeStyles(call.call_type)}`}>
                    {getCallTypeIcon(call.call_type)}
                  </div>
                  <div>
                    <p className="font-medium">{call.caller_number || 'Unknown caller'}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(call.timestamp).toLocaleString()}
                    </p>
                    {call.sentiment && (
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(call.sentiment)}`}>
                        {call.sentiment}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{Math.floor(call.duration / 60)}m {call.duration % 60}s</span>
                  </div>
                  {call.score && (
                    <div className="text-sm font-medium">
                      Score: {call.score}/10
                    </div>
                  )}
                  {expandedCall === call.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {expandedCall === call.id && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="space-y-4">
                    {/* Action buttons */}
                    <div className="flex space-x-3">
                      {call.recording_url && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAudio(call);
                          }}
                          className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          {currentlyPlaying === call.id ? (
                            <>
                              <Pause className="w-4 h-4" />
                              <span>Pause</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              <span>Play Recording</span>
                            </>
                          )}
                        </button>
                      )}
                      {!call.recording_url && (
                        <div className="flex items-center space-x-2 px-3 py-2 bg-gray-300 text-gray-600 rounded-md">
                          <Volume2 className="w-4 h-4" />
                          <span>No recording available</span>
                        </div>
                      )}
                    </div>

                    {/* Call summary */}
                    {call.summary && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                        <p className="text-gray-700 text-sm bg-white p-3 rounded-md border">
                          {call.summary}
                        </p>
                      </div>
                    )}

                    {/* Call transcript */}
                    {call.transcript && (
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <FileText className="w-4 h-4 text-gray-600" />
                          <h4 className="font-medium text-gray-900">Transcript</h4>
                        </div>
                        <div className="bg-white p-3 rounded-md border text-sm text-gray-700 max-h-64 overflow-y-auto">
                          <pre className="whitespace-pre-wrap font-sans">{call.transcript}</pre>
                        </div>
                      </div>
                    )}

                    {!call.transcript && (
                      <div className="flex items-center space-x-2 text-gray-500">
                        <FileText className="w-4 h-4" />
                        <span className="text-sm">No transcript available</span>
                      </div>
                    )}

                    {/* Additional details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Call ID:</span>
                        <span className="ml-2 text-gray-800 font-mono text-xs">{call.call_id}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Status:</span>
                        <span className="ml-2 text-gray-800">{call.status}</span>
                      </div>
                      {call.ended_reason && (
                        <div className="col-span-2">
                          <span className="font-medium text-gray-600">End reason:</span>
                          <span className="ml-2 text-gray-800">{call.ended_reason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}