/**
 * ProcessingStatusIndicator Component
 * Shows real-time processing status with progress bar
 */
import React from 'react';
import { Clock, BarChart3, FileText } from 'lucide-react';

interface ProcessingStatusIndicatorProps {
  isProcessingCall: boolean;
  processingStage: string;
  processingProgress: number;
  estimatedTimeRemaining: number;
}

export const ProcessingStatusIndicator: React.FC<ProcessingStatusIndicatorProps> = ({
  isProcessingCall,
  processingStage,
  processingProgress,
  estimatedTimeRemaining
}) => {
  if (!isProcessingCall) {
    return null;
  }

  const getStatusIcon = () => {
    if (processingStage.includes('status') || processingStage.includes('analysis')) {
      return <BarChart3 className="w-4 h-4 text-blue-500" />;
    } else if (processingStage.includes('transcript') || processingStage.includes('data')) {
      return <FileText className="w-4 h-4 text-green-500" />;
    } else {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          {getStatusIcon()}
          <span className="ml-2 text-sm font-medium text-blue-900">
            {processingStage || 'Processing...'}
          </span>
        </div>
        <div className="flex items-center text-sm text-blue-700">
          <Clock className="w-4 h-4 mr-1" />
          <span>~{estimatedTimeRemaining}s remaining</span>
        </div>
      </div>
      
      <div className="w-full bg-blue-100 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(processingProgress, 100)}%` }}
        />
      </div>
      
      <div className="mt-2 text-xs text-blue-600">
        {processingProgress}% complete
      </div>
    </div>
  );
};