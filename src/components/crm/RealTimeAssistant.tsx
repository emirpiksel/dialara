import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle, 
  Lightbulb, 
  FileText, 
  Search, 
  TrendingUp, 
  TrendingDown,
  Clock,
  User,
  Bot,
  Zap,
  Brain
} from 'lucide-react';

interface TranscriptMessage {
  id: string;
  speaker: 'agent' | 'customer';
  text: string;
  timestamp: Date;
  sentiment?: 'positive' | 'neutral' | 'negative';
  confidence?: number;
}

interface AIInsight {
  id: string;
  type: 'suggestion' | 'warning' | 'knowledge' | 'opportunity';
  title: string;
  content: string;
  confidence: number;
  timestamp: Date;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

interface KeywordAlert {
  keyword: string;
  context: string;
  type: 'competitor' | 'objection' | 'opportunity' | 'escalation';
  suggestion: string;
}

interface CustomerSentiment {
  overall: 'positive' | 'neutral' | 'negative';
  confidence: number;
  trend: 'improving' | 'stable' | 'declining';
  history: Array<{
    timestamp: Date;
    sentiment: 'positive' | 'neutral' | 'negative';
    confidence: number;
  }>;
}

interface RealTimeAssistantProps {
  callId?: string;
  onSuggestionUsed?: (suggestion: AIInsight) => void;
  onTranscriptUpdate?: (transcript: TranscriptMessage[]) => void;
}

const RealTimeAssistant: React.FC<RealTimeAssistantProps> = ({
  callId,
  onSuggestionUsed,
  onTranscriptUpdate
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [currentSentiment, setCurrentSentiment] = useState<CustomerSentiment>({
    overall: 'neutral',
    confidence: 0,
    trend: 'stable',
    history: []
  });
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [keywordAlerts, setKeywordAlerts] = useState<KeywordAlert[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<'agent' | 'customer'>('agent');
  const [isProcessing, setIsProcessing] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showTranscript, setShowTranscript] = useState(true);
  const [showInsights, setShowInsights] = useState(true);

  const recognitionRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const results = Array.from(event.results);
        const latestResult = results[results.length - 1];
        
        if (latestResult.isFinal) {
          const text = latestResult[0].transcript.trim();
          if (text) {
            addTranscriptMessage(text, currentSpeaker);
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          // Restart recognition if it was stopped unexpectedly
          recognitionRef.current.start();
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [currentSpeaker, isListening]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Notify parent of transcript updates
  useEffect(() => {
    onTranscriptUpdate?.(transcript);
  }, [transcript, onTranscriptUpdate]);

  const addTranscriptMessage = async (text: string, speaker: 'agent' | 'customer') => {
    const message: TranscriptMessage = {
      id: Date.now().toString(),
      speaker,
      text,
      timestamp: new Date(),
      sentiment: 'neutral',
      confidence: 0.8
    };

    setTranscript(prev => [...prev, message]);
    
    // Process the message for insights
    await processMessage(message);
  };

  const processMessage = async (message: TranscriptMessage) => {
    setIsProcessing(true);
    
    try {
      // Analyze sentiment
      const sentiment = await analyzeSentiment(message.text);
      
      // Update customer sentiment if it's from customer
      if (message.speaker === 'customer') {
        updateCustomerSentiment(sentiment);
      }
      
      // Check for keywords and triggers
      const alerts = detectKeywords(message.text);
      if (alerts.length > 0) {
        setKeywordAlerts(prev => [...prev, ...alerts]);
      }
      
      // Generate AI insights
      const insights = await generateInsights(message, transcript);
      if (insights.length > 0) {
        setAiInsights(prev => [...prev, ...insights]);
      }
      
    } catch (error) {
      console.error('Error processing message:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const analyzeSentiment = async (text: string): Promise<{ sentiment: 'positive' | 'neutral' | 'negative'; confidence: number }> => {
    // Simple sentiment analysis (in production, use a proper AI service)
    const positiveWords = ['good', 'great', 'excellent', 'love', 'perfect', 'amazing', 'wonderful', 'satisfied', 'happy'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'disappointed', 'frustrated', 'angry', 'upset'];
    
    const words = text.toLowerCase().split(' ');
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    if (positiveCount > negativeCount) {
      return { sentiment: 'positive', confidence: Math.min(0.9, 0.5 + positiveCount * 0.1) };
    } else if (negativeCount > positiveCount) {
      return { sentiment: 'negative', confidence: Math.min(0.9, 0.5 + negativeCount * 0.1) };
    } else {
      return { sentiment: 'neutral', confidence: 0.6 };
    }
  };

  const updateCustomerSentiment = (sentiment: { sentiment: 'positive' | 'neutral' | 'negative'; confidence: number }) => {
    setCurrentSentiment(prev => {
      const newHistory = [...prev.history, {
        timestamp: new Date(),
        sentiment: sentiment.sentiment,
        confidence: sentiment.confidence
      }].slice(-10); // Keep last 10 entries

      // Calculate trend
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (newHistory.length >= 3) {
        const recent = newHistory.slice(-3);
        const scores = recent.map(h => h.sentiment === 'positive' ? 1 : h.sentiment === 'negative' ? -1 : 0);
        const avgRecent = scores.reduce((a, b) => a + b, 0) / scores.length;
        const older = newHistory.slice(-6, -3);
        if (older.length > 0) {
          const olderScores = older.map(h => h.sentiment === 'positive' ? 1 : h.sentiment === 'negative' ? -1 : 0);
          const avgOlder = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
          
          if (avgRecent > avgOlder + 0.2) trend = 'improving';
          else if (avgRecent < avgOlder - 0.2) trend = 'declining';
        }
      }

      return {
        overall: sentiment.sentiment,
        confidence: sentiment.confidence,
        trend,
        history: newHistory
      };
    });
  };

  const detectKeywords = (text: string): KeywordAlert[] => {
    const alerts: KeywordAlert[] = [];
    const lowerText = text.toLowerCase();

    // Competitor mentions
    const competitors = ['competitor', 'alternative', 'other option', 'different solution'];
    competitors.forEach(competitor => {
      if (lowerText.includes(competitor)) {
        alerts.push({
          keyword: competitor,
          context: text,
          type: 'competitor',
          suggestion: 'Highlight our unique value proposition and differentiators'
        });
      }
    });

    // Price objections
    const priceKeywords = ['expensive', 'costly', 'price', 'budget', 'affordable', 'cheap'];
    priceKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        alerts.push({
          keyword: keyword,
          context: text,
          type: 'objection',
          suggestion: 'Focus on value and ROI rather than price alone'
        });
      }
    });

    // Escalation triggers
    const escalationKeywords = ['manager', 'supervisor', 'complaint', 'frustrated', 'angry'];
    escalationKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        alerts.push({
          keyword: keyword,
          context: text,
          type: 'escalation',
          suggestion: 'Consider involving a supervisor or de-escalation techniques'
        });
      }
    });

    // Buying signals
    const buyingSignals = ['when can we start', 'how do we proceed', 'next steps', 'contract', 'agreement'];
    buyingSignals.forEach(signal => {
      if (lowerText.includes(signal)) {
        alerts.push({
          keyword: signal,
          context: text,
          type: 'opportunity',
          suggestion: 'Customer showing buying intent - move to closing phase'
        });
      }
    });

    return alerts;
  };

  const generateInsights = async (message: TranscriptMessage, context: TranscriptMessage[]): Promise<AIInsight[]> => {
    const insights: AIInsight[] = [];
    const recentMessages = context.slice(-5); // Last 5 messages for context

    // Suggestion based on conversation flow
    if (message.speaker === 'customer' && message.text.includes('?')) {
      insights.push({
        id: Date.now().toString(),
        type: 'suggestion',
        title: 'Customer Asked a Question',
        content: 'Make sure to provide a clear, comprehensive answer and ask follow-up questions to understand their needs better.',
        confidence: 0.8,
        timestamp: new Date(),
        actions: [
          {
            label: 'View FAQ',
            action: () => console.log('Opening FAQ')
          }
        ]
      });
    }

    // Silence detection
    if (recentMessages.length >= 3) {
      const lastThreeMessages = recentMessages.slice(-3);
      const allFromSameSpeaker = lastThreeMessages.every(msg => msg.speaker === message.speaker);
      
      if (allFromSameSpeaker && message.speaker === 'agent') {
        insights.push({
          id: Date.now().toString() + '_silence',
          type: 'warning',
          title: 'Customer Engagement Low',
          content: 'Customer hasn\'t responded recently. Try asking an open-ended question to re-engage them.',
          confidence: 0.7,
          timestamp: new Date()
        });
      }
    }

    // Conversation length insight
    if (context.length > 20) {
      const customerMessages = context.filter(msg => msg.speaker === 'customer');
      if (customerMessages.length < context.length * 0.3) {
        insights.push({
          id: Date.now().toString() + '_participation',
          type: 'suggestion',
          title: 'Increase Customer Participation',
          content: 'Customer is not participating much. Try asking more engaging questions to get them talking.',
          confidence: 0.6,
          timestamp: new Date()
        });
      }
    }

    return insights;
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const clearTranscript = () => {
    setTranscript([]);
    setAiInsights([]);
    setKeywordAlerts([]);
  };

  const dismissInsight = (insightId: string) => {
    setAiInsights(prev => prev.filter(insight => insight.id !== insightId));
  };

  const useInsight = (insight: AIInsight) => {
    onSuggestionUsed?.(insight);
    dismissInsight(insight.id);
  };

  const getSentimentIcon = (sentiment: 'positive' | 'neutral' | 'negative') => {
    switch (sentiment) {
      case 'positive': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'negative': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <div className="w-4 h-4 bg-yellow-500 rounded-full" />;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'suggestion': return <Lightbulb className="w-5 h-5 text-blue-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'knowledge': return <FileText className="w-5 h-5 text-purple-500" />;
      case 'opportunity': return <CheckCircle className="w-5 h-5 text-green-500" />;
      default: return <Brain className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center space-x-2">
          <Bot className="w-6 h-6 text-blue-600" />
          <h3 className="font-semibold text-gray-800">AI Assistant</h3>
          {isProcessing && (
            <div className="flex items-center space-x-1 text-sm text-blue-600">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              <span>Processing...</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Sentiment Indicator */}
          <div className="flex items-center space-x-1 px-2 py-1 bg-white rounded-lg border">
            {getSentimentIcon(currentSentiment.overall)}
            <span className="text-xs font-medium text-gray-600">
              {currentSentiment.overall}
            </span>
          </div>

          {/* Listening Toggle */}
          <button
            onClick={toggleListening}
            className={`p-2 rounded-lg transition-colors ${
              isListening 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'bg-green-100 text-green-600 hover:bg-green-200'
            }`}
            title={isListening ? 'Stop Listening' : 'Start Listening'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Transcript Panel */}
        {showTranscript && (
          <div className="flex-1 flex flex-col border-r border-gray-200">
            <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h4 className="font-medium text-gray-700 flex items-center">
                <MessageSquare className="w-4 h-4 mr-2" />
                Live Transcript
              </h4>
              <button
                onClick={clearTranscript}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {transcript.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.speaker === 'agent' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      message.speaker === 'agent'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center space-x-1 mb-1">
                      {message.speaker === 'agent' ? (
                        <User className="w-3 h-3" />
                      ) : (
                        <MessageSquare className="w-3 h-3" />
                      )}
                      <span className="text-xs font-medium capitalize">
                        {message.speaker}
                      </span>
                      <span className="text-xs text-gray-500">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p>{message.text}</p>
                    {message.sentiment && (
                      <div className="flex items-center mt-1">
                        {getSentimentIcon(message.sentiment)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>

            {/* Speaker Toggle */}
            <div className="p-3 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xs text-gray-600">Speaking:</span>
                <button
                  onClick={() => setCurrentSpeaker('agent')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    currentSpeaker === 'agent'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  Agent
                </button>
                <button
                  onClick={() => setCurrentSpeaker('customer')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    currentSpeaker === 'customer'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  Customer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Insights Panel */}
        {showInsights && (
          <div className="w-80 flex flex-col">
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <h4 className="font-medium text-gray-700 flex items-center">
                <Zap className="w-4 h-4 mr-2" />
                AI Insights
              </h4>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Keyword Alerts */}
              {keywordAlerts.map((alert, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-l-4 ${
                    alert.type === 'opportunity' ? 'border-green-500 bg-green-50' :
                    alert.type === 'escalation' ? 'border-red-500 bg-red-50' :
                    alert.type === 'objection' ? 'border-orange-500 bg-orange-50' :
                    'border-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800 capitalize">
                        {alert.type} Detected
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        "{alert.keyword}" in: "{alert.context.substring(0, 50)}..."
                      </p>
                      <p className="text-xs text-gray-700 mt-2 font-medium">
                        💡 {alert.suggestion}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* AI Insights */}
              {aiInsights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getInsightIcon(insight.type)}
                      <h5 className="text-sm font-medium text-gray-800">
                        {insight.title}
                      </h5>
                    </div>
                    <button
                      onClick={() => dismissInsight(insight.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">
                    {insight.content}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Confidence: {Math.round(insight.confidence * 100)}%
                    </span>
                    
                    {insight.actions && insight.actions.length > 0 && (
                      <div className="flex space-x-2">
                        {insight.actions.map((action, actionIndex) => (
                          <button
                            key={actionIndex}
                            onClick={action.action}
                            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            {action.label}
                          </button>
                        ))}
                        <button
                          onClick={() => useInsight(insight)}
                          className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          Use
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {aiInsights.length === 0 && keywordAlerts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">AI insights will appear here as the conversation progresses</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealTimeAssistant;