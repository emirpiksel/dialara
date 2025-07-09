import React, { useEffect, useState } from 'react';
import { useTrainingStore } from '@/store/training';
import { CheckCircle, XCircle, Smile, Meh, Frown, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { ProgressBar } from './ProgressBar';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  onNext: () => void;
}

export const AfterCallSummaryModal: React.FC<Props> = ({ isOpen, onClose, onRetry, onNext }) => {
  // Use individual Zustand selectors to force reactivity
  const feedback = useTrainingStore((s) => s.feedback);
  const sentiment = useTrainingStore((s) => s.sentiment);
  const score = useTrainingStore((s) => s.score);
  const passed = useTrainingStore((s) => s.passed);
  const transcript = useTrainingStore((s) => s.transcript);
  const xp = useTrainingStore((s) => s.xp);
  const duration = useTrainingStore((s) => s.duration);

  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>({});

  // Calculate word count for transcript validation
  const wordCount = transcript ? transcript.trim().split(/\s+/).filter(word => word.length > 0).length : 0;

  // Enhanced validation logic
  const hasValidTranscript = Boolean(
    transcript &&
    transcript.trim().length > 0 &&
    wordCount >= 3 &&
    !transcript.toLowerCase().includes("no transcript") &&
    !transcript.toLowerCase().includes("transcript pending") &&
    transcript !== "N/A"
  );

  const hasValidFeedback = Boolean(
    feedback &&
    feedback.trim().length > 0 &&
    !feedback.toLowerCase().includes("no feedback") &&
    feedback !== "N/A"
  );

  const hasValidSentiment = Boolean(
    sentiment &&
    sentiment.trim().length > 0 &&
    ['positive', 'negative', 'neutral'].includes(sentiment.toLowerCase())
  );

  const hasValidScore = Boolean(
    score !== null &&
    score !== undefined &&
    typeof score === 'number' &&
    score >= 0 &&
    score <= 10
  );

  const hasValidData = hasValidTranscript && hasValidFeedback && hasValidSentiment && hasValidScore;

  const showLoader = isAnalyzing || !hasValidData;

  // Update debug info whenever data changes
  useEffect(() => {
    setDebugInfo({
      transcript: transcript?.length || 0,
      feedback: feedback?.length || 0,
      sentiment,
      score,
      wordCount,
      hasValidTranscript,
      hasValidFeedback,
      hasValidSentiment,
      hasValidScore,
      hasValidData,
      isAnalyzing,
      showLoader,
    });
  }, [transcript, feedback, sentiment, score, wordCount, hasValidTranscript, hasValidFeedback, hasValidSentiment, hasValidScore, hasValidData, isAnalyzing, showLoader]);

  // Reset analyzing state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsAnalyzing(true);
      console.log("🚀 Modal opened - Starting analysis state");
      console.log("📊 Current store state:", { transcript: transcript?.length, feedback: feedback?.length, sentiment, score });
    } else {
      // Reset state when modal closes
      setIsAnalyzing(true);
    }
  }, [isOpen]);

  // Stop analyzing when we have valid data
  useEffect(() => {
    if (isOpen && hasValidData && isAnalyzing) {
      console.log("✅ Data is ready - Stopping analysis", { hasValidData, isAnalyzing });
      const timer = setTimeout(() => {
        setIsAnalyzing(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, hasValidData, isAnalyzing]);

  // Force stop analyzing after timeout
  useEffect(() => {
    if (isOpen && isAnalyzing) {
      const timeout = setTimeout(() => {
        console.warn("⏰ Analysis timeout - Forcing display with current data");
        setIsAnalyzing(false);
      }, 15000);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, isAnalyzing]);

  const getSentimentIcon = () => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return <Smile className="text-green-500" />;
      case 'neutral':
        return <Meh className="text-yellow-500" />;
      case 'negative':
        return <Frown className="text-red-500" />;
      default:
        return <XCircle className="text-gray-400" />;
    }
  };

  const getScoreColor = () => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    if (score >= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg border">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Training Summary</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {showLoader ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="animate-spin w-6 h-6 text-gray-500 mb-3" />
            <p className="text-sm text-gray-600">Analyzing your session...</p>
            {import.meta.env.MODE === 'development' && (
              <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600 w-full">
                <div className="grid grid-cols-2 gap-1">
                  <div>Transcript: {debugInfo.transcript || 0} chars</div>
                  <div>Feedback: {debugInfo.feedback || 0} chars</div>
                  <div>Word Count: {debugInfo.wordCount || 0}</div>
                  <div>Score: {debugInfo.score ?? 'N/A'}</div>
                  <div>Sentiment: {debugInfo.sentiment || 'N/A'}</div>
                  <div>Valid Transcript: {debugInfo.hasValidTranscript ? '✅' : '❌'}</div>
                  <div>Valid Feedback: {debugInfo.hasValidFeedback ? '✅' : '❌'}</div>
                  <div>Valid Sentiment: {debugInfo.hasValidSentiment ? '✅' : '❌'}</div>
                  <div>Valid Score: {debugInfo.hasValidScore ? '✅' : '❌'}</div>
                  <div>All Valid: {debugInfo.hasValidData ? '✅' : '❌'}</div>
                  <div>Analyzing: {debugInfo.isAnalyzing ? '⏳' : '✅'}</div>
                  <div>Show Loader: {debugInfo.showLoader ? '⏳' : '✅'}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Score Section */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {passed ? (
                  <CheckCircle className="text-green-500 w-6 h-6" />
                ) : (
                  <XCircle className="text-red-500 w-6 h-6" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-700">Training Score</p>
                  <p className={`text-lg font-bold ${getScoreColor()}`}>
                    {score ?? 'N/A'} / 10
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Status</p>
                <p className={`font-semibold ${passed ? 'text-green-600' : 'text-red-600'}`}>
                  {passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
                </p>
              </div>
            </div>

            {/* Sentiment Section */}
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              {getSentimentIcon()}
              <div>
                <p className="text-sm font-medium text-gray-700">Session Sentiment</p>
                <p className="text-sm text-gray-600 capitalize">
                  {sentiment || 'Not analyzed'}
                </p>
              </div>
            </div>

            {/* Feedback Section */}
            <div className="p-3 border rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Feedback</p>
              <p className="text-sm text-gray-600">
                {feedback || 'No specific feedback available.'}
              </p>
            </div>

            {/* XP Progress Section */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Experience Points</p>
              <ProgressBar 
                value={passed ? xp : 0} 
                max={100} 
                label={`${xp || 0} XP`}
                className="mb-1"
              />
              <p className="text-xs text-gray-500">
                {passed 
                  ? `Great job! You earned ${xp || 0} XP.` 
                  : 'Complete the training successfully to earn XP.'
                }
              </p>
            </div>

            {/* Session Stats */}
            {duration > 0 && (
              <div className="text-center text-xs text-gray-500 border-t pt-2">
                Session Duration: {Math.floor(duration / 60)}m {duration % 60}s
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onRetry} disabled={showLoader}>
            Retry
          </Button>
          <Button onClick={onNext} disabled={showLoader}>
            Next Module
          </Button>
        </div>
      </div>
    </div>
  );
};