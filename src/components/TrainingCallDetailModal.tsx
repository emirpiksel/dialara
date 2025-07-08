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
} from "lucide-react";

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

  useEffect(() => {
    if (!call) return;

    setTranscript(call.transcript || "Loading transcript...");
    setSummary(call.analysis?.summary || "");
    setSentiment(call.sentiment || "");
    setScore(call.score || 0);

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

  const renderSentimentIcon = () => {
    if (sentiment === "positive") return <Smile className="text-green-500 w-5 h-5" />;
    if (sentiment === "negative") return <Frown className="text-red-500 w-5 h-5" />;
    return <Meh className="text-yellow-500 w-5 h-5" />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl p-6 relative">
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 transition-colors">
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <h2 className="text-2xl font-bold mb-4 flex items-center text-gray-900">
          <FileText className="w-6 h-6 mr-2 text-blue-500" />
          Training Call Details
        </h2>

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
            <span className="text-lg font-semibold">
              AI Score: {score !== null ? score : "Not Rated"}
            </span>
          </div>

          {/* Sentiment */}
          <div className="flex items-center text-gray-700">
            {renderSentimentIcon()}
            <span className="ml-2 text-sm font-medium">Sentiment: {sentiment || "Unknown"}</span>
          </div>

          {/* Feedback */}
          <div>
            <h3 className="text-sm font-medium text-gray-500">Feedback / Summary:</h3>
            <p className="text-gray-800 mt-1 text-sm border border-gray-300 bg-gray-100 p-2 rounded">
              {summary || "Not available yet."}
            </p>
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

        {/* Footer */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
