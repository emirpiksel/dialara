import React, { useState, useEffect } from "react";
import { GraduationCap, RefreshCcw, Smile, Meh, Frown } from "lucide-react";
import { ExportButton } from "../../components/ExportButton";
import { TrainingCallDetailModal } from "../../components/TrainingCallDetailModal";
import { supabase } from "@/lib/supabase"; // ✅ Use shared client

const DEBUG_MODE = true;

interface TrainingCall {
  id: string;
  call_id: string;
  agent_id: string;
  transcript: string | null;
  duration: number;
  created_at: string;
  score: number | null;
  sentiment: string | null;
  recording_url: string | null;
  call_status: string;
  feedback: string | null;
  xp: number | null;
  bonus_xp: number | null;
  passed: boolean | null;
  user_id: string;
  module_id: string;
  scenario_id: string;
  started_at: string;
  ended_at: string | null;
}

export function TrainingCalls() {
  const [pastCalls, setPastCalls] = useState<TrainingCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCall, setSelectedCall] = useState<TrainingCall | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPastCalls();
    subscribeToRealtimeUpdates();
  }, []);

  const fetchPastCalls = async () => {
    setLoading(true);
    setError(null);

    try {
      if (DEBUG_MODE) console.log("🔄 Fetching training sessions from Supabase...");
      
      // ✅ Fetch directly from training_sessions table via Supabase
      const { data, error } = await supabase
        .from('training_sessions')
        .select(`
          id,
          call_id,
          agent_id,
          transcript,
          duration,
          created_at,
          score,
          sentiment,
          recording_url,
          feedback,
          xp,
          bonus_xp,
          passed,
          user_id,
          module_id,
          scenario_id,
          started_at,
          ended_at
        `)
        .order('created_at', { ascending: false })
        .limit(100); // Limit to recent 100 calls

      if (error) {
        throw error;
      }

      if (DEBUG_MODE) console.log("✅ Training sessions fetched:", data);

      const formattedData = (data || []).map((session) => ({
        ...session,
        transcript: session.transcript && session.transcript.trim() !== "" ? session.transcript : "No transcript available",
        sentiment: session.sentiment || "neutral",
        score: session.score !== null ? session.score : "N/A",
        call_status: session.transcript && session.score ? "completed" : "pending",
        feedback: session.feedback || "No feedback available",
        xp: session.xp || 0,
        bonus_xp: session.bonus_xp || 0,
        passed: session.passed || false
      }));

      setPastCalls(formattedData);
    } catch (error) {
      console.error("❌ Error fetching training sessions:", error);
      setError("Failed to load training sessions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToRealtimeUpdates = () => {
    if (DEBUG_MODE) console.log("📡 Subscribing to real-time training_sessions updates...");

    const channel = supabase
      .channel("training_sessions_updates")
      .on(
        "postgres_changes",
        { 
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public", 
          table: "training_sessions" 
        },
        (payload) => {
          if (DEBUG_MODE) console.log("🔔 Real-time update received:", payload);
          
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          if (eventType === 'INSERT') {
            // Add new session to the list
            const formattedRecord = {
              ...newRecord,
              transcript: newRecord.transcript && newRecord.transcript.trim() !== "" ? newRecord.transcript : "No transcript available",
              sentiment: newRecord.sentiment || "neutral",
              score: newRecord.score !== null ? newRecord.score : "N/A",
              call_status: newRecord.transcript && newRecord.score ? "completed" : "pending",
              feedback: newRecord.feedback || "No feedback available",
              xp: newRecord.xp || 0,
              bonus_xp: newRecord.bonus_xp || 0,
              passed: newRecord.passed || false
            };
            
            setPastCalls((prevCalls) => [formattedRecord, ...prevCalls]);
            
          } else if (eventType === 'UPDATE') {
            // Update existing session
            const formattedRecord = {
              ...newRecord,
              transcript: newRecord.transcript && newRecord.transcript.trim() !== "" ? newRecord.transcript : "No transcript available",
              sentiment: newRecord.sentiment || "neutral",
              score: newRecord.score !== null ? newRecord.score : "N/A",
              call_status: newRecord.transcript && newRecord.score ? "completed" : "pending",
              feedback: newRecord.feedback || "No feedback available",
              xp: newRecord.xp || 0,
              bonus_xp: newRecord.bonus_xp || 0,
              passed: newRecord.passed || false
            };
            
            setPastCalls((prevCalls) =>
              prevCalls.map((call) =>
                call.call_id === newRecord.call_id ? formattedRecord : call
              )
            );
            
          } else if (eventType === 'DELETE') {
            // Remove deleted session
            setPastCalls((prevCalls) =>
              prevCalls.filter((call) => call.call_id !== oldRecord.call_id)
            );
          }
        }
      )
      .subscribe((status) => {
        if (DEBUG_MODE) console.log("📡 Subscription status:", status);
      });

    // Return cleanup function
    return () => {
      if (DEBUG_MODE) console.log("🧹 Cleaning up real-time subscription");
      supabase.removeChannel(channel);
    };
  };

  const fetchMissingTranscripts = async () => {
    setRefreshing(true);

    const missingTranscripts = pastCalls.filter(
      (call) => call.transcript === "No transcript available" || call.call_status === "pending"
    );

    if (missingTranscripts.length === 0) {
      if (DEBUG_MODE) console.log("✅ No missing transcripts to fetch.");
      setRefreshing(false);
      return;
    }

    try {
      for (const call of missingTranscripts) {
        if (!call.call_id) {
          if (DEBUG_MODE) console.warn(`🚫 Skipping Call - no call_id: ${call.id}`);
          continue;
        }

        // ✅ Use the optimized backend endpoint
        const res = await fetch(`http://127.0.0.1:8000/log-call?call_id=${call.call_id}`);

        if (res.ok) {
          const callData = await res.json();
          
          if (callData.message === "found" && callData.transcript) {
            setPastCalls((prevCalls) =>
              prevCalls.map((c) =>
                c.call_id === call.call_id
                  ? {
                      ...c,
                      transcript: callData.transcript || "No transcript available",
                      score: callData.score || "N/A",
                      sentiment: callData.sentiment || "neutral",
                      feedback: callData.feedback || "No feedback available",
                      xp: callData.xp || 0,
                      bonus_xp: callData.bonus_xp || 0,
                      passed: callData.passed || false,
                      call_status: "completed",
                    }
                  : c
              )
            );
            
            if (DEBUG_MODE) console.log(`✅ Updated call ${call.call_id} with fresh data`);
          }
        } else {
          console.warn(`⚠️ Data not found for Call ID: ${call.call_id}`);
        }
      }
    } catch (error) {
      console.error("❌ Error fetching missing transcripts:", error);
      setError("Failed to refresh transcripts. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  const getSentimentIcon = (sentiment: string | null) => {
    if (sentiment === "positive") return <Smile className="text-green-500 w-5 h-5" />;
    if (sentiment === "negative") return <Frown className="text-red-500 w-5 h-5" />;
    return <Meh className="text-yellow-500 w-5 h-5" />;
  };

  const getScoreColor = (score: number | string) => {
    if (score === "N/A" || score === null) return "text-gray-500";
    const numScore = typeof score === "string" ? parseFloat(score) : score;
    if (numScore >= 8) return "text-green-600 font-semibold";
    if (numScore >= 6) return "text-yellow-600 font-semibold";
    if (numScore >= 4) return "text-orange-600 font-semibold";
    return "text-red-600 font-semibold";
  };

  const getStatusBadge = (call: TrainingCall) => {
    if (call.call_status === "completed") {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          ✅ Completed
        </span>
      );
    } else {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
          ⏳ Processing
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-lg text-gray-600">Loading training sessions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error Loading Data</h3>
          <p className="text-red-600 mt-2">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchPastCalls();
            }}
            className="mt-3 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <GraduationCap className="mr-2" /> Training Sessions ({pastCalls.length})
        </h1>
        <div className="flex gap-4">
          <button
            onClick={fetchMissingTranscripts}
            disabled={refreshing}
            className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCcw className={`mr-2 w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </button>
          <ExportButton />
        </div>
      </div>

      {pastCalls.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <GraduationCap className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Training Sessions Yet</h3>
          <p className="text-gray-500">Complete some training simulations to see your sessions here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Call ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transcript Preview
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    XP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sentiment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                </tr>
              </thead>
              
              
              
              
              <tbody className="bg-white divide-y divide-gray-200">
                {pastCalls.map((call) => (
                  <tr 
                    key={call.id} 
                    onClick={() => setSelectedCall(call)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(call)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {call.call_id ? call.call_id.substring(0, 8) + '...' : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                      <div className="truncate">
                        {call.transcript && call.transcript !== "No transcript available" 
                          ? call.transcript.substring(0, 100) + (call.transcript.length > 100 ? '...' : '')
                          : "No transcript available"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {call.duration ? `${call.duration}s` : 'N/A'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${getScoreColor(call.score)}`}>
                      {call.score !== null && call.score !== "N/A" ? `${call.score}/10` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <span className="font-medium text-blue-600">{call.xp || 0}</span>
                        {call.bonus_xp && call.bonus_xp > 0 && (
                          <span className="ml-1 text-xs text-green-600">+{call.bonus_xp}</span>
                        )}
                        <span className="ml-1 text-xs text-gray-500">XP</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getSentimentIcon(call.sentiment)}
                        <span className="ml-2 text-sm text-gray-600 capitalize">
                          {call.sentiment || 'neutral'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(call.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>


              
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedCall && (
        <TrainingCallDetailModal
          call={selectedCall}
          onClose={() => setSelectedCall(null)}
        />
      )}
    </div>
  );
}

export default TrainingCalls;