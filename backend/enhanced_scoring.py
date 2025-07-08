import re
from textblob import TextBlob
import logging

logger = logging.getLogger(__name__)

def advanced_score_call(transcript: str, duration: int, scenario_difficulty: int = 5) -> dict:
    """
    Advanced scoring system for training calls that evaluates multiple dimensions.
    
    Args:
        transcript: The conversation transcript
        duration: Call duration in seconds
        scenario_difficulty: Difficulty level of the scenario (1-10)
    
    Returns:
        dict: Comprehensive scoring breakdown
    """
    
    if not transcript.strip():
        return {
            "overall_score": 1,
            "breakdown": {
                "engagement": 0,
                "communication": 0,
                "problem_solving": 0,
                "professionalism": 0,
                "duration_factor": 0
            },
            "feedback": "No conversation detected. Please ensure your microphone is working.",
            "xp": 0
        }
    
    # Parse transcript into turns
    user_lines = []
    ai_lines = []
    
    lines = transcript.split('\n')
    for line in lines:
        line = line.strip()
        if line.startswith('User:'):
            user_lines.append(line[5:].strip())
        elif line.startswith('AI:'):
            ai_lines.append(line[3:].strip())
    
    total_turns = len(user_lines) + len(ai_lines)
    user_word_count = sum(len(line.split()) for line in user_lines)
    ai_word_count = sum(len(line.split()) for line in ai_lines)
    
    logger.info(f"📊 Transcript analysis: {len(user_lines)} user turns, {len(ai_lines)} AI turns")
    logger.info(f"📊 Word counts: User {user_word_count}, AI {ai_word_count}")
    
    # 1. ENGAGEMENT SCORE (0-10)
    engagement_score = calculate_engagement_score(user_lines, ai_lines, duration)
    
    # 2. COMMUNICATION QUALITY SCORE (0-10)
    communication_score = calculate_communication_score(user_lines, transcript)
    
    # 3. PROBLEM SOLVING SCORE (0-10)
    problem_solving_score = calculate_problem_solving_score(user_lines, ai_lines)
    
    # 4. PROFESSIONALISM SCORE (0-10)
    professionalism_score = calculate_professionalism_score(user_lines, transcript)
    
    # 5. DURATION FACTOR (0-10)
    duration_score = calculate_duration_score(duration, total_turns)
    
    # Calculate weighted overall score
    weights = {
        "engagement": 0.25,
        "communication": 0.25,
        "problem_solving": 0.25,
        "professionalism": 0.15,
        "duration_factor": 0.10
    }
    
    overall_score = (
        engagement_score * weights["engagement"] +
        communication_score * weights["communication"] +
        problem_solving_score * weights["problem_solving"] +
        professionalism_score * weights["professionalism"] +
        duration_score * weights["duration_factor"]
    )
    
    # Adjust for scenario difficulty
    difficulty_multiplier = 1.0 + (scenario_difficulty - 5) * 0.1  # ±50% based on difficulty
    overall_score = min(10, overall_score * difficulty_multiplier)
    
    # Round to 1 decimal place
    overall_score = round(overall_score, 1)
    
    # Generate feedback
    feedback = generate_detailed_feedback(
        overall_score, engagement_score, communication_score, 
        problem_solving_score, professionalism_score, duration_score,
        len(user_lines), duration
    )
    
    # Calculate XP with bonus system
    base_xp = int(overall_score * 10)
    bonus_xp = calculate_bonus_xp(overall_score, engagement_score, duration)
    total_xp = base_xp + bonus_xp
    
    breakdown = {
        "engagement": round(engagement_score, 1),
        "communication": round(communication_score, 1),
        "problem_solving": round(problem_solving_score, 1),
        "professionalism": round(professionalism_score, 1),
        "duration_factor": round(duration_score, 1)
    }
    
    logger.info(f"📊 Final scores: Overall {overall_score}, Breakdown {breakdown}")
    
    return {
        "overall_score": overall_score,
        "breakdown": breakdown,
        "feedback": feedback,
        "xp": total_xp,
        "bonus_xp": bonus_xp,
        "difficulty_adjusted": scenario_difficulty != 5
    }

def calculate_engagement_score(user_lines: list, ai_lines: list, duration: int) -> float:
    """Calculate engagement based on conversation flow and participation."""
    
    if not user_lines:
        return 0
    
    user_turns = len(user_lines)
    ai_turns = len(ai_lines)
    total_turns = user_turns + ai_turns
    
    # Base engagement on turn-taking balance
    if total_turns == 0:
        return 0
    
    user_participation = user_turns / total_turns
    
    # Ideal participation is around 40-60% user
    if 0.4 <= user_participation <= 0.6:
        participation_score = 10
    elif 0.2 <= user_participation <= 0.8:
        participation_score = 7
    else:
        participation_score = 4
    
    # Factor in conversation length
    if user_turns >= 5:
        length_bonus = 2
    elif user_turns >= 3:
        length_bonus = 1
    else:
        length_bonus = 0
    
    # Check for conversation depth (longer responses indicate engagement)
    avg_user_length = sum(len(line.split()) for line in user_lines) / len(user_lines)
    if avg_user_length >= 8:
        depth_bonus = 2
    elif avg_user_length >= 5:
        depth_bonus = 1
    else:
        depth_bonus = 0
    
    engagement = min(10, participation_score + length_bonus + depth_bonus)
    return engagement

def calculate_communication_score(user_lines: list, transcript: str) -> float:
    """Evaluate communication clarity and appropriateness."""
    
    if not user_lines:
        return 0
    
    score = 5  # Base score
    
    # Check for clear questions and responses
    question_indicators = ['?', 'what', 'how', 'when', 'where', 'why', 'could you', 'can you']
    has_questions = any(any(indicator in line.lower() for indicator in question_indicators) 
                       for line in user_lines)
    
    if has_questions:
        score += 2
    
    # Check for politeness indicators
    polite_phrases = ['please', 'thank you', 'thanks', 'appreciate', 'sorry', 'excuse me']
    politeness_count = sum(sum(phrase in line.lower() for phrase in polite_phrases) 
                          for line in user_lines)
    
    if politeness_count >= 2:
        score += 2
    elif politeness_count >= 1:
        score += 1
    
    # Check for grammar and spelling (basic check)
    total_words = sum(len(line.split()) for line in user_lines)
    if total_words >= 10:
        # Use TextBlob for basic grammar analysis
        blob = TextBlob(' '.join(user_lines))
        # Simple heuristic: if polarity is not extreme, assume decent grammar
        if -0.5 <= blob.sentiment.polarity <= 0.5:
            score += 1
    
    return min(10, score)

def calculate_problem_solving_score(user_lines: list, ai_lines: list) -> float:
    """Evaluate problem-solving approach and information gathering."""
    
    if not user_lines:
        return 0
    
    score = 4  # Base score
    
    # Check for follow-up questions
    follow_up_indicators = ['also', 'additionally', 'what about', 'and', 'furthermore']
    has_follow_ups = any(any(indicator in line.lower() for indicator in follow_up_indicators) 
                        for line in user_lines)
    
    if has_follow_ups:
        score += 2
    
    # Check for specific information requests
    specific_indicators = ['specific', 'exactly', 'precisely', 'details', 'information']
    requests_specifics = any(any(indicator in line.lower() for indicator in specific_indicators) 
                           for line in user_lines)
    
    if requests_specifics:
        score += 2
    
    # Check for confirmation or understanding
    confirm_indicators = ['understand', 'got it', 'i see', 'clear', 'makes sense']
    shows_understanding = any(any(indicator in line.lower() for indicator in confirm_indicators) 
                            for line in user_lines)
    
    if shows_understanding:
        score += 2
    
    return min(10, score)

def calculate_professionalism_score(user_lines: list, transcript: str) -> float:
    """Evaluate professional communication style."""
    
    if not user_lines:
        return 5  # Neutral score
    
    score = 6  # Base professional score
    
    # Check for inappropriate language (basic filter)
    inappropriate_words = ['damn', 'hell', 'stupid', 'idiot', 'crap']
    has_inappropriate = any(any(word in line.lower() for word in inappropriate_words) 
                          for line in user_lines)
    
    if has_inappropriate:
        score -= 3
    
    # Check for professional tone indicators
    professional_phrases = ['could you help', 'i would like', 'may i', 'would it be possible']
    uses_professional_tone = any(any(phrase in line.lower() for phrase in professional_phrases) 
                               for line in user_lines)
    
    if uses_professional_tone:
        score += 2
    
    # Check for complete sentences (not just single words)
    avg_words_per_line = sum(len(line.split()) for line in user_lines) / len(user_lines)
    if avg_words_per_line >= 4:
        score += 1
    
    return min(10, max(0, score))

def calculate_duration_score(duration: int, total_turns: int) -> float:
    """Score based on appropriate call duration and pacing."""
    
    if duration <= 0:
        return 0
    
    # Ideal duration is 30-120 seconds for training calls
    if 30 <= duration <= 120:
        duration_score = 8
    elif 15 <= duration <= 180:
        duration_score = 6
    elif 10 <= duration <= 300:
        duration_score = 4
    else:
        duration_score = 2
    
    # Factor in pacing (turns per minute)
    if total_turns > 0 and duration > 0:
        turns_per_minute = (total_turns / duration) * 60
        if 2 <= turns_per_minute <= 8:  # Good pacing
            duration_score += 2
        elif 1 <= turns_per_minute <= 12:  # Acceptable pacing
            duration_score += 1
    
    return min(10, duration_score)

def calculate_bonus_xp(overall_score: float, engagement_score: float, duration: int) -> int:
    """Calculate bonus XP for exceptional performance."""
    
    bonus = 0
    
    # Excellence bonus
    if overall_score >= 9:
        bonus += 25
    elif overall_score >= 8:
        bonus += 15
    elif overall_score >= 7:
        bonus += 10
    
    # High engagement bonus
    if engagement_score >= 9:
        bonus += 10
    
    # Sustained conversation bonus
    if duration >= 60:
        bonus += 5
    
    return bonus

def generate_detailed_feedback(overall_score: float, engagement: float, communication: float, 
                             problem_solving: float, professionalism: float, duration: float,
                             user_turns: int, call_duration: int) -> str:
    """Generate personalized feedback based on performance."""
    
    feedback_parts = []
    
    # Overall performance
    if overall_score >= 8:
        feedback_parts.append("🎉 Excellent training session! You demonstrated strong communication skills.")
    elif overall_score >= 6:
        feedback_parts.append("👍 Good performance overall with room for improvement in some areas.")
    elif overall_score >= 4:
        feedback_parts.append("📈 Decent effort, but several areas need attention.")
    else:
        feedback_parts.append("📚 This session shows significant opportunities for improvement.")
    
    # Specific feedback based on lowest scores
    scores = {
        "engagement": engagement,
        "communication": communication,
        "problem_solving": problem_solving,
        "professionalism": professionalism
    }
    
    lowest_area = min(scores, key=scores.get)
    lowest_score = scores[lowest_area]
    
    if lowest_score < 6:
        if lowest_area == "engagement":
            feedback_parts.append("💡 Try to participate more actively in the conversation with follow-up questions.")
        elif lowest_area == "communication":
            feedback_parts.append("💡 Focus on clearer communication and using polite language.")
        elif lowest_area == "problem_solving":
            feedback_parts.append("💡 Ask more specific questions to gather detailed information.")
        elif lowest_area == "professionalism":
            feedback_parts.append("💡 Maintain a professional tone throughout the conversation.")
    
    # Duration feedback
    if call_duration < 20:
        feedback_parts.append("⏱️ Try to engage in longer conversations to practice more scenarios.")
    elif call_duration > 180:
        feedback_parts.append("⏱️ Good sustained practice! Consider wrapping up efficiently when objectives are met.")
    
    # Encouragement
    if user_turns >= 5:
        feedback_parts.append("✨ Great job maintaining an active conversation!")
    
    return " ".join(feedback_parts)

# Update the main scoring function in your API
def score_call_enhanced(transcript: str, duration: int, scenario_difficulty: int = 5) -> dict:
    """
    Enhanced scoring function to replace the simple score_call function.
    """
    try:
        result = advanced_score_call(transcript, duration, scenario_difficulty)
        
        logger.info(f"📊 Enhanced scoring complete: {result['overall_score']}/10")
        logger.info(f"📊 XP awarded: {result['xp']} (base: {result['overall_score']*10}, bonus: {result.get('bonus_xp', 0)})")
        
        return result
        
    except Exception as e:
        logger.exception("❌ Error in enhanced scoring, falling back to simple scoring")
        
        # Fallback to simple scoring
        simple_score = score_call(transcript, duration)
        return {
            "overall_score": simple_score,
            "breakdown": {"simple": simple_score},
            "feedback": "Training session completed. Analysis temporarily unavailable.",
            "xp": simple_score * 10,
            "bonus_xp": 0
        }