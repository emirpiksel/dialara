import { useEffect, useState } from "react";
import { Users, Flame, ChevronUp, ChevronDown, Star } from "lucide-react";

interface LeaderboardEntry {
  id: string;
  user_id: string;
  xp: number;
  rank: number;
  full_name?: string;
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

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/getLeaderboard");
        const data = await res.json();
        setLeaders(data);
      } catch (err) {
        console.error("❌ Failed to fetch leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 flex items-center mb-4">
          <Users className="mr-3 text-blue-600" size={32} /> Global Leaderboard
        </h1>
        <p className="text-gray-600 mb-8 text-lg">Top agents blazing through training. Earn XP, climb ranks, dominate.</p>

        <div className="overflow-x-auto bg-white rounded-xl shadow-lg border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Rank</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">Agent</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">XP</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-600">🔥</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center p-6 text-gray-500 text-sm">Loading leaderboard...</td>
                </tr>
              ) : leaders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center p-6 text-gray-500 text-sm">No agents on the board yet.</td>
                </tr>
              ) : (
                leaders.map((entry, index) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-all">
                    <td className={`px-6 py-4 text-sm font-bold ${getRankColor(entry.rank)}`}>
                      #{entry.rank}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {entry.full_name || `Agent #${entry.user_id.slice(0, 6)}`}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-blue-700">{entry.xp} XP</td>
                    <td className="px-6 py-4 text-sm">
                      {entry.rank === 1 ? <Flame className="text-red-500 animate-pulse" size={18} /> : <Star className="text-gray-300" size={16} />}
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
