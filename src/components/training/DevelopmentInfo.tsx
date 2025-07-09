/**
 * DevelopmentInfo Component
 * Shows development information in development mode
 */
import React from 'react';
import { useTrainingStore } from '@/store/training';

interface DevelopmentInfoProps {
  selectedModuleTitle: string | null;
  selectedScenario: any;
  userId: string | null;
  isProcessingCall: boolean;
  processingStage: string;
  processingProgress: number;
}

export const DevelopmentInfo: React.FC<DevelopmentInfoProps> = ({
  selectedModuleTitle,
  selectedScenario,
  userId,
  isProcessingCall,
  processingStage,
  processingProgress
}) => {
  if (import.meta.env.MODE !== 'development') {
    return null;
  }

  return (
    <div className="mt-6 p-4 bg-gray-100 rounded-lg">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Development Info</h3>
      <div className="text-xs text-gray-600 space-y-1">
        <div>Selected Module: {selectedModuleTitle || 'None'}</div>
        <div>Selected Scenario: {selectedScenario?.title || 'None'}</div>
        <div>User ID: {userId || 'None'}</div>
        <div>Processing Call: {isProcessingCall ? 'Yes' : 'No'}</div>
        <div>Processing Stage: {processingStage || 'None'}</div>
        <div>Progress: {processingProgress}%</div>
        <div>Current Call ID: {useTrainingStore.getState().currentCallId || 'None'}</div>
      </div>
    </div>
  );
};