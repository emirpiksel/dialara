import React, { useState, useEffect } from "react";
import {
  X,
  Clock,
  Calendar,
  FileText,
  Volume2,
  Download,
  Star,
  Loader2,
  Smile,
  Frown,
  Meh,
  Edit,
  Save,
  AlertCircle,
} from "lucide-react";
import { useAuthStore } from "../store/auth";

interface TrainingCallDetailModalProps {
  call: {
    id: string;
    agent_id: string;
    transcript: string;
    duration: number;
    created_at: string;
    score: number | null;
    sentiment: string | null;
    analysis?: { summary: string } | null;
    recording_url?: string | null;
    call_status: string;
  } | null;
  onClose: () => void;
}

export const TrainingCallDetailModal: React.FC<TrainingCallDetailModalProps> = ({ call, onClose }) => {
  const [transcript, setTranscript] = useState(call?.transcript || "Loading transcript...");
  const [polling, setPolling] = useState(false);
  const [summary, setSummary] = useState(call?.analysis?.summary || "");
  const [sentiment, setSentiment] = useState(call?.sentiment || "");
  const [score, setScore] = useState(call?.score || 0);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editingScore, setEditingScore] = useState(call?.score || 0);
  const [editingSentiment, setEditingSentiment] = useState(call?.sentiment || "neutral");
  const [editingFeedback, setEditingFeedback] = useState(call?.analysis?.summary || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Auth store
  const { userId, isAdmin } = useAuthStore();

  useEffect(() => {
    if (!call) return;

    setTranscript(call.transcript || "Loading transcript...");
    setSummary(call.analysis?.summary || "");
    setSentiment(call.sentiment || "");
    setScore(call.score || 0);
    
    // Update editing states when call data changes
    setEditingScore(call.score || 0);
    setEditingSentiment(call.sentiment || "neutral");
    setEditingFeedback(call.analysis?.summary || "");

    if (call.call_status === "in-progress" || call.call_status === "ended") {
      pollForTranscript(call.id);
    }
  }, [call]);

  const pollForTranscript = async (callId: string) => {
    let attempts = 0;
    const maxAttempts = 5;
    setPolling(true);

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/getCallDetails?call_id=${callId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
            "Content-Type": "application/json",
          },
        });

        if (res.status === 404) {
          clearInterval(interval);
          setPolling(false);
          return;
        }

        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);

        const callData = await res.json();

        if (callData.transcript?.trim() !== "") {
          setTranscript(callData.transcript);
          setSummary(callData.summary || callData.analysis?.summary || "");
          setSentiment(callData.sentiment || "");
          setScore(callData.score || 0);
          clearInterval(interval);
          setPolling(false);
        } else if (attempts >= maxAttempts) {
          setTranscript("Transcript Pending");
          clearInterval(interval);
          setPolling(false);
        }
      } catch (error) {
        console.error(`❌ Error polling transcript for Call ID: ${callId}:`, error);
      }

      attempts++;
    }, 3000);
  };

  const renderSentimentIcon = (sentimentValue: string) => {
    if (sentimentValue === "positive") return <Smile className="text-green-500 w-5 h-5" />;
    if (sentimentValue === "negative") return <Frown className="text-red-500 w-5 h-5" />;
    return <Meh className="text-yellow-500 w-5 h-5" />;
  };

  const handleSaveChanges = async () => {
    if (!call || !userId) return;
    
    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch('/api/update-training-call', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          call_id: call.id,
          user_id: userId,
          score: editingScore,
          sentiment: editingSentiment,
          feedback: editingFeedback,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update training call');
      }

      // Update local state
      setScore(editingScore);
      setSentiment(editingSentiment);
      setSummary(editingFeedback);
      setIsEditing(false);
      
      // You might want to trigger a refetch of the training calls here
      
    } catch (error) {
      console.error('Error updating training call:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingScore(call?.score || 0);
    setEditingSentiment(call?.sentiment || "neutral");
    setEditingFeedback(call?.analysis?.summary || "");
    setIsEditing(false);
    setSaveError(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl p-6 relative">
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 transition-colors">
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center text-gray-900">
            <FileText className="w-6 h-6 mr-2 text-blue-500" />
            Training Call Details
          </h2>
          {isAdmin && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition"
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </button>
          )}
        </div>

        {/* Metadata */}
        <div className="space-y-4">
          <div className="flex items-center text-gray-700">
            <Calendar className="w-5 h-5 mr-2 text-gray-500" />
            <span>{new Date(call!.created_at).toLocaleString()}</span>
          </div>

          <div className="flex items-center text-gray-700">
            <Clock className="w-5 h-5 mr-2 text-gray-500" />
            <span>{Math.floor(call!.duration / 60)}m {call!.duration % 60}s</span>
          </div>

          {/* Score */}
          <div className="flex items-center text-gray-700">
            <Star className="w-5 h-5 text-yellow-500 mr-2" />
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">AI Score:</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={editingScore}
                  onChange={(e) => setEditingScore(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <span className="text-sm text-gray-500">/ 10</span>
              </div>
            ) : (
              <span className="text-lg font-semibold">
                AI Score: {score !== null ? score : "Not Rated"}
              </span>
            )}
          </div>

          {/* Sentiment */}
          <div className="flex items-center text-gray-700">
            {renderSentimentIcon(isEditing ? editingSentiment : sentiment)}
            {isEditing ? (
              <div className="flex items-center space-x-2 ml-2">
                <label className="text-sm font-medium">Sentiment:</label>
                <select
                  value={editingSentiment}
                  onChange={(e) => setEditingSentiment(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="negative">Negative</option>
                </select>
              </div>
            ) : (
              <span className="ml-2 text-sm font-medium">Sentiment: {sentiment || "Unknown"}</span>
            )}
          </div>

          {/* Feedback */}
          <div>
            <h3 className="text-sm font-medium text-gray-500">Feedback / Summary:</h3>
            {isEditing ? (
              <textarea
                value={editingFeedback}
                onChange={(e) => setEditingFeedback(e.target.value)}
                className="w-full mt-1 px-2 py-2 border border-gray-300 rounded text-sm resize-y"
                rows={4}
                placeholder="Enter feedback or summary..."
              />
            ) : (
              <p className="text-gray-800 mt-1 text-sm border border-gray-300 bg-gray-100 p-2 rounded">
                {summary || "Not available yet."}
              </p>
            )}
          </div>

          {/* Transcript */}
          <div>
            <h3 className="text-sm font-medium text-gray-500">Transcript:</h3>
            <div className="text-gray-800 mt-1 bg-gray-100 p-2 rounded max-h-40 overflow-y-auto text-sm border border-gray-300">
              {polling ? <Loader2 className="animate-spin w-5 h-5 text-blue-500 mx-auto" /> : transcript}
            </div>
          </div>

          {/* Recording */}
          {call!.recording_url && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 flex items-center">
                <Volume2 className="w-5 h-5 mr-2 text-teal-500" />
                Call Recording
              </h3>
              <audio controls className="w-full mt-2">
                <source src={call!.recording_url} type="audio/wav" />
                Your browser does not support the audio element.
              </audio>
              <a
                href={call!.recording_url}
                download
                className="mt-2 inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Recording
              </a>
            </div>
          )}
        </div>

        {/* Error Message */}
        {saveError && (
          <div className="mt-4 flex items-center text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 mr-2" />
            {saveError}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex justify-end space-x-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
