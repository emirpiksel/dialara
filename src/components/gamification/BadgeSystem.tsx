import React from 'react';
import { 
  Trophy, 
  Flame, 
  Star, 
  Target, 
  BookOpen, 
  Award, 
  Zap, 
  Crown, 
  Shield,
  CheckCircle2,
  Lock
} from 'lucide-react';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof BADGE_ICONS;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  requirements: {
    type: 'xp' | 'calls' | 'streak' | 'score' | 'module' | 'weekly_challenge';
    value: number;
    operator: 'gte' | 'eq' | 'lte';
  };
  xp_reward: number;
  unlocked: boolean;
  progress?: number;
  unlocked_at?: string;
}

export const BADGE_ICONS = {
  trophy: Trophy,
  flame: Flame,
  star: Star,
  target: Target,
  book: BookOpen,
  award: Award,
  zap: Zap,
  crown: Crown,
  shield: Shield,
};

export const BADGE_COLORS = {
  bronze: {
    bg: 'from-amber-100 to-yellow-100',
    border: 'border-amber-300',
    icon: 'bg-amber-400 text-white',
    text: 'text-amber-800'
  },
  silver: {
    bg: 'from-gray-100 to-slate-100',
    border: 'border-gray-300',
    icon: 'bg-gray-400 text-white',
    text: 'text-gray-800'
  },
  gold: {
    bg: 'from-yellow-100 to-orange-100',
    border: 'border-yellow-400',
    icon: 'bg-yellow-500 text-white',
    text: 'text-yellow-800'
  },
  platinum: {
    bg: 'from-purple-100 to-indigo-100',
    border: 'border-purple-400',
    icon: 'bg-purple-500 text-white',
    text: 'text-purple-800'
  }
};

interface BadgeDisplayProps {
  badge: Badge;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  onClick?: () => void;
}

export const BadgeDisplay: React.FC<BadgeDisplayProps> = ({
  badge,
  size = 'md',
  showProgress = true,
  onClick
}) => {
  const IconComponent = BADGE_ICONS[badge.icon];
  const colors = BADGE_COLORS[badge.tier];
  
  const sizeClasses = {
    sm: {
      container: 'p-3',
      icon: 'w-4 h-4',
      iconBg: 'p-2',
      title: 'text-sm',
      description: 'text-xs'
    },
    md: {
      container: 'p-4',
      icon: 'w-5 h-5',
      iconBg: 'p-2',
      title: 'text-base',
      description: 'text-sm'
    },
    lg: {
      container: 'p-6',
      icon: 'w-6 h-6',
      iconBg: 'p-3',
      title: 'text-lg',
      description: 'text-base'
    }
  };
  
  const classes = sizeClasses[size];

  return (
    <div 
      className={`
        relative rounded-xl border-2 transition-all duration-300 cursor-pointer
        ${badge.unlocked 
          ? `bg-gradient-to-br ${colors.bg} ${colors.border} shadow-md hover:shadow-lg` 
          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
        }
        ${classes.container}
      `}
      onClick={onClick}
    >
      <div className="flex items-start space-x-3">
        <div className={`
          rounded-lg transition-all duration-300 ${classes.iconBg}
          ${badge.unlocked ? colors.icon : 'bg-gray-300'}
        `}>
          {badge.unlocked ? (
            <IconComponent className={`${classes.icon} text-white`} />
          ) : (
            <Lock className={`${classes.icon} text-gray-500`} />
          )}
        </div>
        
        <div className="flex-1">
          <h3 className={`
            font-semibold ${classes.title}
            ${badge.unlocked ? colors.text : 'text-gray-500'}
          `}>
            {badge.name}
          </h3>
          <p className={`
            ${classes.description} mt-1
            ${badge.unlocked ? 'text-gray-600' : 'text-gray-400'}
          `}>
            {badge.description}
          </p>
          
          {badge.xp_reward > 0 && (
            <div className={`
              inline-flex items-center mt-2 px-2 py-1 rounded-full text-xs font-medium
              ${badge.unlocked 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-500'
              }
            `}>
              +{badge.xp_reward} XP
            </div>
          )}
          
          {!badge.unlocked && showProgress && badge.progress !== undefined && badge.progress > 0 && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 bg-blue-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(badge.progress, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{badge.progress}% complete</p>
            </div>
          )}
        </div>
      </div>
      
      {badge.unlocked && (
        <div className="absolute -top-2 -right-2">
          <div className="bg-green-500 rounded-full p-1 shadow-md">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
        </div>
      )}
      
      {badge.unlocked_at && (
        <div className="absolute top-2 right-2">
          <div className="bg-black bg-opacity-20 rounded-full px-2 py-1">
            <span className="text-xs text-white font-medium">
              {new Date(badge.unlocked_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

interface BadgeGridProps {
  badges: Badge[];
  columns?: number;
  size?: 'sm' | 'md' | 'lg';
  onBadgeClick?: (badge: Badge) => void;
}

export const BadgeGrid: React.FC<BadgeGridProps> = ({
  badges,
  columns = 3,
  size = 'md',
  onBadgeClick
}) => {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={`grid gap-4 ${gridClasses[columns] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
      {badges.map((badge) => (
        <BadgeDisplay
          key={badge.id}
          badge={badge}
          size={size}
          onClick={() => onBadgeClick?.(badge)}
        />
      ))}
    </div>
  );
};

interface BadgeStatsProps {
  badges: Badge[];
}

export const BadgeStats: React.FC<BadgeStatsProps> = ({ badges }) => {
  const unlockedBadges = badges.filter(b => b.unlocked);
  const totalXP = unlockedBadges.reduce((sum, badge) => sum + badge.xp_reward, 0);
  
  const tierCounts = badges.reduce((acc, badge) => {
    acc[badge.tier] = (acc[badge.tier] || 0) + (badge.unlocked ? 1 : 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <Award className="w-5 h-5 mr-2 text-yellow-500" />
        Badge Statistics
      </h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{unlockedBadges.length}</div>
          <div className="text-sm text-gray-600">Badges Earned</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{totalXP}</div>
          <div className="text-sm text-gray-600">XP from Badges</div>
        </div>
      </div>
      
      <div className="space-y-3">
        {Object.entries(tierCounts).map(([tier, count]) => (
          <div key={tier} className="flex justify-between items-center">
            <span className={`capitalize font-medium ${BADGE_COLORS[tier as keyof typeof BADGE_COLORS].text}`}>
              {tier}
            </span>
            <span className="text-gray-600">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Default badge configurations
export const DEFAULT_BADGES: Omit<Badge, 'unlocked' | 'progress' | 'unlocked_at'>[] = [
  {
    id: 'first_call',
    name: 'First Steps',
    description: 'Complete your first training call',
    icon: 'star',
    tier: 'bronze',
    requirements: { type: 'calls', value: 1, operator: 'gte' },
    xp_reward: 50
  },
  {
    id: 'call_master',
    name: 'Call Master',
    description: 'Complete 25 training calls',
    icon: 'trophy',
    tier: 'silver',
    requirements: { type: 'calls', value: 25, operator: 'gte' },
    xp_reward: 200
  },
  {
    id: 'streak_warrior',
    name: 'Streak Warrior',
    description: 'Maintain a 7-day training streak',
    icon: 'flame',
    tier: 'gold',
    requirements: { type: 'streak', value: 7, operator: 'gte' },
    xp_reward: 300
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Score 100% on a training call',
    icon: 'target',
    tier: 'gold',
    requirements: { type: 'score', value: 100, operator: 'gte' },
    xp_reward: 250
  },
  {
    id: 'knowledge_seeker',
    name: 'Knowledge Seeker',
    description: 'Complete 5 different training modules',
    icon: 'book',
    tier: 'silver',
    requirements: { type: 'module', value: 5, operator: 'gte' },
    xp_reward: 150
  },
  {
    id: 'xp_champion',
    name: 'XP Champion',
    description: 'Earn 1000 total XP',
    icon: 'crown',
    tier: 'platinum',
    requirements: { type: 'xp', value: 1000, operator: 'gte' },
    xp_reward: 500
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Complete a training call in under 30 seconds',
    icon: 'zap',
    tier: 'bronze',
    requirements: { type: 'calls', value: 1, operator: 'gte' }, // Custom logic needed
    xp_reward: 100
  },
  {
    id: 'legendary',
    name: 'Legendary Trainer',
    description: 'Reach the top of the leaderboard',
    icon: 'shield',
    tier: 'platinum',
    requirements: { type: 'calls', value: 100, operator: 'gte' },
    xp_reward: 1000
  }
];