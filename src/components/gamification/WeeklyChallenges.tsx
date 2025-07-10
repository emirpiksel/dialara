import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Target, 
  Clock, 
  Trophy, 
  Star, 
  Zap, 
  CheckCircle2,
  ArrowRight,
  Gift,
  Flame,
  BarChart3
} from 'lucide-react';

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof CHALLENGE_ICONS;
  type: 'calls' | 'score' | 'streak' | 'time' | 'module';
  target: number;
  current_progress: number;
  xp_reward: number;
  bonus_reward?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  starts_at: string;
  ends_at: string;
  completed: boolean;
  completed_at?: string;
}

export const CHALLENGE_ICONS = {
  target: Target,
  clock: Clock,
  trophy: Trophy,
  star: Star,
  zap: Zap,
  flame: Flame,
  chart: BarChart3,
  gift: Gift
};

export const CHALLENGE_COLORS = {
  easy: {
    bg: 'from-green-50 to-emerald-50',
    border: 'border-green-200',
    icon: 'bg-green-500',
    text: 'text-green-800',
    progress: 'bg-green-500'
  },
  medium: {
    bg: 'from-yellow-50 to-orange-50',
    border: 'border-yellow-200',
    icon: 'bg-yellow-500',
    text: 'text-yellow-800',
    progress: 'bg-yellow-500'
  },
  hard: {
    bg: 'from-red-50 to-pink-50',
    border: 'border-red-200',
    icon: 'bg-red-500',
    text: 'text-red-800',
    progress: 'bg-red-500'
  }
};

interface ChallengeCardProps {
  challenge: WeeklyChallenge;
  onClaim?: (challenge: WeeklyChallenge) => void;
  onView?: (challenge: WeeklyChallenge) => void;
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  onClaim,
  onView
}) => {
  const IconComponent = CHALLENGE_ICONS[challenge.icon];
  const colors = CHALLENGE_COLORS[challenge.difficulty];
  
  const progress = Math.min((challenge.current_progress / challenge.target) * 100, 100);
  const isCompleted = challenge.completed || challenge.current_progress >= challenge.target;
  const canClaim = isCompleted && !challenge.completed;
  
  const timeRemaining = new Date(challenge.ends_at).getTime() - new Date().getTime();
  const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
  
  return (
    <div className={`
      relative rounded-xl border-2 transition-all duration-300 shadow-md hover:shadow-lg
      ${isCompleted 
        ? `bg-gradient-to-br ${colors.bg} ${colors.border}` 
        : 'bg-white border-gray-200 hover:border-gray-300'
      }
      p-6
    `}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`
            p-2 rounded-lg ${colors.icon} text-white
            ${isCompleted ? 'animate-pulse' : ''}
          `}>
            <IconComponent className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`font-semibold text-lg ${colors.text}`}>
              {challenge.title}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {challenge.description}
            </p>
          </div>
        </div>
        
        <div className={`
          px-3 py-1 rounded-full text-xs font-medium capitalize
          ${colors.bg} ${colors.text}
        `}>
          {challenge.difficulty}
        </div>
      </div>
      
      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progress: {challenge.current_progress}/{challenge.target}
          </span>
          <span className="text-sm text-gray-500">
            {progress.toFixed(0)}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full ${colors.progress} transition-all duration-1000 ease-out rounded-full relative`}
            style={{ width: `${progress}%` }}
          >
            {isCompleted && (
              <div className="absolute inset-0 bg-white opacity-20 animate-pulse" />
            )}
          </div>
        </div>
      </div>
      
      {/* Rewards */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-gray-700">
              {challenge.xp_reward} XP
            </span>
          </div>
          
          {challenge.bonus_reward && (
            <div className="flex items-center space-x-1">
              <Gift className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-700">
                {challenge.bonus_reward}
              </span>
            </div>
          )}
        </div>
        
        <div className="text-xs text-gray-500">
          {daysRemaining > 0 ? `${daysRemaining} days left` : 'Expired'}
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onView?.(challenge)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
        >
          <span>View Details</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        
        {canClaim && (
          <button
            onClick={() => onClaim?.(challenge)}
            className={`
              px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
              ${colors.icon} text-white hover:shadow-md transform hover:scale-105
            `}
          >
            Claim Reward
          </button>
        )}
        
        {challenge.completed && (
          <div className="flex items-center space-x-1 text-green-600">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Completed</span>
          </div>
        )}
      </div>
      
      {/* Completion badge */}
      {isCompleted && (
        <div className="absolute -top-2 -right-2">
          <div className="bg-green-500 rounded-full p-1 shadow-md">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
        </div>
      )}
    </div>
  );
};

interface WeeklyChallengesProps {
  challenges: WeeklyChallenge[];
  onClaimReward?: (challenge: WeeklyChallenge) => void;
  onViewDetails?: (challenge: WeeklyChallenge) => void;
}

export const WeeklyChallenges: React.FC<WeeklyChallengesProps> = ({
  challenges,
  onClaimReward,
  onViewDetails
}) => {
  const [currentWeek, setCurrentWeek] = useState(new Date().toISOString().split('T')[0]);
  
  const activeChallenges = challenges.filter(c => {
    const now = new Date();
    const startDate = new Date(c.starts_at);
    const endDate = new Date(c.ends_at);
    return now >= startDate && now <= endDate;
  });
  
  const completedChallenges = activeChallenges.filter(c => c.completed);
  const totalXP = completedChallenges.reduce((sum, c) => sum + c.xp_reward, 0);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Calendar className="w-6 h-6 mr-2 text-blue-600" />
            Weekly Challenges
          </h2>
          <p className="text-gray-600 mt-1">
            Complete challenges to earn bonus XP and rewards
          </p>
        </div>
        
        <div className="text-right">
          <div className="text-sm text-gray-500">This Week</div>
          <div className="text-lg font-semibold text-blue-600">
            {completedChallenges.length}/{activeChallenges.length} Completed
          </div>
          <div className="text-sm text-green-600">
            {totalXP} XP Earned
          </div>
        </div>
      </div>
      
      {/* Weekly Progress */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Weekly Progress
          </h3>
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-medium text-gray-700">
              {totalXP} / {activeChallenges.reduce((sum, c) => sum + c.xp_reward, 0)} XP
            </span>
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-1000 ease-out rounded-full"
            style={{ 
              width: `${activeChallenges.length > 0 ? (completedChallenges.length / activeChallenges.length) * 100 : 0}%` 
            }}
          />
        </div>
        
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-gray-600">
            {completedChallenges.length} of {activeChallenges.length} challenges completed
          </span>
          <span className="text-sm text-gray-500">
            {activeChallenges.length > 0 ? 
              Math.round((completedChallenges.length / activeChallenges.length) * 100) : 0
            }%
          </span>
        </div>
      </div>
      
      {/* Challenges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activeChallenges.map((challenge) => (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            onClaim={onClaimReward}
            onView={onViewDetails}
          />
        ))}
      </div>
      
      {activeChallenges.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            No Active Challenges
          </h3>
          <p className="text-gray-500">
            New challenges will be available soon!
          </p>
        </div>
      )}
    </div>
  );
};

// Default weekly challenges
export const DEFAULT_WEEKLY_CHALLENGES: Omit<WeeklyChallenge, 'current_progress' | 'completed' | 'completed_at'>[] = [
  {
    id: 'weekly_calls',
    title: 'Call Champion',
    description: 'Complete 10 training calls this week',
    icon: 'target',
    type: 'calls',
    target: 10,
    xp_reward: 300,
    bonus_reward: 'Bronze Badge',
    difficulty: 'easy',
    starts_at: '2024-01-01T00:00:00Z',
    ends_at: '2024-01-07T23:59:59Z'
  },
  {
    id: 'weekly_score',
    title: 'Excellence Streak',
    description: 'Achieve an average score of 80% or higher',
    icon: 'star',
    type: 'score',
    target: 80,
    xp_reward: 500,
    bonus_reward: 'Silver Badge',
    difficulty: 'medium',
    starts_at: '2024-01-01T00:00:00Z',
    ends_at: '2024-01-07T23:59:59Z'
  },
  {
    id: 'weekly_streak',
    title: 'Consistency Master',
    description: 'Train for 5 consecutive days',
    icon: 'flame',
    type: 'streak',
    target: 5,
    xp_reward: 400,
    bonus_reward: 'Streak Badge',
    difficulty: 'medium',
    starts_at: '2024-01-01T00:00:00Z',
    ends_at: '2024-01-07T23:59:59Z'
  },
  {
    id: 'weekly_speed',
    title: 'Speed Demon',
    description: 'Complete 3 calls in under 2 minutes each',
    icon: 'zap',
    type: 'time',
    target: 3,
    xp_reward: 600,
    bonus_reward: 'Gold Badge',
    difficulty: 'hard',
    starts_at: '2024-01-01T00:00:00Z',
    ends_at: '2024-01-07T23:59:59Z'
  }
];