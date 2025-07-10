import React from 'react';
import { 
  Trophy, 
  Star, 
  Crown, 
  Shield, 
  Award, 
  Zap, 
  Target,
  TrendingUp,
  ChevronUp
} from 'lucide-react';

export interface Rank {
  id: string;
  name: string;
  level: number;
  xp_required: number;
  xp_range: [number, number];
  color: string;
  icon: keyof typeof RANK_ICONS;
  benefits: string[];
}

export interface UserXP {
  total_xp: number;
  current_rank: Rank;
  next_rank?: Rank;
  xp_to_next_rank: number;
  progress_to_next_rank: number;
  weekly_xp: number;
  monthly_xp: number;
  rank_progress: number;
}

export const RANK_ICONS = {
  star: Star,
  trophy: Trophy,
  crown: Crown,
  shield: Shield,
  award: Award,
  zap: Zap,
  target: Target
};

export const RANK_SYSTEM: Rank[] = [
  {
    id: 'novice',
    name: 'Novice',
    level: 1,
    xp_required: 0,
    xp_range: [0, 99],
    color: 'text-gray-600',
    icon: 'star',
    benefits: ['Access to basic training modules', 'Progress tracking']
  },
  {
    id: 'apprentice',
    name: 'Apprentice',
    level: 2,
    xp_required: 100,
    xp_range: [100, 249],
    color: 'text-green-600',
    icon: 'target',
    benefits: ['Unlock intermediate modules', 'Weekly challenges', 'Basic badges']
  },
  {
    id: 'practitioner',
    name: 'Practitioner',
    level: 3,
    xp_required: 250,
    xp_range: [250, 499],
    color: 'text-blue-600',
    icon: 'award',
    benefits: ['Advanced training scenarios', 'Leaderboard access', 'Bonus XP events']
  },
  {
    id: 'specialist',
    name: 'Specialist',
    level: 4,
    xp_required: 500,
    xp_range: [500, 999],
    color: 'text-purple-600',
    icon: 'trophy',
    benefits: ['Expert-level content', 'Custom challenges', 'Premium badges']
  },
  {
    id: 'expert',
    name: 'Expert',
    level: 5,
    xp_required: 1000,
    xp_range: [1000, 1999],
    color: 'text-orange-600',
    icon: 'crown',
    benefits: ['Master classes', 'Mentorship opportunities', 'Exclusive rewards']
  },
  {
    id: 'master',
    name: 'Master',
    level: 6,
    xp_required: 2000,
    xp_range: [2000, 4999],
    color: 'text-red-600',
    icon: 'shield',
    benefits: ['Elite training content', 'Leadership roles', 'Legendary badges']
  },
  {
    id: 'grandmaster',
    name: 'Grandmaster',
    level: 7,
    xp_required: 5000,
    xp_range: [5000, Infinity],
    color: 'text-yellow-600',
    icon: 'zap',
    benefits: ['All content unlocked', 'Training others', 'Ultimate recognition']
  }
];

export function getRankByXP(xp: number): Rank {
  return RANK_SYSTEM.find(rank => xp >= rank.xp_range[0] && xp <= rank.xp_range[1]) || RANK_SYSTEM[0];
}

export function getNextRank(currentRank: Rank): Rank | null {
  const currentIndex = RANK_SYSTEM.findIndex(rank => rank.id === currentRank.id);
  return currentIndex < RANK_SYSTEM.length - 1 ? RANK_SYSTEM[currentIndex + 1] : null;
}

export function calculateXPProgress(xp: number): UserXP {
  const currentRank = getRankByXP(xp);
  const nextRank = getNextRank(currentRank);
  
  const xpInCurrentRank = xp - currentRank.xp_range[0];
  const xpRangeSize = currentRank.xp_range[1] - currentRank.xp_range[0];
  const rankProgress = nextRank ? (xpInCurrentRank / xpRangeSize) * 100 : 100;
  
  return {
    total_xp: xp,
    current_rank: currentRank,
    next_rank: nextRank,
    xp_to_next_rank: nextRank ? nextRank.xp_required - xp : 0,
    progress_to_next_rank: nextRank ? rankProgress : 100,
    weekly_xp: 0, // Would be calculated from database
    monthly_xp: 0, // Would be calculated from database
    rank_progress: rankProgress
  };
}

interface RankDisplayProps {
  rank: Rank;
  size?: 'sm' | 'md' | 'lg';
  showBenefits?: boolean;
}

export const RankDisplay: React.FC<RankDisplayProps> = ({
  rank,
  size = 'md',
  showBenefits = false
}) => {
  const IconComponent = RANK_ICONS[rank.icon];
  
  const sizes = {
    sm: { icon: 'w-4 h-4', text: 'text-sm', container: 'p-2' },
    md: { icon: 'w-6 h-6', text: 'text-base', container: 'p-3' },
    lg: { icon: 'w-8 h-8', text: 'text-lg', container: 'p-4' }
  };
  
  const sizeClasses = sizes[size];
  
  return (
    <div className={`flex items-center space-x-2 ${sizeClasses.container}`}>
      <div className={`
        rounded-full p-2 bg-gradient-to-br from-white to-gray-100 shadow-sm
        ${rank.color.replace('text-', 'ring-')} ring-2
      `}>
        <IconComponent className={`${sizeClasses.icon} ${rank.color}`} />
      </div>
      
      <div>
        <div className={`font-semibold ${rank.color} ${sizeClasses.text}`}>
          {rank.name}
        </div>
        <div className="text-xs text-gray-500">
          Level {rank.level}
        </div>
      </div>
      
      {showBenefits && (
        <div className="ml-4">
          <div className="text-xs text-gray-600">Benefits:</div>
          <ul className="text-xs text-gray-500 mt-1">
            {rank.benefits.map((benefit, index) => (
              <li key={index} className="flex items-center">
                <span className="w-1 h-1 bg-gray-400 rounded-full mr-2" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

interface XPProgressBarProps {
  userXP: UserXP;
  animated?: boolean;
}

export const XPProgressBar: React.FC<XPProgressBarProps> = ({
  userXP,
  animated = true
}) => {
  const { current_rank, next_rank, progress_to_next_rank, xp_to_next_rank } = userXP;
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <RankDisplay rank={current_rank} size="md" />
        
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {userXP.total_xp.toLocaleString()} XP
          </div>
          <div className="text-sm text-gray-500">
            Total Experience
          </div>
        </div>
      </div>
      
      {next_rank && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progress to {next_rank.name}
            </span>
            <span className="text-sm text-gray-500">
              {xp_to_next_rank} XP to go
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div 
              className={`
                h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full relative
                ${animated ? 'transition-all duration-1000 ease-out' : ''}
              `}
              style={{ width: `${progress_to_next_rank}%` }}
            >
              <div className="absolute inset-0 bg-white opacity-20 animate-pulse" />
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-600">
              {progress_to_next_rank.toFixed(1)}% complete
            </span>
            <div className="flex items-center text-xs text-gray-500">
              <TrendingUp className="w-3 h-3 mr-1" />
              Next: {next_rank.name}
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-green-600">
            {userXP.weekly_xp}
          </div>
          <div className="text-xs text-gray-500">This Week</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-purple-600">
            {userXP.monthly_xp}
          </div>
          <div className="text-xs text-gray-500">This Month</div>
        </div>
      </div>
    </div>
  );
};

interface RankSystemOverviewProps {
  currentXP: number;
  showAllRanks?: boolean;
}

export const RankSystemOverview: React.FC<RankSystemOverviewProps> = ({
  currentXP,
  showAllRanks = true
}) => {
  const currentRank = getRankByXP(currentXP);
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
        <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
        Rank System
      </h3>
      
      <div className="space-y-3">
        {RANK_SYSTEM.map((rank, index) => {
          const isCurrentRank = rank.id === currentRank.id;
          const isUnlocked = currentXP >= rank.xp_required;
          
          return (
            <div
              key={rank.id}
              className={`
                rounded-lg p-4 border-2 transition-all duration-300
                ${isCurrentRank 
                  ? 'border-blue-400 bg-blue-50 shadow-md' 
                  : isUnlocked 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-200 bg-gray-50'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <RankDisplay rank={rank} size="sm" />
                  <div className="text-sm text-gray-600">
                    {rank.xp_required.toLocaleString()} XP required
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {isCurrentRank && (
                    <div className="px-2 py-1 bg-blue-600 text-white rounded-full text-xs font-medium">
                      Current
                    </div>
                  )}
                  
                  {isUnlocked && !isCurrentRank && (
                    <div className="px-2 py-1 bg-green-600 text-white rounded-full text-xs font-medium">
                      Unlocked
                    </div>
                  )}
                  
                  {!isUnlocked && (
                    <div className="px-2 py-1 bg-gray-400 text-white rounded-full text-xs font-medium">
                      Locked
                    </div>
                  )}
                  
                  {index < RANK_SYSTEM.length - 1 && (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
              
              {showAllRanks && (
                <div className="mt-2 text-xs text-gray-500">
                  <strong>Benefits:</strong> {rank.benefits.join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface XPSourcesProps {
  sources: {
    name: string;
    xp: number;
    count: number;
    icon: keyof typeof RANK_ICONS;
  }[];
}

export const XPSources: React.FC<XPSourcesProps> = ({ sources }) => {
  const totalXP = sources.reduce((sum, source) => sum + source.xp, 0);
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <Star className="w-5 h-5 mr-2 text-yellow-500" />
        XP Sources
      </h3>
      
      <div className="space-y-3">
        {sources.map((source) => {
          const IconComponent = RANK_ICONS[source.icon];
          const percentage = totalXP > 0 ? (source.xp / totalXP) * 100 : 0;
          
          return (
            <div key={source.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <IconComponent className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-800">{source.name}</div>
                  <div className="text-sm text-gray-500">
                    {source.count} times
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-semibold text-blue-600">
                  {source.xp.toLocaleString()} XP
                </div>
                <div className="text-xs text-gray-500">
                  {percentage.toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};