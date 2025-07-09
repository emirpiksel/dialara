import { useEffect, useState } from "react";
import { Users, Flame, ChevronUp, ChevronDown, Star, Trophy, TrendingUp, Phone } from "lucide-react";
import { useAuthStore } from "../../store/auth";
import { useNavigate } from "react-router-dom";

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  email: string;
  total_xp: number;
  average_score: number;
  total_sessions: number;
  passed_sessions: number;
  pass_rate: number;
  sentiment_breakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  last_session: string | null;
  rank: number;
}

const getRankColor = (rank: number) => {
  if (rank === 1) return "text-yellow-500";
  if (rank === 2) return "text-gray-400";
  if (rank === 3) return "text-yellow-700";
  return "text-gray-700";
};

const LeaderboardPage = () => {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'xp' | 'score' | 'pass_rate'>('xp');
  const [error, setError] = useState<string | null>(null);
  const { userId, isAdmin } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch("/api/leaderboard", {
          headers: {
            "X-User-ID": userId || "",
            "X-Is-Admin": isAdmin ? "true" : "false",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch leaderboard");
        }

        const data = await response.json();
        setLeaders(data);
      } catch (err) {
        console.error("❌ Failed to fetch leaderboard:", err);
        setError("Failed to load leaderboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [userId, isAdmin]);

  const sortedLeaders = [...leaders].sort((a, b) => {
    switch (sortBy) {
      case 'score':
        return b.average_score - a.average_score;
      case 'pass_rate':
        return b.pass_rate - a.pass_rate;
      default:
        return b.total_xp - a.total_xp;
    }
  });

  const handleUserClick = (userId: string) => {
    navigate(`/training-analytics/user/${userId}`);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-16">
            <Users className="mx-auto mb-4 text-gray-400" size={48} />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Restricted</h2>
            <p className="text-gray-600">Only administrators can view the leaderboard.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 flex items-center mb-2">
              <Trophy className="mr-3 text-yellow-500" size={32} /> Training Leaderboard
            </h1>
            <p className="text-gray-600 text-lg">Top performers in training simulations</p>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setSortBy('xp')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                sortBy === 'xp' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Sort by XP
            </button>
            <button
              onClick={() => setSortBy('score')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                sortBy === 'score' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Sort by Score
            </button>
            <button
              onClick={() => setSortBy('pass_rate')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                sortBy === 'pass_rate' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Sort by Pass Rate
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="overflow-x-auto bg-white rounded-xl shadow-lg border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Rank</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Agent</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Total XP</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Avg Score</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Sessions</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Pass Rate</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Sentiment</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center p-6 text-gray-500 text-sm">Loading leaderboard...</td>
                </tr>
              ) : sortedLeaders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-6 text-gray-500 text-sm">No training data available yet.</td>
                </tr>
              ) : (
                sortedLeaders.map((entry, index) => (
                  <tr key={entry.user_id} className="hover:bg-gray-50 transition-all">
                    <td className={`px-6 py-4 text-sm font-bold ${getRankColor(index + 1)}`}>
                      <div className="flex items-center">
                        #{index + 1}
                        {index === 0 && <Flame className="ml-2 text-red-500 animate-pulse" size={16} />}
                        {index === 1 && <Star className="ml-2 text-gray-400" size={16} />}
                        {index === 2 && <Star className="ml-2 text-yellow-700" size={16} />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div>
                        <div className="font-medium text-gray-800">{entry.full_name || 'Unknown'}</div>
                        <div className="text-gray-500 text-xs">{entry.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-blue-700">{entry.total_xp} XP</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-500 mr-1" />
                        {entry.average_score.toFixed(1)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 text-gray-400 mr-1" />
                        {entry.total_sessions}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        entry.pass_rate >= 80 ? 'bg-green-100 text-green-800' :
                        entry.pass_rate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {entry.pass_rate}%
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 bg-green-500 rounded-full" title={`Positive: ${entry.sentiment_breakdown.positive}`}></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full" title={`Neutral: ${entry.sentiment_breakdown.neutral}`}></div>
                        <div className="w-3 h-3 bg-red-500 rounded-full" title={`Negative: ${entry.sentiment_breakdown.negative}`}></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleUserClick(entry.user_id)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
