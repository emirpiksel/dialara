"""
Advanced AI-powered call analysis and scoring system
"""
import re
import json
import logging
from typing import Dict, List, Tuple, Optional
from textblob import TextBlob
from datetime import datetime
from enhanced_scoring import advanced_score_call

logger = logging.getLogger(__name__)

class AICallAnalyzer:
    
    def __init__(self):
        self.conversation_patterns = {
            'greeting': [
                r'hello|hi|good morning|good afternoon|good evening',
                r'how are you|nice to meet you|pleasure to speak'
            ],
            'questioning': [
                r'\?',
                r'what|how|when|where|why|could you|can you|would you',
                r'tell me about|explain|describe'
            ],
            'objection_handling': [
                r'but|however|although|actually|unfortunately',
                r'i understand|i see|that\'s a valid concern|let me address that',
                r'price|cost|expensive|budget|afford'
            ],
            'empathy': [
                r'i understand|i see|that makes sense|i hear you',
                r'i\'m sorry|apologize|that must be frustrating',
                r'i can imagine|i appreciate|thank you for sharing'
            ],
            'closing': [
                r'thank you|thanks|appreciate|pleasure',
                r'goodbye|bye|have a great|take care',
                r'next steps|follow up|contact|schedule'
            ],
            'professionalism': [
                r'please|may i|would you mind|if you don\'t mind',
                r'certainly|absolutely|of course|definitely',
                r'professional|business|company|service'
            ],
            'product_knowledge': [
                r'features|benefits|specifications|details',
                r'how it works|what it does|designed for',
                r'compared to|different from|similar to'
            ],
            'rapport_building': [
                r'that\'s interesting|really|wow|amazing',
                r'i love|i enjoy|that\'s great|excellent',
                r'family|personal|experience|background'
            ]
        }
        
        self.negative_indicators = [
            r'damn|hell|stupid|idiot|crap|shut up',
            r'whatever|don\'t care|boring|waste of time',
            r'angry|frustrated|annoyed|irritated'
        ]
        
        self.positive_indicators = [
            r'excellent|outstanding|perfect|amazing|wonderful',
            r'love|enjoy|appreciate|grateful|thankful',
            r'impressed|satisfied|happy|pleased|delighted'
        ]
    
    def analyze_call_comprehensive(self, transcript: str, duration: int, 
                                 scenario_difficulty: int = 5, 
                                 training_objectives: List[str] = None) -> Dict:
        """
        Comprehensive AI-powered call analysis with detailed scoring
        """
        try:
            # Get base scoring from enhanced_scoring
            base_analysis = advanced_score_call(transcript, duration, scenario_difficulty)
            
            # Parse conversation structure
            conversation_analysis = self._analyze_conversation_structure(transcript)
            
            # Analyze communication patterns
            pattern_analysis = self._analyze_communication_patterns(transcript)
            
            # Analyze sentiment flow
            sentiment_analysis = self._analyze_sentiment_flow(transcript)
            
            # Analyze objection handling
            objection_analysis = self._analyze_objection_handling(transcript)
            
            # Analyze rapport building
            rapport_analysis = self._analyze_rapport_building(transcript)
            
            # Generate insights and recommendations
            insights = self._generate_insights(
                conversation_analysis, 
                pattern_analysis, 
                sentiment_analysis,
                objection_analysis,
                rapport_analysis
            )
            
            # Calculate enhanced scores
            enhanced_scores = self._calculate_enhanced_scores(
                base_analysis,
                conversation_analysis,
                pattern_analysis,
                sentiment_analysis,
                objection_analysis,
                rapport_analysis
            )
            
            # Generate AI recommendations
            recommendations = self._generate_ai_recommendations(
                enhanced_scores,
                pattern_analysis,
                training_objectives or []
            )
            
            return {
                'overall_score': enhanced_scores['overall_score'],
                'base_analysis': base_analysis,
                'conversation_structure': conversation_analysis,
                'communication_patterns': pattern_analysis,
                'sentiment_flow': sentiment_analysis,
                'objection_handling': objection_analysis,
                'rapport_building': rapport_analysis,
                'enhanced_scores': enhanced_scores,
                'insights': insights,
                'recommendations': recommendations,
                'analysis_timestamp': datetime.now().isoformat(),
                'ai_confidence': self._calculate_confidence_score(transcript, duration)
            }
            
        except Exception as e:
            logger.exception("Error in comprehensive call analysis")
            return {
                'overall_score': 5,
                'error': str(e),
                'fallback_analysis': advanced_score_call(transcript, duration, scenario_difficulty)
            }
    
    def _analyze_conversation_structure(self, transcript: str) -> Dict:
        """Analyze the structure and flow of the conversation"""
        lines = transcript.split('\n')
        user_turns = []
        ai_turns = []
        
        for line in lines:
            line = line.strip()
            if line.startswith('User:'):
                user_turns.append(line[5:].strip())
            elif line.startswith('AI:'):
                ai_turns.append(line[3:].strip())
        
        # Analyze turn-taking patterns
        total_turns = len(user_turns) + len(ai_turns)
        user_word_count = sum(len(turn.split()) for turn in user_turns)
        ai_word_count = sum(len(turn.split()) for turn in ai_turns)
        
        # Analyze conversation phases
        phases = self._identify_conversation_phases(user_turns, ai_turns)
        
        return {
            'total_turns': total_turns,
            'user_turns': len(user_turns),
            'ai_turns': len(ai_turns),
            'user_word_count': user_word_count,
            'ai_word_count': ai_word_count,
            'average_user_turn_length': user_word_count / len(user_turns) if user_turns else 0,
            'average_ai_turn_length': ai_word_count / len(ai_turns) if ai_turns else 0,
            'conversation_balance': len(user_turns) / total_turns if total_turns > 0 else 0,
            'phases': phases,
            'conversation_flow_score': self._calculate_flow_score(phases)
        }
    
    def _identify_conversation_phases(self, user_turns: List[str], ai_turns: List[str]) -> Dict:
        """Identify different phases of the conversation"""
        all_turns = []
        
        # Combine and order turns (simplified - assumes alternating)
        for i in range(max(len(user_turns), len(ai_turns))):
            if i < len(user_turns):
                all_turns.append(('user', user_turns[i]))
            if i < len(ai_turns):
                all_turns.append(('ai', ai_turns[i]))
        
        phases = {
            'opening': {'present': False, 'quality': 0},
            'discovery': {'present': False, 'quality': 0},
            'presentation': {'present': False, 'quality': 0},
            'objection_handling': {'present': False, 'quality': 0},
            'closing': {'present': False, 'quality': 0}
        }
        
        # Simple phase detection based on patterns
        for i, (speaker, turn) in enumerate(all_turns):
            if speaker == 'user':
                # Opening phase detection
                if i < 3 and any(re.search(pattern, turn.lower()) for pattern in self.conversation_patterns['greeting']):
                    phases['opening']['present'] = True
                    phases['opening']['quality'] = min(10, phases['opening']['quality'] + 3)
                
                # Discovery phase detection
                if any(re.search(pattern, turn.lower()) for pattern in self.conversation_patterns['questioning']):
                    phases['discovery']['present'] = True
                    phases['discovery']['quality'] = min(10, phases['discovery']['quality'] + 2)
                
                # Objection handling detection
                if any(re.search(pattern, turn.lower()) for pattern in self.conversation_patterns['objection_handling']):
                    phases['objection_handling']['present'] = True
                    phases['objection_handling']['quality'] = min(10, phases['objection_handling']['quality'] + 3)
                
                # Closing phase detection
                if i > len(all_turns) - 4 and any(re.search(pattern, turn.lower()) for pattern in self.conversation_patterns['closing']):
                    phases['closing']['present'] = True
                    phases['closing']['quality'] = min(10, phases['closing']['quality'] + 3)
        
        return phases
    
    def _analyze_communication_patterns(self, transcript: str) -> Dict:
        """Analyze communication patterns and techniques"""
        user_content = ' '.join([line[5:].strip() for line in transcript.split('\n') if line.startswith('User:')])
        
        pattern_scores = {}
        for pattern_name, patterns in self.conversation_patterns.items():
            matches = 0
            for pattern in patterns:
                matches += len(re.findall(pattern, user_content.lower()))
            
            pattern_scores[pattern_name] = {
                'matches': matches,
                'score': min(10, matches * 2)  # Cap at 10
            }
        
        return {
            'pattern_scores': pattern_scores,
            'overall_communication_score': sum(score['score'] for score in pattern_scores.values()) / len(pattern_scores),
            'strongest_patterns': sorted(pattern_scores.items(), key=lambda x: x[1]['score'], reverse=True)[:3],
            'improvement_areas': sorted(pattern_scores.items(), key=lambda x: x[1]['score'])[:3]
        }
    
    def _analyze_sentiment_flow(self, transcript: str) -> Dict:
        """Analyze sentiment changes throughout the conversation"""
        lines = transcript.split('\n')
        user_turns = [line[5:].strip() for line in lines if line.startswith('User:')]
        ai_turns = [line[3:].strip() for line in lines if line.startswith('AI:')]
        
        user_sentiments = []
        ai_sentiments = []
        
        for turn in user_turns:
            if turn.strip():
                blob = TextBlob(turn)
                user_sentiments.append({
                    'polarity': blob.sentiment.polarity,
                    'subjectivity': blob.sentiment.subjectivity,
                    'text': turn[:50] + '...' if len(turn) > 50 else turn
                })
        
        for turn in ai_turns:
            if turn.strip():
                blob = TextBlob(turn)
                ai_sentiments.append({
                    'polarity': blob.sentiment.polarity,
                    'subjectivity': blob.sentiment.subjectivity,
                    'text': turn[:50] + '...' if len(turn) > 50 else turn
                })
        
        # Calculate sentiment trends
        user_sentiment_trend = self._calculate_sentiment_trend(user_sentiments)
        ai_sentiment_trend = self._calculate_sentiment_trend(ai_sentiments)
        
        return {
            'user_sentiments': user_sentiments,
            'ai_sentiments': ai_sentiments,
            'user_sentiment_trend': user_sentiment_trend,
            'ai_sentiment_trend': ai_sentiment_trend,
            'sentiment_alignment': self._calculate_sentiment_alignment(user_sentiments, ai_sentiments),
            'overall_sentiment_score': self._calculate_overall_sentiment_score(user_sentiments)
        }
    
    def _analyze_objection_handling(self, transcript: str) -> Dict:
        """Analyze objection handling capabilities"""
        lines = transcript.split('\n')
        user_turns = [line[5:].strip() for line in lines if line.startswith('User:')]
        ai_turns = [line[3:].strip() for line in lines if line.startswith('AI:')]
        
        objections_detected = []
        objection_responses = []
        
        for i, turn in enumerate(user_turns):
            # Look for objection indicators
            if any(re.search(pattern, turn.lower()) for pattern in self.conversation_patterns['objection_handling']):
                objections_detected.append({
                    'turn_index': i,
                    'objection_text': turn,
                    'objection_type': self._classify_objection_type(turn),
                    'response_quality': 0
                })
                
                # Check corresponding AI response
                if i < len(ai_turns):
                    response = ai_turns[i]
                    response_quality = self._evaluate_objection_response(turn, response)
                    objections_detected[-1]['response_quality'] = response_quality
                    objection_responses.append({
                        'response_text': response,
                        'quality_score': response_quality
                    })
        
        return {
            'objections_count': len(objections_detected),
            'objections_detected': objections_detected,
            'objection_responses': objection_responses,
            'average_response_quality': sum(obj['response_quality'] for obj in objections_detected) / len(objections_detected) if objections_detected else 0,
            'objection_handling_score': self._calculate_objection_handling_score(objections_detected)
        }
    
    def _analyze_rapport_building(self, transcript: str) -> Dict:
        """Analyze rapport building techniques"""
        user_content = ' '.join([line[5:].strip() for line in transcript.split('\n') if line.startswith('User:')])
        
        rapport_indicators = {
            'empathy_expressions': 0,
            'personal_connections': 0,
            'positive_language': 0,
            'active_listening': 0,
            'mirroring': 0
        }
        
        # Count empathy expressions
        for pattern in self.conversation_patterns['empathy']:
            rapport_indicators['empathy_expressions'] += len(re.findall(pattern, user_content.lower()))
        
        # Count rapport building patterns
        for pattern in self.conversation_patterns['rapport_building']:
            rapport_indicators['personal_connections'] += len(re.findall(pattern, user_content.lower()))
        
        # Count positive language
        for pattern in self.positive_indicators:
            rapport_indicators['positive_language'] += len(re.findall(pattern, user_content.lower()))
        
        # Simple active listening detection (questions and acknowledgments)
        rapport_indicators['active_listening'] = user_content.count('?') + user_content.lower().count('i see') + user_content.lower().count('tell me')
        
        rapport_score = sum(min(score * 2, 10) for score in rapport_indicators.values()) / len(rapport_indicators)
        
        return {
            'rapport_indicators': rapport_indicators,
            'rapport_score': rapport_score,
            'rapport_techniques_used': [key for key, value in rapport_indicators.items() if value > 0],
            'rapport_improvement_areas': [key for key, value in rapport_indicators.items() if value == 0]
        }
    
    def _calculate_enhanced_scores(self, base_analysis: Dict, conversation_analysis: Dict, 
                                 pattern_analysis: Dict, sentiment_analysis: Dict,
                                 objection_analysis: Dict, rapport_analysis: Dict) -> Dict:
        """Calculate enhanced scores combining all analysis components"""
        
        # Weight different components
        weights = {
            'base_score': 0.3,
            'conversation_structure': 0.15,
            'communication_patterns': 0.2,
            'sentiment_flow': 0.1,
            'objection_handling': 0.15,
            'rapport_building': 0.1
        }
        
        component_scores = {
            'base_score': base_analysis.get('overall_score', 5),
            'conversation_structure': conversation_analysis.get('conversation_flow_score', 5),
            'communication_patterns': pattern_analysis.get('overall_communication_score', 5),
            'sentiment_flow': sentiment_analysis.get('overall_sentiment_score', 5),
            'objection_handling': objection_analysis.get('objection_handling_score', 5),
            'rapport_building': rapport_analysis.get('rapport_score', 5)
        }
        
        # Calculate weighted overall score
        overall_score = sum(component_scores[component] * weights[component] 
                          for component in component_scores)
        
        return {
            'overall_score': round(overall_score, 2),
            'component_scores': component_scores,
            'weights': weights,
            'grade': self._calculate_grade(overall_score),
            'performance_level': self._calculate_performance_level(overall_score)
        }
    
    def _generate_insights(self, conversation_analysis: Dict, pattern_analysis: Dict,
                          sentiment_analysis: Dict, objection_analysis: Dict,
                          rapport_analysis: Dict) -> List[Dict]:
        """Generate AI insights based on analysis"""
        insights = []
        
        # Conversation structure insights
        if conversation_analysis.get('conversation_balance', 0) < 0.3:
            insights.append({
                'type': 'conversation_structure',
                'severity': 'high',
                'title': 'Low Participation',
                'description': 'You participated less than 30% of the conversation. Try to be more active.',
                'recommendation': 'Ask more questions and engage more actively in the discussion.'
            })
        
        # Communication pattern insights
        strongest_patterns = pattern_analysis.get('strongest_patterns', [])
        if strongest_patterns:
            insights.append({
                'type': 'communication_patterns',
                'severity': 'positive',
                'title': f'Strong {strongest_patterns[0][0].replace("_", " ").title()}',
                'description': f'You demonstrated excellent {strongest_patterns[0][0].replace("_", " ")} skills.',
                'recommendation': 'Continue leveraging this strength in future conversations.'
            })
        
        # Sentiment insights
        if sentiment_analysis.get('overall_sentiment_score', 5) < 4:
            insights.append({
                'type': 'sentiment',
                'severity': 'medium',
                'title': 'Negative Sentiment Detected',
                'description': 'The overall sentiment of your conversation was somewhat negative.',
                'recommendation': 'Focus on using more positive language and maintaining enthusiasm.'
            })
        
        # Objection handling insights
        if objection_analysis.get('objections_count', 0) > 0:
            avg_response_quality = objection_analysis.get('average_response_quality', 0)
            if avg_response_quality > 7:
                insights.append({
                    'type': 'objection_handling',
                    'severity': 'positive',
                    'title': 'Excellent Objection Handling',
                    'description': 'You handled objections very well with thoughtful responses.',
                    'recommendation': 'Your objection handling skills are a strong asset.'
                })
            elif avg_response_quality < 5:
                insights.append({
                    'type': 'objection_handling',
                    'severity': 'high',
                    'title': 'Improve Objection Handling',
                    'description': 'Your responses to objections could be more effective.',
                    'recommendation': 'Practice addressing concerns with empathy and clear explanations.'
                })
        
        return insights
    
    def _generate_ai_recommendations(self, enhanced_scores: Dict, pattern_analysis: Dict,
                                   training_objectives: List[str]) -> List[Dict]:
        """Generate AI-powered recommendations for improvement"""
        recommendations = []
        
        component_scores = enhanced_scores.get('component_scores', {})
        
        # Find areas for improvement
        improvement_areas = sorted(component_scores.items(), key=lambda x: x[1])[:2]
        
        for area, score in improvement_areas:
            if score < 6:
                recommendations.append({
                    'area': area,
                    'current_score': score,
                    'priority': 'high' if score < 4 else 'medium',
                    'recommendation': self._get_area_specific_recommendation(area, score),
                    'practice_exercises': self._get_practice_exercises(area),
                    'resources': self._get_learning_resources(area)
                })
        
        # Add specific recommendations based on patterns
        improvement_patterns = pattern_analysis.get('improvement_areas', [])
        for pattern_name, pattern_data in improvement_patterns:
            if pattern_data['score'] < 3:
                recommendations.append({
                    'area': f'communication_{pattern_name}',
                    'current_score': pattern_data['score'],
                    'priority': 'medium',
                    'recommendation': f'Focus on improving your {pattern_name.replace("_", " ")} skills.',
                    'practice_exercises': self._get_pattern_exercises(pattern_name),
                    'resources': []
                })
        
        return recommendations
    
    def _calculate_confidence_score(self, transcript: str, duration: int) -> float:
        """Calculate confidence score for the AI analysis"""
        factors = []
        
        # Transcript length factor
        transcript_length = len(transcript.strip())
        if transcript_length > 500:
            factors.append(0.9)
        elif transcript_length > 200:
            factors.append(0.7)
        else:
            factors.append(0.5)
        
        # Duration factor
        if duration > 60:
            factors.append(0.9)
        elif duration > 30:
            factors.append(0.7)
        else:
            factors.append(0.5)
        
        # Conversation complexity factor
        user_lines = [line for line in transcript.split('\n') if line.startswith('User:')]
        if len(user_lines) > 5:
            factors.append(0.8)
        elif len(user_lines) > 2:
            factors.append(0.6)
        else:
            factors.append(0.4)
        
        return sum(factors) / len(factors)
    
    def _calculate_flow_score(self, phases: Dict) -> float:
        """Calculate conversation flow score"""
        present_phases = sum(1 for phase in phases.values() if phase['present'])
        quality_sum = sum(phase['quality'] for phase in phases.values())
        
        return (present_phases * 2 + quality_sum / 10) / 2
    
    def _calculate_sentiment_trend(self, sentiments: List[Dict]) -> str:
        """Calculate sentiment trend (improving, declining, stable)"""
        if len(sentiments) < 2:
            return 'stable'
        
        first_half = sentiments[:len(sentiments)//2]
        second_half = sentiments[len(sentiments)//2:]
        
        first_avg = sum(s['polarity'] for s in first_half) / len(first_half)
        second_avg = sum(s['polarity'] for s in second_half) / len(second_half)
        
        if second_avg > first_avg + 0.1:
            return 'improving'
        elif second_avg < first_avg - 0.1:
            return 'declining'
        else:
            return 'stable'
    
    def _calculate_sentiment_alignment(self, user_sentiments: List[Dict], ai_sentiments: List[Dict]) -> float:
        """Calculate sentiment alignment between user and AI"""
        if not user_sentiments or not ai_sentiments:
            return 0.5
        
        user_avg = sum(s['polarity'] for s in user_sentiments) / len(user_sentiments)
        ai_avg = sum(s['polarity'] for s in ai_sentiments) / len(ai_sentiments)
        
        # Return similarity score (0 to 1)
        return max(0, 1 - abs(user_avg - ai_avg))
    
    def _calculate_overall_sentiment_score(self, user_sentiments: List[Dict]) -> float:
        """Calculate overall sentiment score"""
        if not user_sentiments:
            return 5
        
        avg_polarity = sum(s['polarity'] for s in user_sentiments) / len(user_sentiments)
        
        # Convert polarity (-1 to 1) to score (0 to 10)
        return (avg_polarity + 1) * 5
    
    def _classify_objection_type(self, objection_text: str) -> str:
        """Classify the type of objection"""
        objection_text = objection_text.lower()
        
        if any(word in objection_text for word in ['price', 'cost', 'expensive', 'budget', 'afford']):
            return 'price'
        elif any(word in objection_text for word in ['time', 'busy', 'schedule', 'later']):
            return 'time'
        elif any(word in objection_text for word in ['need', 'necessary', 'required', 'want']):
            return 'need'
        elif any(word in objection_text for word in ['trust', 'reliable', 'credible', 'experience']):
            return 'trust'
        else:
            return 'other'
    
    def _evaluate_objection_response(self, objection: str, response: str) -> float:
        """Evaluate the quality of an objection response"""
        response_lower = response.lower()
        score = 5  # Base score
        
        # Check for empathy
        if any(phrase in response_lower for phrase in ['i understand', 'i see', 'that makes sense']):
            score += 1
        
        # Check for addressing the concern
        if any(word in response_lower for word in ['let me', 'actually', 'specifically', 'example']):
            score += 1
        
        # Check for solution offering
        if any(word in response_lower for word in ['can', 'will', 'would', 'option', 'alternative']):
            score += 1
        
        # Check for professionalism
        if any(word in response_lower for word in ['appreciate', 'thank', 'understand', 'respect']):
            score += 1
        
        return min(10, score)
    
    def _calculate_objection_handling_score(self, objections_detected: List[Dict]) -> float:
        """Calculate objection handling score"""
        if not objections_detected:
            return 8  # No objections, but good baseline
        
        avg_quality = sum(obj['response_quality'] for obj in objections_detected) / len(objections_detected)
        
        # Bonus for handling multiple objections
        if len(objections_detected) > 2:
            avg_quality += 1
        
        return min(10, avg_quality)
    
    def _calculate_grade(self, score: float) -> str:
        """Calculate letter grade from score"""
        if score >= 9:
            return 'A+'
        elif score >= 8:
            return 'A'
        elif score >= 7:
            return 'B'
        elif score >= 6:
            return 'C'
        elif score >= 5:
            return 'D'
        else:
            return 'F'
    
    def _calculate_performance_level(self, score: float) -> str:
        """Calculate performance level"""
        if score >= 8:
            return 'Expert'
        elif score >= 7:
            return 'Advanced'
        elif score >= 6:
            return 'Intermediate'
        elif score >= 5:
            return 'Beginner'
        else:
            return 'Needs Improvement'
    
    def _get_area_specific_recommendation(self, area: str, score: float) -> str:
        """Get specific recommendation for improvement area"""
        recommendations = {
            'base_score': 'Focus on fundamental conversation skills and active listening.',
            'conversation_structure': 'Work on maintaining better conversation flow and turn-taking.',
            'communication_patterns': 'Practice using more varied communication techniques.',
            'sentiment_flow': 'Focus on maintaining positive energy throughout the conversation.',
            'objection_handling': 'Practice addressing concerns with empathy and clear explanations.',
            'rapport_building': 'Work on building stronger connections with customers.'
        }
        
        return recommendations.get(area, 'Continue practicing to improve your skills.')
    
    def _get_practice_exercises(self, area: str) -> List[str]:
        """Get practice exercises for specific area"""
        exercises = {
            'objection_handling': [
                'Practice role-playing common objections',
                'Record yourself responding to price objections',
                'Study examples of effective objection responses'
            ],
            'rapport_building': [
                'Practice active listening techniques',
                'Work on finding common ground with customers',
                'Practice using empathetic language'
            ],
            'communication_patterns': [
                'Practice asking open-ended questions',
                'Work on using more professional language',
                'Practice summarizing customer concerns'
            ]
        }
        
        return exercises.get(area, ['Practice regular conversation skills'])
    
    def _get_learning_resources(self, area: str) -> List[str]:
        """Get learning resources for specific area"""
        resources = {
            'objection_handling': [
                'Sales objection handling guide',
                'Customer psychology training',
                'Negotiation skills course'
            ],
            'rapport_building': [
                'Customer relationship building course',
                'Communication skills training',
                'Empathy development workshop'
            ]
        }
        
        return resources.get(area, [])
    
    def _get_pattern_exercises(self, pattern_name: str) -> List[str]:
        """Get exercises for specific communication pattern"""
        exercises = {
            'questioning': ['Practice asking open-ended questions', 'Work on follow-up questions'],
            'empathy': ['Practice empathetic responses', 'Work on understanding customer emotions'],
            'closing': ['Practice closing techniques', 'Work on summarizing conversations']
        }
        
        return exercises.get(pattern_name, ['Practice this communication skill'])

# Global instance
ai_call_analyzer = AICallAnalyzer()