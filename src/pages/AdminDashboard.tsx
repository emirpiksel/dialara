import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import { 
  BarChart3, 
  Users, 
  Phone, 
  TrendingUp, 
  TrendingDown,
  Star,
  Clock,
  Target,
  Award,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  Eye,
  MessageSquare,
  Zap,
  Bot
} from 'lucide-react';

interface DashboardStats {
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
  ai_assistant_stats?: {
    calls_with_assistant: number;
    total_suggestions_used: number;
    avg_suggestions_per_call: number;
    assistant_adoption_rate: number;
    suggestion_types: { [key: string]: number };
  };
}

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color?: string;
}> = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'blue' }) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    orange: 'text-orange-600 bg-orange-50',
    purple: 'text-purple-600 bg-purple-50',
    red: 'text-red-600 bg-red-50'
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${colorClasses[color as keyof typeof colorClasses].split(' ')[0]}`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className={`flex items-center mt-2 text-sm ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {trend === 'up' ? <TrendingUp className="w-4 h-4 mr-1" /> : 
               trend === 'down' ? <TrendingDown className="w-4 h-4 mr-1" /> : null}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="w-8 h-8" />
        </div>
      </div>
    </div>
  );
};

const AgentPerformanceTable: React.FC<{
  agents: DashboardStats['agent_performance'];
  onViewAgent: (agentId: string) => void;
}> = ({ agents, onViewAgent }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'training': return 'bg-blue-100 text-blue-800';
      case 'offline': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Users className="w-5 h-5 mr-2 text-blue-600" />
          Agent Performance
        </h3>
        <div className="flex items-center space-x-2">
          <button className="flex items-center px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            <Filter className="w-4 h-4 mr-1" />
            Filter
          </button>
          <button className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors">
            <Download className="w-4 h-4 mr-1" />
            Export
          </button>
        </div>
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
                Conversion
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
            {agents.map((agent) => (
              <tr key={agent.user_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                    <div className="text-sm text-gray-500">{agent.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(agent.status)}`}>
                    {agent.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {agent.crm_calls}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {agent.crm_conversion}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-400 mr-1" />
                    <span className="text-sm text-gray-900">{agent.training_score}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{agent.total_xp} XP</div>
                  <div className="text-xs text-gray-500">{agent.rank}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => onViewAgent(agent.user_id)}
                    className="text-blue-600 hover:text-blue-900 flex items-center"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const RealTimeMetrics: React.FC<{
  metrics: DashboardStats['real_time_metrics'];
}> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Sentiment Distribution */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
          Call Sentiment
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Positive</span>
            </div>
            <span className="font-semibold text-green-600">
              {metrics.sentiment_distribution.positive}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Neutral</span>
            </div>
            <span className="font-semibold text-yellow-600">
              {metrics.sentiment_distribution.neutral}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Negative</span>
            </div>
            <span className="font-semibold text-red-600">
              {metrics.sentiment_distribution.negative}%
            </span>
          </div>
        </div>
      </div>

      {/* Top Objections */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 text-orange-600" />
          Top Objections
        </h3>
        <div className="space-y-3">
          {metrics.top_objections.slice(0, 5).map((objection, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-gray-600 truncate">{objection.objection}</span>
              <span className="text-sm font-semibold text-gray-800">{objection.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('today');
  const { isAdmin, isSuperAdmin } = useAuthStore();

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`/api/admin/dashboard?timeRange=${timeRange}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
      
      // Set mock data for development
      setDashboardData({
        crm_stats: {
          total_calls_today: 127,
          total_calls_week: 892,
          average_call_duration: 180,
          conversion_rate: 23.5,
          active_agents: 8,
          calls_in_progress: 3,
          leads_contacted: 45,
          leads_converted: 12
        },
        training_stats: {
          total_training_sessions: 156,
          average_training_score: 7.8,
          active_trainees: 12,
          completed_modules: 89,
          total_xp_earned: 12450,
          badges_unlocked: 34,
          challenges_completed: 23
        },
        agent_performance: [
          {
            user_id: '1',
            name: 'John Smith',
            email: 'john@company.com',
            crm_calls: 15,
            crm_conversion: 28,
            training_score: 8.5,
            training_sessions: 12,
            total_xp: 1250,
            rank: 'Expert',
            status: 'active',
            last_activity: '2024-01-15T10:30:00Z'
          },
          {
            user_id: '2',
            name: 'Sarah Johnson',
            email: 'sarah@company.com',
            crm_calls: 12,
            crm_conversion: 31,
            training_score: 9.2,
            training_sessions: 18,
            total_xp: 1580,
            rank: 'Master',
            status: 'training',
            last_activity: '2024-01-15T09:45:00Z'
          }
        ],
        real_time_metrics: {
          calls_per_hour: [5, 8, 12, 15, 18, 14, 10, 7],
          sentiment_distribution: {
            positive: 65,
            neutral: 25,
            negative: 10
          },
          top_objections: [
            { objection: 'Price too high', count: 23 },
            { objection: 'Need to think about it', count: 18 },
            { objection: 'Not interested right now', count: 15 },
            { objection: 'Already have a solution', count: 12 },
            { objection: 'Need approval from manager', count: 8 }
          ],
          performance_trends: {
            training_scores: [7.2, 7.5, 7.8, 8.1, 8.3],
            call_volumes: [45, 52, 48, 61, 58],
            conversion_rates: [18, 21, 19, 24, 23]
          }
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const handleViewAgent = (agentId: string) => {
    // Navigate to agent detail view
    window.location.href = `/admin/agents/${agentId}`;
  };

  useEffect(() => {
    if (!isAdmin && !isSuperAdmin) {
      setError('Access denied. Admin privileges required.');
      setLoading(false);
      return;
    }

    fetchDashboardData();
  }, [timeRange, isAdmin, isSuperAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 flex items-center mb-2">
              <BarChart3 className="mr-3 text-blue-600" size={40} />
              Admin Dashboard
            </h1>
            <p className="text-gray-600 text-lg">
              Real-time insights into CRM operations and training performance
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-300 
                bg-white hover:bg-gray-50 transition-colors
                ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* CRM Stats */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Phone className="w-5 h-5 mr-2 text-blue-600" />
            CRM Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Calls Today"
              value={dashboardData.crm_stats.total_calls_today}
              subtitle="Total calls made"
              icon={Phone}
              trend="up"
              trendValue="+12% vs yesterday"
              color="blue"
            />
            <StatCard
              title="Conversion Rate"
              value={`${dashboardData.crm_stats.conversion_rate}%`}
              subtitle="Leads converted"
              icon={Target}
              trend="up"
              trendValue="+3.2% vs last week"
              color="green"
            />
            <StatCard
              title="Active Agents"
              value={dashboardData.crm_stats.active_agents}
              subtitle={`${dashboardData.crm_stats.calls_in_progress} calls in progress`}
              icon={Users}
              color="purple"
            />
            <StatCard
              title="Avg Call Duration"
              value={`${Math.floor(dashboardData.crm_stats.average_call_duration / 60)}m ${dashboardData.crm_stats.average_call_duration % 60}s`}
              subtitle="Per call"
              icon={Clock}
              trend="down"
              trendValue="-30s vs last week"
              color="orange"
            />
          </div>
        </div>

        {/* Training Stats */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2 text-purple-600" />
            Training Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Training Sessions"
              value={dashboardData.training_stats.total_training_sessions}
              subtitle="This week"
              icon={BarChart3}
              trend="up"
              trendValue="+18% vs last week"
              color="blue"
            />
            <StatCard
              title="Avg Score"
              value={dashboardData.training_stats.average_training_score}
              subtitle="Training performance"
              icon={Star}
              trend="up"
              trendValue="+0.3 vs last week"
              color="green"
            />
            <StatCard
              title="Total XP"
              value={dashboardData.training_stats.total_xp_earned.toLocaleString()}
              subtitle="Experience earned"
              icon={Zap}
              color="purple"
            />
            <StatCard
              title="Badges Unlocked"
              value={dashboardData.training_stats.badges_unlocked}
              subtitle="Achievements"
              icon={Award}
              color="orange"
            />
          </div>
        </div>

        {/* AI Assistant Stats */}
        {dashboardData.ai_assistant_stats && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Bot className="w-5 h-5 mr-2 text-purple-600" />
              AI Assistant Performance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Calls with AI Assistant"
                value={dashboardData.ai_assistant_stats.calls_with_assistant}
                subtitle="This week"
                icon={Bot}
                trend="up"
                trendValue="+15% vs last week"
                color="purple"
              />
              <StatCard
                title="Suggestions Used"
                value={dashboardData.ai_assistant_stats.total_suggestions_used}
                subtitle="Total AI suggestions"
                icon={Zap}
                trend="up"
                trendValue="+22% vs last week"
                color="blue"
              />
              <StatCard
                title="Avg Suggestions/Call"
                value={dashboardData.ai_assistant_stats.avg_suggestions_per_call}
                subtitle="Per call"
                icon={MessageSquare}
                color="green"
              />
              <StatCard
                title="Adoption Rate"
                value={`${dashboardData.ai_assistant_stats.assistant_adoption_rate}%`}
                subtitle="Of all calls"
                icon={TrendingUp}
                trend="up"
                trendValue="+8% vs last week"
                color="orange"
              />
            </div>
          </div>
        )}

        {/* Real-time Metrics */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
            Real-time Insights
          </h2>
          <RealTimeMetrics metrics={dashboardData.real_time_metrics} />
        </div>

        {/* Agent Performance Table */}
        <AgentPerformanceTable
          agents={dashboardData.agent_performance}
          onViewAgent={handleViewAgent}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;