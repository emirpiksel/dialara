import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Clock, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { useCallsStore } from '../store/calls';

interface QAMetrics {
  averageScore: number;
  totalCalls: number;
  positivesentiment: number;
  negativeSentiment: number;
  lowScoreCalls: number;
  improvementTrend: 'up' | 'down' | 'stable';
}

interface LowScoreCall {
  id: string;
  call_id: string;
  score: number;
  sentiment: string;
  caller_number: string;
  timestamp: string;
  summary?: string;
  issues?: string[];
}

export function QADashboard() {
  const { calls, fetchCalls } = useCallsStore();
  const [metrics, setMetrics] = useState<QAMetrics>({
    averageScore: 0,
    totalCalls: 0,
    positivesentiment: 0,
    negativeSentiment: 0,
    lowScoreCalls: 0,
    improvementTrend: 'stable'
  });
  const [lowScoreCalls, setLowScoreCalls] = useState<LowScoreCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  useEffect(() => {
    if (calls.length > 0) {
      calculateMetrics();
      setIsLoading(false);
    }
  }, [calls]);

  const calculateMetrics = () => {
    const callsWithScores = calls.filter(call => call.score && call.score > 0);
    
    if (callsWithScores.length === 0) {
      setIsLoading(false);
      return;
    }

    const totalCalls = callsWithScores.length;
    const averageScore = callsWithScores.reduce((sum, call) => sum + (call.score || 0), 0) / totalCalls;
    
    const positivesentiment = calls.filter(call => call.sentiment === 'positive').length;
    const negativeSentiment = calls.filter(call => call.sentiment === 'negative').length;
    
    const lowScoreCalls = callsWithScores.filter(call => (call.score || 0) < 6);
    const lowScoreCount = lowScoreCalls.length;

    // Calculate trend (simplified - would need historical data for real trend)
    const recentCalls = callsWithScores.slice(0, Math.min(10, callsWithScores.length));
    const olderCalls = callsWithScores.slice(10, Math.min(20, callsWithScores.length));
    
    let improvementTrend: 'up' | 'down' | 'stable' = 'stable';
    if (recentCalls.length > 0 && olderCalls.length > 0) {
      const recentAvg = recentCalls.reduce((sum, call) => sum + (call.score || 0), 0) / recentCalls.length;
      const olderAvg = olderCalls.reduce((sum, call) => sum + (call.score || 0), 0) / olderCalls.length;
      
      if (recentAvg > olderAvg + 0.5) improvementTrend = 'up';
      else if (recentAvg < olderAvg - 0.5) improvementTrend = 'down';
    }

    setMetrics({
      averageScore,
      totalCalls,
      positivesentiment,
      negativeSentiment,
      lowScoreCalls: lowScoreCount,
      improvementTrend
    });

    // Prepare low score calls for display
    const lowScoreCallsFormatted: LowScoreCall[] = lowScoreCalls.map(call => ({
      id: call.id,
      call_id: call.call_id,
      score: call.score || 0,
      sentiment: call.sentiment || 'neutral',
      caller_number: call.caller_number || 'Unknown',
      timestamp: call.timestamp,
      summary: call.summary,
      issues: detectIssues(call)
    }));

    setLowScoreCalls(lowScoreCallsFormatted.slice(0, 10)); // Show top 10 problem calls
  };

  const detectIssues = (call: any): string[] => {
    const issues: string[] = [];
    
    if ((call.score || 0) < 4) issues.push('Very low quality score');
    if (call.sentiment === 'negative') issues.push('Negative customer sentiment');
    if (call.duration < 30) issues.push('Call too short');
    if (call.duration > 600) issues.push('Call unusually long');
    if (call.ended_reason === 'customer-hung-up') issues.push('Customer hung up');
    if (!call.summary || call.summary.length < 10) issues.push('Insufficient call summary');
    
    return issues;
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-50';
    if (score >= 6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50';
      case 'negative': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading QA Dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Call Quality & Analysis Dashboard</h2>
        <p className="text-gray-600">
          Automatic call analysis and quality assurance metrics powered by AI
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average QA Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.averageScore.toFixed(1)}/10
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Analyzed Calls</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalCalls}</p>
            </div>
            <Users className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Positive Sentiment</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.totalCalls > 0 ? Math.round((metrics.positivesentiment / metrics.totalCalls) * 100) : 0}%
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Calls Needing Review</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.lowScoreCalls}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Trend Indicator */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">Quality Trend</h3>
            <p className="text-gray-600">Recent performance compared to previous period</p>
          </div>
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-full ${
            metrics.improvementTrend === 'up' ? 'bg-green-100 text-green-800' :
            metrics.improvementTrend === 'down' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {metrics.improvementTrend === 'up' ? (
              <TrendingUp className="w-4 h-4" />
            ) : metrics.improvementTrend === 'down' ? (
              <TrendingDown className="w-4 h-4" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {metrics.improvementTrend === 'up' ? 'Improving' :
               metrics.improvementTrend === 'down' ? 'Declining' :
               'Stable'}
            </span>
          </div>
        </div>
      </div>

      {/* Low Score Calls Table */}
      {lowScoreCalls.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Calls Requiring Review</h3>
            <p className="text-gray-600 text-sm">Calls with quality scores below 6/10 or other issues detected</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Call Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sentiment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issues Detected
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lowScoreCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {call.caller_number}
                        </div>
                        <div className="text-sm text-gray-500 font-mono">
                          {call.call_id.substring(0, 8)}...
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreColor(call.score)}`}>
                        {call.score}/10
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSentimentColor(call.sentiment)}`}>
                        {call.sentiment}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {call.issues && call.issues.length > 0 ? (
                          <ul className="list-disc list-inside space-y-1">
                            {call.issues.map((issue, index) => (
                              <li key={index} className="text-xs text-red-600">{issue}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-gray-500">No specific issues detected</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(call.timestamp).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analysis Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-blue-600" />
          <div>
            <h4 className="font-medium text-blue-900">AI Call Analysis Active</h4>
            <p className="text-blue-800 text-sm">
              All calls are automatically analyzed for quality, sentiment, and content. 
              Summaries and scores are generated in real-time using advanced AI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}