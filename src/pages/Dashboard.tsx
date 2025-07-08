import React, { useEffect } from 'react';
import { Phone, Clock, Users, BarChart3 } from 'lucide-react';
import { useCallsStore } from '../store/calls';
import { useAuthStore } from '../store/auth'; // ✅ Import auth store
import { CallStats } from '../components/CallStats';
import { CallLogs } from '../components/CallLogs';

export function Dashboard() {
  const { stats, fetchStats, fetchCalls } = useCallsStore();
  const { isAdmin, userId } = useAuthStore(); // ✅ Get user ID and admin status

  useEffect(() => {
    if (isAdmin) {
      fetchStats(); // ✅ Fetch all team calls for admins
      fetchCalls();
    } else {
      fetchStats(userId); // ✅ Fetch only personal call data for users
      fetchCalls(userId);
    }
  }, [fetchStats, fetchCalls, isAdmin, userId]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<Phone className="w-6 h-6 text-blue-600" />}
          title="Total Calls"
          value={stats.totalCalls?.toString() || "0"}
        />
        <StatCard
          icon={<Clock className="w-6 h-6 text-green-600" />}
          title="Avg. Duration"
          value={stats.avgDuration || "0"}
        />
        <StatCard
          icon={<Users className="w-6 h-6 text-purple-600" />}
          title="Unique Callers"
          value={stats.uniqueCallers?.toString() || "0"}
        />
        <StatCard
          icon={<BarChart3 className="w-6 h-6 text-orange-600" />}
          title="Success Rate"
          value={stats.successRate || "0%"}
        />
      </div>

      {/* Charts */}
      <CallStats />

      {/* Recent Calls */}
      <div className="mt-8">
        <CallLogs />
      </div>
    </div>
  );
}

function StatCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        {icon}
        <h3 className="ml-3 text-lg font-medium text-gray-900">{title}</h3>
      </div>
      <p className="mt-4 text-3xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

<button onClick={() => createUser(
  `deneme${Date.now()}@gpt.com`,
  "123456",
  "user",
  userId,
  "Deneme Kullanıcı"
)}>
  TEST YENİ USER
</button>
