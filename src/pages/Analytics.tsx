import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { useCallsStore } from '../store/calls';
import { useAuthStore } from '../store/auth';
import { useTranslation } from '../lib/i18n';
import { AlertCircle, TrendingUp, Users, Phone, Award, AlertTriangle, MessageSquare } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardData {
  crm_stats: {
    total_calls_today: number;
    total_calls_week: number;
    average_call_duration: number;
    conversion_rate: number;
    active_agents: number;
    calls_in_progress: number;
    leads_contacted: number;
    leads_converted: number;
  };
  training_stats: {
    total_training_sessions: number;
    average_training_score: number;
    active_trainees: number;
    completed_modules: number;
    total_xp_earned: number;
    badges_unlocked: number;
    challenges_completed: number;
  };
  agent_performance: Array<{
    user_id: string;
    name: string;
    email: string;
    crm_calls: number;
    crm_conversion: number;
    training_score: number;
    training_sessions: number;
    total_xp: number;
    rank: string;
    status: 'active' | 'training' | 'offline';
    last_activity: string;
  }>;
  real_time_metrics: {
    calls_per_hour: number[];
    sentiment_distribution: {
      positive: number;
      neutral: number;
      negative: number;
    };
    top_objections: Array<{
      objection: string;
      count: number;
    }>;
    performance_trends: {
      training_scores: number[];
      call_volumes: number[];
      conversion_rates: number[];
    };
  };
  ai_assistant_stats: {
    calls_with_assistant: number;
    total_suggestions_used: number;
    avg_suggestions_per_call: number;
    assistant_adoption_rate: number;
    suggestion_types: Record<string, number>;
  };
}

export function Analytics() {
  const { userId } = useAuthStore();
  const { t } = useTranslation();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('today');

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/dashboard?timeRange=${timeRange}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      const data = await response.json();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-8">{t('analytics.title')}</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-8">{t('analytics.title')}</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-center text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { crm_stats, training_stats, agent_performance, real_time_metrics, ai_assistant_stats } = dashboardData;

  // Chart data for sentiment distribution
  const sentimentData = {
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [
      {
        data: [
          real_time_metrics.sentiment_distribution.positive,
          real_time_metrics.sentiment_distribution.neutral,
          real_time_metrics.sentiment_distribution.negative,
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(107, 114, 128, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderWidth: 0,
      },
    ],
  };

  // Chart data for performance trends
  const performanceTrendsData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
    datasets: [
      {
        label: 'Training Scores',
        data: real_time_metrics.performance_trends.training_scores,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1,
      },
      {
        label: 'Call Volumes',
        data: real_time_metrics.performance_trends.call_volumes,
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.1,
      },
    ],
  };

  // Chart data for calls per hour
  const callsPerHourData = {
    labels: Array.from({ length: real_time_metrics.calls_per_hour.length }, (_, i) => `${i + 9}:00`),
    datasets: [
      {
        label: 'Calls per Hour',
        data: real_time_metrics.calls_per_hour,
        backgroundColor: 'rgba(147, 51, 234, 0.6)',
        borderColor: 'rgba(147, 51, 234, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Helper function to get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'training':
        return 'bg-blue-100 text-blue-800';
      case 'offline':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to get rank color
  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'Master':
        return 'bg-purple-100 text-purple-800';
      case 'Expert':
        return 'bg-yellow-100 text-yellow-800';
      case 'Advanced':
        return 'bg-blue-100 text-blue-800';
      case 'Intermediate':
        return 'bg-green-100 text-green-800';
      case 'Beginner':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">{t('analytics.title')}</h1>
          <div className="flex space-x-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
            <button
              onClick={fetchDashboardData}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
            >
              {t('common.refresh')}
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Phone className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{t('analytics.callMetrics')}</p>
              <p className="text-2xl font-bold text-gray-900">{crm_stats.total_calls_today}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{crm_stats.conversion_rate}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Agents</p>
              <p className="text-2xl font-bold text-gray-900">{crm_stats.active_agents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Award className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Training Score</p>
              <p className="text-2xl font-bold text-gray-900">{training_stats.average_training_score}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Performance Trends */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Performance Trends</h2>
          <Line
            data={performanceTrendsData}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top' as const,
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                },
              },
            }}
          />
        </div>

        {/* Calls Per Hour */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Call Volume by Hour</h2>
          <Bar
            data={callsPerHourData}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  display: false,
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                },
              },
            }}
          />
        </div>
      </div>

      {/* Sentiment Analysis and AI Assistant Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Sentiment Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Call Sentiment Distribution</h2>
          <div className="flex items-center justify-center h-64">
            <Pie
              data={sentimentData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                  },
                },
              }}
            />
          </div>
        </div>

        {/* AI Assistant Performance */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">AI Assistant Performance</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">Calls with AI Assistant</span>
              <span className="text-lg font-semibold text-gray-900">{ai_assistant_stats.calls_with_assistant}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">Total Suggestions Used</span>
              <span className="text-lg font-semibold text-gray-900">{ai_assistant_stats.total_suggestions_used}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">Avg Suggestions per Call</span>
              <span className="text-lg font-semibold text-gray-900">{ai_assistant_stats.avg_suggestions_per_call}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">Adoption Rate</span>
              <span className="text-lg font-semibold text-green-600">{ai_assistant_stats.assistant_adoption_rate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Objections */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Top Customer Objections</h2>
        <div className="space-y-3">
          {real_time_metrics.top_objections.map((objection, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-orange-500 mr-2" />
                <span className="text-sm font-medium text-gray-900">{objection.objection}</span>
              </div>
              <span className="text-sm font-semibold text-gray-600">{objection.count} times</span>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Performance Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Agent Performance & Coaching Insights</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CRM Calls
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Training Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  XP / Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agent_performance.map((agent) => (
                <tr key={agent.user_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                      <div className="text-sm text-gray-500">{agent.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(agent.status)}`}>
                      {agent.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.crm_calls}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`text-sm font-medium ${agent.training_score >= 8 ? 'text-green-600' : agent.training_score >= 6 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {agent.training_score}
                      </span>
                      {agent.training_score < 6 && (
                        <AlertTriangle className="h-4 w-4 text-red-500 ml-1" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900">{agent.total_xp} XP</div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRankColor(agent.rank)}`}>
                        {agent.rank}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      {agent.training_score < 6 && (
                        <button className="text-orange-600 hover:text-orange-900">
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      )}
                      <button className="text-blue-600 hover:text-blue-900">
                        View Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
