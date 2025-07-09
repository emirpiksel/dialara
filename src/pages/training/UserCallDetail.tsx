import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Phone, 
  Clock, 
  Star, 
  Trophy,
  Calendar,
  FileText,
  Smile,
  Frown,
  Meh,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAuthStore } from '../../store/auth';

interface TrainingCall {
  id: string;
  call_id: string;
  score: number;
  sentiment: string;
  xp: number;
  bonus_xp: number;
  passed: boolean;
  duration: number;
  created_at: string;
  started_at: string;
  ended_at: string;
  feedback: string;
  summary: string;
  transcript_preview: string;
}

interface UserCallsResponse {
  user_id: string;
  total_calls: number;
  calls: TrainingCall[];
}

const UserCallDetail: React.FC = () => {
  const { userId: routeUserId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { userId: currentUserId, isAdmin } = useAuthStore();
  const [callsData, setCallsData] = useState<UserCallsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine which user's calls to show
  const targetUserId = routeUserId || currentUserId;

  useEffect(() => {
    const fetchUserCalls = async () => {
      if (!targetUserId) return;

      try {
        const response = await fetch(`/api/user-calls/${targetUserId}`, {
          headers: {
            'Authorization': 'Bearer token', // In production, use real JWT
            'X-User-ID': currentUserId || '',
            'X-Is-Admin': isAdmin ? 'true' : 'false',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user calls');
        }

        const data = await response.json();
        setCallsData(data);
      } catch (err) {
        console.error('Error fetching user calls:', err);
        setError('Failed to load call data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserCalls();
  }, [targetUserId, currentUserId, isAdmin]);

  const renderSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <Smile className="w-5 h-5 text-green-500" />;
      case 'negative':
        return <Frown className="w-5 h-5 text-red-500" />;
      default:
        return <Meh className="w-5 h-5 text-yellow-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Calls</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/training/leaderboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Leaderboard
          </button>
        </div>
      </div>
    );
  }

  if (!callsData || callsData.calls.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Phone className="mx-auto mb-4 text-gray-400" size={48} />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Training Calls</h2>
          <p className="text-gray-600">No training calls found for this user.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/training/leaderboard')}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Training Call History</h1>
              <p className="text-gray-600">Total calls: {callsData.total_calls}</p>
            </div>
          </div>
        </div>

        {/* Calls List */}
        <div className="space-y-4">
          {callsData.calls.map((call) => (
            <div key={call.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex items-center">
                      <Phone className="w-5 h-5 text-blue-500 mr-2" />
                      <span className="font-medium text-gray-900">Call #{call.call_id?.slice(-8)}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Calendar className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">{formatDate(call.created_at)}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Clock className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">{formatDuration(call.duration)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center">
                      <Star className="w-5 h-5 text-yellow-500 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600">Score</p>
                        <p className="font-semibold text-gray-900">{call.score}/10</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      {renderSentimentIcon(call.sentiment)}
                      <div className="ml-2">
                        <p className="text-sm text-gray-600">Sentiment</p>
                        <p className="font-semibold text-gray-900 capitalize">{call.sentiment}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Trophy className="w-5 h-5 text-purple-500 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600">XP Earned</p>
                        <p className="font-semibold text-gray-900">{call.xp + call.bonus_xp}</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      {call.passed ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 mr-2" />
                      )}
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <p className={`font-semibold ${call.passed ? 'text-green-600' : 'text-red-600'}`}>
                          {call.passed ? 'Passed' : 'Failed'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {call.feedback && (
                    <div className="mb-4">
                      <div className="flex items-center mb-2">
                        <FileText className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-700">Feedback</span>
                      </div>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                        {call.feedback}
                      </p>
                    </div>
                  )}

                  {call.transcript_preview && (
                    <div>
                      <div className="flex items-center mb-2">
                        <FileText className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-700">Transcript Preview</span>
                      </div>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                        {call.transcript_preview}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button (if needed) */}
        {callsData.calls.length >= 50 && (
          <div className="text-center mt-8">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Load More Calls
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserCallDetail;