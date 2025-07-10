"""
Gamification service for badges, achievements, XP, and weekly challenges
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from database import get_supabase_client
from config import get_config

logger = logging.getLogger(__name__)
supabase = get_supabase_client()
config = get_config()

class GamificationService:
    
    def __init__(self):
        self.badge_definitions = {
            'first_call': {
                'name': 'First Steps',
                'description': 'Complete your first training call',
                'icon': 'star',
                'tier': 'bronze',
                'xp_reward': 50,
                'requirements': {'type': 'calls', 'value': 1, 'operator': 'gte'}
            },
            'call_master': {
                'name': 'Call Master',
                'description': 'Complete 25 training calls',
                'icon': 'trophy',
                'tier': 'silver',
                'xp_reward': 200,
                'requirements': {'type': 'calls', 'value': 25, 'operator': 'gte'}
            },
            'streak_warrior': {
                'name': 'Streak Warrior',
                'description': 'Maintain a 7-day training streak',
                'icon': 'flame',
                'tier': 'gold',
                'xp_reward': 300,
                'requirements': {'type': 'streak', 'value': 7, 'operator': 'gte'}
            },
            'perfectionist': {
                'name': 'Perfectionist',
                'description': 'Score 100% on a training call',
                'icon': 'target',
                'tier': 'gold',
                'xp_reward': 250,
                'requirements': {'type': 'score', 'value': 100, 'operator': 'gte'}
            },
            'knowledge_seeker': {
                'name': 'Knowledge Seeker',
                'description': 'Complete 5 different training modules',
                'icon': 'book',
                'tier': 'silver',
                'xp_reward': 150,
                'requirements': {'type': 'module', 'value': 5, 'operator': 'gte'}
            },
            'xp_champion': {
                'name': 'XP Champion',
                'description': 'Earn 1000 total XP',
                'icon': 'crown',
                'tier': 'platinum',
                'xp_reward': 500,
                'requirements': {'type': 'xp', 'value': 1000, 'operator': 'gte'}
            },
            'speed_demon': {
                'name': 'Speed Demon',
                'description': 'Complete a training call in under 30 seconds',
                'icon': 'zap',
                'tier': 'bronze',
                'xp_reward': 100,
                'requirements': {'type': 'duration', 'value': 30, 'operator': 'lte'}
            },
            'legendary': {
                'name': 'Legendary Trainer',
                'description': 'Reach the top of the leaderboard',
                'icon': 'shield',
                'tier': 'platinum',
                'xp_reward': 1000,
                'requirements': {'type': 'rank', 'value': 1, 'operator': 'eq'}
            }
        }
        
        self.rank_system = [
            {'id': 'novice', 'name': 'Novice', 'level': 1, 'xp_required': 0, 'xp_range': [0, 99]},
            {'id': 'apprentice', 'name': 'Apprentice', 'level': 2, 'xp_required': 100, 'xp_range': [100, 249]},
            {'id': 'practitioner', 'name': 'Practitioner', 'level': 3, 'xp_required': 250, 'xp_range': [250, 499]},
            {'id': 'specialist', 'name': 'Specialist', 'level': 4, 'xp_required': 500, 'xp_range': [500, 999]},
            {'id': 'expert', 'name': 'Expert', 'level': 5, 'xp_required': 1000, 'xp_range': [1000, 1999]},
            {'id': 'master', 'name': 'Master', 'level': 6, 'xp_required': 2000, 'xp_range': [2000, 4999]},
            {'id': 'grandmaster', 'name': 'Grandmaster', 'level': 7, 'xp_required': 5000, 'xp_range': [5000, float('inf')]}
        ]
    
    def get_user_stats(self, user_id: str) -> Dict:
        """Get comprehensive user gamification stats"""
        try:
            # Get user's training sessions
            sessions_result = supabase.table('training_sessions').select('*').eq('user_id', user_id).execute()
            sessions = sessions_result.data or []
            
            # Get user's total XP from training_leaderboard
            leaderboard_result = supabase.table('training_leaderboard').select('*').eq('user_id', user_id).execute()
            leaderboard_data = leaderboard_result.data[0] if leaderboard_result.data else None
            
            total_xp = leaderboard_data.get('xp', 0) if leaderboard_data else 0
            
            # Calculate basic stats
            total_calls = len(sessions)
            completed_calls = len([s for s in sessions if (s.get('score') or 0) > 0])
            average_score = sum((s.get('score') or 0) for s in sessions) / len(sessions) if sessions else 0
            total_duration = sum((s.get('duration') or 0) for s in sessions)
            
            # Calculate streak
            current_streak = self._calculate_streak(sessions)
            
            # Get unique modules completed
            unique_modules = len(set(s.get('module_id') for s in sessions if s.get('module_id')))
            
            # Get current rank
            current_rank = self._get_rank_by_xp(total_xp)
            
            # Get badges
            badges = self._get_user_badges(user_id, {
                'total_calls': total_calls,
                'total_xp': total_xp,
                'current_streak': current_streak,
                'unique_modules': unique_modules,
                'sessions': sessions
            })
            
            return {
                'user_id': user_id,
                'total_xp': total_xp,
                'total_calls': total_calls,
                'completed_calls': completed_calls,
                'average_score': round(average_score, 1),
                'total_duration': total_duration,
                'current_streak': current_streak,
                'unique_modules': unique_modules,
                'current_rank': current_rank,
                'badges': badges,
                'weekly_xp': self._get_weekly_xp(user_id),
                'monthly_xp': self._get_monthly_xp(user_id)
            }
            
        except Exception as e:
            logger.exception(f"Error getting user stats for {user_id}")
            return {
                'user_id': user_id,
                'total_xp': 0,
                'total_calls': 0,
                'completed_calls': 0,
                'average_score': 0,
                'total_duration': 0,
                'current_streak': 0,
                'unique_modules': 0,
                'current_rank': self.rank_system[0],
                'badges': [],
                'weekly_xp': 0,
                'monthly_xp': 0
            }
    
    def _calculate_streak(self, sessions: List[Dict]) -> int:
        """Calculate the current training streak"""
        if not sessions:
            return 0
        
        # Sort sessions by date
        sorted_sessions = sorted(sessions, key=lambda x: x.get('created_at', ''), reverse=True)
        
        # Get unique training dates
        training_dates = set()
        for session in sorted_sessions:
            if session.get('created_at'):
                date_str = session['created_at'][:10]  # Get date part
                training_dates.add(date_str)
        
        if not training_dates:
            return 0
        
        # Check consecutive days
        sorted_dates = sorted(training_dates, reverse=True)
        streak = 0
        current_date = datetime.now().date()
        
        for date_str in sorted_dates:
            session_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            
            if streak == 0:
                # First session - check if it's today or yesterday
                if session_date == current_date or session_date == current_date - timedelta(days=1):
                    streak = 1
                    current_date = session_date
                else:
                    break
            else:
                # Check if this date is consecutive
                if session_date == current_date - timedelta(days=1):
                    streak += 1
                    current_date = session_date
                else:
                    break
        
        return streak
    
    def _get_rank_by_xp(self, xp: int) -> Dict:
        """Get rank based on XP"""
        for rank in self.rank_system:
            if rank['xp_range'][0] <= xp <= rank['xp_range'][1]:
                return rank
        return self.rank_system[0]
    
    def _get_user_badges(self, user_id: str, stats: Dict) -> List[Dict]:
        """Get user's badges with progress"""
        badges = []
        
        for badge_id, badge_def in self.badge_definitions.items():
            badge = badge_def.copy()
            badge['id'] = badge_id
            badge['unlocked'] = False
            badge['progress'] = 0
            
            req = badge_def['requirements']
            
            if req['type'] == 'calls':
                current_value = stats['total_calls']
            elif req['type'] == 'xp':
                current_value = stats['total_xp']
            elif req['type'] == 'streak':
                current_value = stats['current_streak']
            elif req['type'] == 'module':
                current_value = stats['unique_modules']
            elif req['type'] == 'score':
                # Check if any session has score >= 100
                current_value = max(((s.get('score') or 0) for s in stats['sessions']), default=0)
            elif req['type'] == 'duration':
                # Check if any session has duration <= 30
                min_duration = min(((s.get('duration') or float('inf')) for s in stats['sessions']), default=float('inf'))
                current_value = min_duration if min_duration != float('inf') else 0
            elif req['type'] == 'rank':
                current_value = self._get_user_rank_position(user_id)
            else:
                current_value = 0
            
            # Check if unlocked
            if req['operator'] == 'gte':
                badge['unlocked'] = current_value >= req['value']
                badge['progress'] = min(100, (current_value / req['value']) * 100)
            elif req['operator'] == 'lte':
                badge['unlocked'] = current_value <= req['value'] and current_value > 0
                badge['progress'] = 100 if badge['unlocked'] else 0
            elif req['operator'] == 'eq':
                badge['unlocked'] = current_value == req['value']
                badge['progress'] = 100 if badge['unlocked'] else 0
            
            badges.append(badge)
        
        return badges
    
    def _get_user_rank_position(self, user_id: str) -> int:
        """Get user's position in leaderboard"""
        try:
            result = supabase.table('training_leaderboard').select('*').order('xp', desc=True).execute()
            leaderboard = result.data or []
            
            for i, entry in enumerate(leaderboard):
                if entry.get('user_id') == user_id:
                    return i + 1
            
            return len(leaderboard) + 1
            
        except Exception as e:
            logger.exception(f"Error getting user rank position for {user_id}")
            return 999
    
    def _get_weekly_xp(self, user_id: str) -> int:
        """Get XP earned this week"""
        try:
            week_start = datetime.now() - timedelta(days=7)
            
            result = supabase.table('training_sessions').select('xp').eq('user_id', user_id).gte('created_at', week_start.isoformat()).execute()
            sessions = result.data or []
            
            return sum((s.get('xp') or 0) for s in sessions)
            
        except Exception as e:
            logger.exception(f"Error getting weekly XP for {user_id}")
            return 0
    
    def _get_monthly_xp(self, user_id: str) -> int:
        """Get XP earned this month"""
        try:
            month_start = datetime.now() - timedelta(days=30)
            
            result = supabase.table('training_sessions').select('xp').eq('user_id', user_id).gte('created_at', month_start.isoformat()).execute()
            sessions = result.data or []
            
            return sum((s.get('xp') or 0) for s in sessions)
            
        except Exception as e:
            logger.exception(f"Error getting monthly XP for {user_id}")
            return 0
    
    def get_weekly_challenges(self, user_id: str) -> List[Dict]:
        """Get current week's challenges for user"""
        try:
            # Get current week's challenges
            week_start = datetime.now() - timedelta(days=datetime.now().weekday())
            week_end = week_start + timedelta(days=6)
            
            challenges = [
                {
                    'id': 'weekly_calls',
                    'title': 'Call Champion',
                    'description': 'Complete 10 training calls this week',
                    'icon': 'target',
                    'type': 'calls',
                    'target': 10,
                    'xp_reward': 300,
                    'bonus_reward': 'Bronze Badge',
                    'difficulty': 'easy',
                    'starts_at': week_start.isoformat(),
                    'ends_at': week_end.isoformat()
                },
                {
                    'id': 'weekly_score',
                    'title': 'Excellence Streak',
                    'description': 'Achieve an average score of 80% or higher',
                    'icon': 'star',
                    'type': 'score',
                    'target': 80,
                    'xp_reward': 500,
                    'bonus_reward': 'Silver Badge',
                    'difficulty': 'medium',
                    'starts_at': week_start.isoformat(),
                    'ends_at': week_end.isoformat()
                },
                {
                    'id': 'weekly_streak',
                    'title': 'Consistency Master',
                    'description': 'Train for 5 consecutive days',
                    'icon': 'flame',
                    'type': 'streak',
                    'target': 5,
                    'xp_reward': 400,
                    'bonus_reward': 'Streak Badge',
                    'difficulty': 'medium',
                    'starts_at': week_start.isoformat(),
                    'ends_at': week_end.isoformat()
                }
            ]
            
            # Get user's progress for each challenge
            user_stats = self.get_user_stats(user_id)
            
            for challenge in challenges:
                if challenge['type'] == 'calls':
                    # Get this week's calls
                    week_calls = self._get_weekly_calls_count(user_id, week_start)
                    challenge['current_progress'] = week_calls
                elif challenge['type'] == 'score':
                    # Get this week's average score
                    week_avg_score = self._get_weekly_average_score(user_id, week_start)
                    challenge['current_progress'] = week_avg_score
                elif challenge['type'] == 'streak':
                    challenge['current_progress'] = user_stats['current_streak']
                
                challenge['completed'] = challenge['current_progress'] >= challenge['target']
            
            return challenges
            
        except Exception as e:
            logger.exception(f"Error getting weekly challenges for {user_id}")
            return []
    
    def _get_weekly_calls_count(self, user_id: str, week_start: datetime) -> int:
        """Get number of calls this week"""
        try:
            result = supabase.table('training_sessions').select('id').eq('user_id', user_id).gte('created_at', week_start.isoformat()).execute()
            return len(result.data or [])
        except Exception as e:
            logger.exception(f"Error getting weekly calls count for {user_id}")
            return 0
    
    def _get_weekly_average_score(self, user_id: str, week_start: datetime) -> float:
        """Get average score this week"""
        try:
            result = supabase.table('training_sessions').select('score').eq('user_id', user_id).gte('created_at', week_start.isoformat()).execute()
            sessions = result.data or []
            
            if not sessions:
                return 0
            
            scores = [(s.get('score') or 0) for s in sessions if (s.get('score') or 0) > 0]
            return sum(scores) / len(scores) if scores else 0
            
        except Exception as e:
            logger.exception(f"Error getting weekly average score for {user_id}")
            return 0
    
    def claim_challenge_reward(self, user_id: str, challenge_id: str) -> Dict:
        """Claim reward for completed challenge"""
        try:
            challenges = self.get_weekly_challenges(user_id)
            challenge = next((c for c in challenges if c['id'] == challenge_id), None)
            
            if not challenge:
                return {'success': False, 'message': 'Challenge not found'}
            
            if not challenge['completed']:
                return {'success': False, 'message': 'Challenge not completed'}
            
            # Award XP
            self._award_xp(user_id, challenge['xp_reward'])
            
            # Log the reward claim
            logger.info(f"User {user_id} claimed challenge {challenge_id} for {challenge['xp_reward']} XP")
            
            return {
                'success': True,
                'message': f"Claimed {challenge['xp_reward']} XP for {challenge['title']}",
                'xp_awarded': challenge['xp_reward']
            }
            
        except Exception as e:
            logger.exception(f"Error claiming challenge reward for {user_id}, challenge {challenge_id}")
            return {'success': False, 'message': 'Error claiming reward'}
    
    def _award_xp(self, user_id: str, xp_amount: int):
        """Award XP to user"""
        try:
            # Get current XP
            result = supabase.table('training_leaderboard').select('*').eq('user_id', user_id).execute()
            
            if result.data:
                # Update existing record
                current_xp = result.data[0].get('xp', 0)
                new_xp = current_xp + xp_amount
                
                supabase.table('training_leaderboard').update({
                    'xp': new_xp,
                    'updated_at': datetime.now().isoformat()
                }).eq('user_id', user_id).execute()
            else:
                # Create new record
                supabase.table('training_leaderboard').insert({
                    'user_id': user_id,
                    'xp': xp_amount,
                    'rank': 0,
                    'updated_at': datetime.now().isoformat()
                }).execute()
                
        except Exception as e:
            logger.exception(f"Error awarding XP to {user_id}")
    
    def get_enhanced_leaderboard(self) -> List[Dict]:
        """Get enhanced leaderboard with gamification data"""
        try:
            # Get base leaderboard data
            result = supabase.table('training_leaderboard').select('*').order('xp', desc=True).execute()
            leaderboard_data = result.data or []
            
            # Get users data
            user_ids = [entry['user_id'] for entry in leaderboard_data]
            if not user_ids:
                return []
            
            users_result = supabase.table('users').select('*').in_('id', user_ids).execute()
            users = {user['id']: user for user in users_result.data or []}
            
            # Enhance each entry
            enhanced_leaderboard = []
            for i, entry in enumerate(leaderboard_data):
                user_id = entry['user_id']
                user = users.get(user_id, {})
                
                # Get user stats
                user_stats = self.get_user_stats(user_id)
                
                enhanced_entry = {
                    'user_id': user_id,
                    'full_name': user.get('full_name', 'Unknown'),
                    'email': user.get('email', ''),
                    'total_xp': user_stats['total_xp'],
                    'average_score': user_stats['average_score'],
                    'total_sessions': user_stats['total_calls'],
                    'completed_sessions': user_stats['completed_calls'],
                    'pass_rate': (user_stats['completed_calls'] / user_stats['total_calls'] * 100) if user_stats['total_calls'] > 0 else 0,
                    'current_streak': user_stats['current_streak'],
                    'current_rank': user_stats['current_rank'],
                    'badges_count': len([b for b in user_stats['badges'] if b['unlocked']]),
                    'weekly_xp': user_stats['weekly_xp'],
                    'monthly_xp': user_stats['monthly_xp'],
                    'rank_position': i + 1,
                    'sentiment_breakdown': {
                        'positive': 0,  # Would need to calculate from sessions
                        'neutral': 0,
                        'negative': 0
                    },
                    'last_session': None  # Would need to get from sessions
                }
                
                enhanced_leaderboard.append(enhanced_entry)
            
            return enhanced_leaderboard
            
        except Exception as e:
            logger.exception("Error getting enhanced leaderboard")
            return []

# Global instance
gamification_service = GamificationService()