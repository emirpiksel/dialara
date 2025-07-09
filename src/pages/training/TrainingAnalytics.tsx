import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell,
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Phone, 
  Star, 
  Trophy,
  Clock,
  ArrowLeft,
  Smile,
  Frown,
  Meh,
  AlertCircle,
  CheckCircle,
  XCircle,
  Target
} from 'lucide-react';
import { useAuthStore } from '../../store/auth';

interface TrainingAnalytics {
  user_id: string;
  user_name: string;
  user_email: string;
  total_training_calls: number;
  total_xp: number;
  base_xp: number;
  bonus_xp: number;
  average_score: number;
  passed_sessions: number;
  failed_sessions: number;
  pass_fail_ratio: number;
  sentiment_breakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  score_trend: Array<{
    date: string;
    score: number;
    passed: boolean;
  }>;
  total_training_time: number;
  last_session_date: string | null;
  recent_sessions: Array<{
    id: string;
    score: number;
    sentiment: string;
    xp: number;
    bonus_xp: number;
    passed: boolean;
    created_at: string;
    feedback: string;
  }>;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444']; // green, yellow, red

const TrainingAnalytics: React.FC = () => {
  const { userId: routeUserId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { userId: currentUserId, isAdmin } = useAuthStore();
  const [analytics, setAnalytics] = useState<TrainingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine which user's analytics to show
  const targetUserId = routeUserId || currentUserId;

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!targetUserId) return;

      try {
        const response = await fetch(`/api/training/user-analytics/${targetUserId}`, {
          headers: {
            'Authorization': 'Bearer token', // In production, use real JWT
            'X-User-ID': currentUserId || '',
            'X-Is-Admin': isAdmin ? 'true' : 'false',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch training analytics');
        }

        const data = await response.json();
        setAnalytics(data);
      } catch (err) {
        console.error('Error fetching training analytics:', err);
        setError('Failed to load training analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [targetUserId, currentUserId, isAdmin]);

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
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Analytics</h2>
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

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="mx-auto mb-4 text-gray-400" size={48} />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Training Data</h2>
          <p className="text-gray-600">No training analytics available for this user.</p>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const sentimentData = [
    { name: 'Positive', value: analytics.sentiment_breakdown.positive, color: COLORS[0] },
    { name: 'Neutral', value: analytics.sentiment_breakdown.neutral, color: COLORS[1] },
    { name: 'Negative', value: analytics.sentiment_breakdown.negative, color: COLORS[2] },
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const chartData = analytics.score_trend.map(item => ({
    date: formatDate(item.date),
    score: item.score,
    passed: item.passed
  }));

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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
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
              <h1 className="text-3xl font-bold text-gray-900">Training Analytics</h1>
              <p className="text-gray-600">{analytics.user_name} • {analytics.user_email}</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Training Calls</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.total_training_calls}</p>
              </div>
              <Phone className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total XP</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.total_xp}</p>
                <p className="text-xs text-gray-500">{analytics.base_xp} base + {analytics.bonus_xp} bonus</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.average_score}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pass Rate</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.pass_fail_ratio}%</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Score Trend Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Trend (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 10]} />
                <Tooltip 
                  formatter={(value, name) => [value, name === 'score' ? 'Score' : name]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Sentiment Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sentiment Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pass/Fail Summary</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-600">Passed</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.passed_sessions}</p>
              </div>

              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.failed_sessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Training Time</h3>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600">Total Training Time</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(analytics.total_training_time / 60)}m</p>
              <p className="text-xs text-gray-500">
                {analytics.last_session_date 
                  ? `Last session: ${new Date(analytics.last_session_date).toLocaleDateString()}`
                  : 'No sessions yet'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Training Sessions</h3>
          <div className="space-y-4">
            {analytics.recent_sessions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent sessions</p>
            ) : (
              analytics.recent_sessions.map((session) => (
                <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 mr-1" />
                        <span className="font-medium">{session.score}/10</span>
                      </div>
                      <div className="flex items-center">
                        {renderSentimentIcon(session.sentiment)}
                        <span className="ml-1 text-sm text-gray-600 capitalize">{session.sentiment}</span>
                      </div>
                      <div className="flex items-center">
                        <Trophy className="w-4 h-4 text-purple-500 mr-1" />
                        <span className="text-sm text-gray-600">{session.xp + session.bonus_xp} XP</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {session.passed ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(session.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {session.feedback && (
                    <p className="text-sm text-gray-600 mt-2">{session.feedback}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingAnalytics;