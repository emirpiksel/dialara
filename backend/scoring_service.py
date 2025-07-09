"""
Scoring service for training call analysis and evaluation.
Provides enhanced scoring with detailed feedback and XP calculation.
"""

from textblob import TextBlob
import logging
from config import get_config

logger = logging.getLogger(__name__)
config = get_config()


def score_call_enhanced(transcript: str, duration: int, difficulty: int = 5) -> dict:
    """
    Enhanced scoring system that provides detailed feedback and scoring breakdown
    """
    try:
        if not transcript or not transcript.strip():
            return {
                "overall_score": 1,
                "xp": 10,
                "bonus_xp": 0,
                "feedback": "No meaningful conversation detected. Try engaging more actively with the scenario.",
                "breakdown": {"engagement": 0, "communication": 0, "problem_solving": 0, "professionalism": 0, "duration_factor": 0}
            }

        # Parse conversation
        lines = [line.strip() for line in transcript.split('\n') if line.strip()]
        user_lines = [line for line in lines if line.startswith('User:')]
        ai_lines = [line for line in lines if line.startswith('AI:') or line.startswith('Assistant:')]
        
        user_count = len(user_lines)
        ai_count = len(ai_lines)
        total_exchanges = user_count + ai_count
        
        # Calculate metrics
        user_text = ' '.join([line.replace('User:', '').strip() for line in user_lines])
        user_word_count = len(user_text.split()) if user_text else 0
        
        # 1. Engagement Score (0-10)
        if user_count == 0:
            engagement_score = 0
        elif user_count < 3:
            engagement_score = 3
        elif user_count < 5:
            engagement_score = 6
        elif user_count < 8:
            engagement_score = 8
        else:
            engagement_score = 10
            
        # 2. Communication Quality Score (0-10)
        avg_user_words = user_word_count / user_count if user_count > 0 else 0
        if avg_user_words < 2:
            communication_score = 2
        elif avg_user_words < 5:
            communication_score = 5
        elif avg_user_words < 10:
            communication_score = 7
        elif avg_user_words < 15:
            communication_score = 9
        else:
            communication_score = 10
            
        # 3. Problem-solving Score (0-10) - based on conversation depth
        conversation_depth = min(user_count, ai_count)
        if conversation_depth <= 1:
            problem_solving_score = 2
        elif conversation_depth <= 3:
            problem_solving_score = 4
        elif conversation_depth <= 5:
            problem_solving_score = 6
        elif conversation_depth <= 7:
            problem_solving_score = 8
        else:
            problem_solving_score = 10
            
        # 4. Professionalism Score (0-10) - sentiment and tone analysis
        try:
            sentiment = TextBlob(user_text).sentiment.polarity if user_text else 0
            if sentiment >= 0.1:
                professionalism_score = 10
            elif sentiment >= -0.1:
                professionalism_score = 8
            elif sentiment >= -0.3:
                professionalism_score = 6
            else:
                professionalism_score = 4
                
            # Check for profanity or inappropriate language (basic check)
            if any(word in user_text.lower() for word in config.scoring.inappropriate_words):
                professionalism_score = max(0, professionalism_score - 3)
                
        except:
            professionalism_score = 7  # Default if sentiment analysis fails
            
        # 5. Duration Factor (0-10)
        if duration < config.scoring.duration_very_short:
            duration_factor = 2
        elif duration < config.scoring.duration_short:
            duration_factor = 5
        elif duration < config.scoring.duration_medium:
            duration_factor = 8
        elif duration < config.scoring.duration_very_long:
            duration_factor = 10
        else:
            duration_factor = 9  # Slight penalty for very long calls
            
        # Calculate weighted overall score
        weights = {
            'engagement': config.scoring.engagement_weight,
            'communication': config.scoring.communication_weight, 
            'problem_solving': config.scoring.problem_solving_weight,
            'professionalism': config.scoring.professionalism_weight,
            'duration_factor': config.scoring.duration_factor_weight
        }
        
        scores = {
            'engagement': engagement_score,
            'communication': communication_score,
            'problem_solving': problem_solving_score,
            'professionalism': professionalism_score,
            'duration_factor': duration_factor
        }
        
        # Calculate overall score (0-10)
        overall_score = sum(scores[key] * weights[key] for key in weights)
        overall_score = round(overall_score, 1)
        
        # Adjust for difficulty
        difficulty_multiplier = config.scoring.difficulty_min_multiplier + (difficulty * config.scoring.difficulty_step)
        overall_score = min(10, overall_score * difficulty_multiplier)
        overall_score = round(overall_score, 1)
        
        # Calculate XP (base 10-100, with bonuses)
        base_xp = int(overall_score * config.scoring.base_xp_multiplier)
        
        # Bonus XP calculations
        bonus_xp = 0
        bonus_reasons = []
        
        # Perfect score bonus
        if overall_score >= config.scoring.perfect_score_threshold:
            bonus_xp += config.scoring.perfect_score_bonus
            bonus_reasons.append("Perfect performance")
            
        # High engagement bonus
        if user_count >= config.scoring.high_engagement_threshold:
            bonus_xp += config.scoring.high_engagement_bonus
            bonus_reasons.append("High engagement")
            
        # Long conversation bonus
        if duration >= config.scoring.long_conversation_threshold:
            bonus_xp += config.scoring.long_conversation_bonus
            bonus_reasons.append("Thorough conversation")
            
        # Difficulty bonus
        if difficulty >= config.scoring.high_difficulty_threshold:
            bonus_xp += config.scoring.high_difficulty_bonus
            bonus_reasons.append("High difficulty scenario")
            
        total_xp = base_xp + bonus_xp
        
        # Generate detailed feedback
        feedback_parts = []
        
        if overall_score >= 8.5:
            feedback_parts.append("🌟 Excellent performance! You demonstrated strong communication skills.")
        elif overall_score >= 7:
            feedback_parts.append("👍 Good job! You handled the scenario well with room for minor improvements.")
        elif overall_score >= 5:
            feedback_parts.append("📈 Decent effort, but several areas need attention.")
        else:
            feedback_parts.append("📚 This scenario needs more practice. Focus on the feedback below.")
            
        # Specific feedback based on scores
        if engagement_score < 7:
            feedback_parts.append("💡 Increase engagement by asking more questions and providing detailed responses.")
            
        if communication_score < 7:
            feedback_parts.append("🗣️ Work on communication clarity - provide more detailed and thoughtful responses.")
            
        if problem_solving_score < 7:
            feedback_parts.append("🧠 Enhance problem-solving by exploring the scenario more deeply and asking follow-up questions.")
            
        if professionalism_score < 7:
            feedback_parts.append("👔 Maintain professional tone and positive language throughout the conversation.")
            
        if duration_factor < 7:
            if duration < config.scoring.duration_short:
                feedback_parts.append("⏱️ Try to engage longer with the scenario to fully explore the situation.")
            else:
                feedback_parts.append("⏱️ Aim for more efficient conversations while maintaining quality.")
                
        # Add bonus achievements
        if bonus_reasons:
            feedback_parts.append(f"🎉 Bonus achievements: {', '.join(bonus_reasons)}")
            
        feedback = " ".join(feedback_parts)
        
        return {
            "overall_score": overall_score,  # Keep the precise float score
            "database_score": int(round(overall_score)),  # Integer version for database
            "xp": total_xp,
            "bonus_xp": bonus_xp,
            "feedback": feedback,
            "breakdown": scores
        }
        
    except Exception as e:
        logger.exception("❌ Enhanced scoring failed")
        # Fallback to simple scoring
        simple_score = score_call(transcript, duration)
        return {
            "overall_score": simple_score,
            "xp": simple_score * 10,
            "bonus_xp": 0,
            "feedback": "Training session completed. Scoring analysis encountered an issue but basic evaluation was performed.",
            "breakdown": {"simple_fallback": simple_score}
        }


def score_call(transcript: str, duration: int) -> int:
    """Simple fallback scoring function"""
    if not transcript.strip():
        return 1
    user_turns = sum(1 for line in transcript.split("\n") if line.startswith("User:"))
    ai_turns = sum(1 for line in transcript.split("\n") if line.startswith("AI:"))
    total_turns = user_turns + ai_turns
    if user_turns == 0:
        return 1
    engagement_ratio = user_turns / total_turns if total_turns > 0 else 0
    duration_score = min(5, duration // 10)
    base_score = int(engagement_ratio * 10)
    final_score = min(10, base_score + duration_score)
    return max(2, final_score)


def analyze_sentiment(transcript: str) -> str:
    """Analyze sentiment of the transcript"""
    if not transcript.strip():
        return "neutral"
    try:
        polarity = TextBlob(transcript).sentiment.polarity
        if polarity > 0.2:
            return "positive"
        elif polarity < -0.2:
            return "negative"
        return "neutral"
    except:
        return "neutral"