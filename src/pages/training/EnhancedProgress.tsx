import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/auth';
import { XPProgressBar, RankSystemOverview, XPSources, calculateXPProgress } from '../../components/gamification/XPRankSystem';
import { BadgeGrid, BadgeStats, Badge } from '../../components/gamification/BadgeSystem';
import { WeeklyChallenges, WeeklyChallenge } from '../../components/gamification/WeeklyChallenges';
import { 
  Trophy, 
  Award, 
  Calendar, 
  Target, 
  TrendingUp,
  Star,
  Zap,
  Settings,
  RefreshCw
} from 'lucide-react';

interface UserStats {
  total_xp: number;
  total_calls: number;
  average_score: number;
  current_streak: number;
  current_rank: any;
  badges: Badge[];
  weekly_xp: number;
  monthly_xp: number;
}

const EnhancedProgressPage: React.FC = () => {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [challenges, setChallenges] = useState<WeeklyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { userId } = useAuthStore();

  const fetchUserData = async () => {
    if (!userId) return;
    
    try {
      const [statsResponse, challengesResponse] = await Promise.all([
        fetch(`/api/gamification/user-stats/${userId}`),
        fetch(`/api/gamification/weekly-challenges/${userId}`)
      ]);

      if (!statsResponse.ok || !challengesResponse.ok) {
        throw new Error('Failed to fetch user data');
      }

      const statsData = await statsResponse.json();
      const challengesData = await challengesResponse.json();

      setUserStats(statsData);
      setBadges(statsData.badges || []);
      setChallenges(challengesData);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
  };

  const handleClaimChallenge = async (challenge: WeeklyChallenge) => {
    if (!userId) return;
    
    try {
      const response = await fetch('/api/gamification/claim-challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          challenge_id: challenge.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to claim challenge');
      }

      const result = await response.json();
      
      if (result.success) {
        // Show success message
        alert(`Success! You earned ${result.xp_awarded} XP for completing ${challenge.title}`);
        
        // Refresh data
        await fetchUserData();
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (err) {
      console.error('Error claiming challenge:', err);
      alert('Failed to claim challenge reward');
    }
  };

  const handleBadgeClick = (badge: Badge) => {
    // Show badge details modal
    alert(`Badge: ${badge.name}\n${badge.description}\n${badge.unlocked ? 'Unlocked!' : `Progress: ${badge.progress?.toFixed(1)}%`}`);
  };

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your progress...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️</div>
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

  if (!userStats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No progress data available</p>
        </div>
      </div>
    );
  }

  const userXP = calculateXPProgress(userStats.total_xp);
  userXP.weekly_xp = userStats.weekly_xp;
  userXP.monthly_xp = userStats.monthly_xp;

  const xpSources = [
    { name: 'Training Calls', xp: userStats.total_calls * 50, count: userStats.total_calls, icon: 'target' as const },
    { name: 'Score Bonuses', xp: userStats.total_calls * 20, count: userStats.total_calls, icon: 'star' as const },
    { name: 'Streak Bonuses', xp: userStats.current_streak * 10, count: userStats.current_streak, icon: 'zap' as const },
    { name: 'Challenge Rewards', xp: challenges.filter(c => c.completed).length * 300, count: challenges.filter(c => c.completed).length, icon: 'trophy' as const }
  ];

  const unlockedBadges = badges.filter(b => b.unlocked);
  const completedChallenges = challenges.filter(c => c.completed);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 flex items-center mb-2">
              <Trophy className="mr-3 text-blue-600" size={40} />
              Enhanced Progress
            </h1>
            <p className="text-gray-600 text-lg">
              Your gamified training journey with XP, badges, and challenges
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
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
            
            <div className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg border border-gray-300">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="font-semibold text-gray-800">
                {userStats.total_xp.toLocaleString()} XP
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Calls</p>
                <p className="text-3xl font-bold text-blue-600">{userStats.total_calls}</p>
                <p className="text-xs text-gray-500">Training sessions</p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Average Score</p>
                <p className="text-3xl font-bold text-green-600">{userStats.average_score.toFixed(1)}</p>
                <p className="text-xs text-gray-500">Performance</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Current Streak</p>
                <p className="text-3xl font-bold text-orange-600">{userStats.current_streak}</p>
                <p className="text-xs text-gray-500">days in a row</p>
              </div>
              <Zap className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Badges Earned</p>
                <p className="text-3xl font-bold text-purple-600">{unlockedBadges.length}</p>
                <p className="text-xs text-gray-500">achievements</p>
              </div>
              <Award className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* XP Progress */}
            <XPProgressBar userXP={userXP} />
            
            {/* Weekly Challenges */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <WeeklyChallenges
                challenges={challenges}
                onClaimReward={handleClaimChallenge}
                onViewDetails={(challenge) => {
                  alert(`Challenge: ${challenge.title}\n${challenge.description}\nProgress: ${challenge.current_progress}/${challenge.target}`);
                }}
              />
            </div>
            
            {/* Badges */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                <Award className="w-5 h-5 mr-2 text-yellow-500" />
                Achievement Badges
              </h3>
              <BadgeGrid 
                badges={badges} 
                columns={3} 
                size="md"
                onBadgeClick={handleBadgeClick}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Badge Stats */}
            <BadgeStats badges={badges} />
            
            {/* XP Sources */}
            <XPSources sources={xpSources} />
            
            {/* Rank System */}
            <RankSystemOverview 
              currentXP={userStats.total_xp}
              showAllRanks={false}
            />
            
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-blue-600" />
                Quick Actions
              </h3>
              
              <div className="space-y-3">
                <button 
                  onClick={() => window.location.href = '/training/simulator'}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Target className="w-4 h-4" />
                  <span>Start Training</span>
                </button>
                
                <button 
                  onClick={() => window.location.href = '/training/leaderboard'}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Trophy className="w-4 h-4" />
                  <span>View Leaderboard</span>
                </button>
                
                <button 
                  onClick={() => window.location.href = '/training/analytics'}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>View Analytics</span>
                </button>
              </div>
            </div>
            
            {/* Weekly Summary */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                This Week
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">XP Earned</span>
                  <span className="font-semibold text-blue-600">{userStats.weekly_xp}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Challenges Completed</span>
                  <span className="font-semibold text-green-600">{completedChallenges.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Badges Earned</span>
                  <span className="font-semibold text-purple-600">
                    {unlockedBadges.filter(b => {
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return b.unlocked_at && new Date(b.unlocked_at) > weekAgo;
                    }).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedProgressPage;