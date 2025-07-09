/**
 * CallControls Component
 * Handles call start/stop controls and status display
 */
import React from 'react';
import { Button } from '@/components/Button';
import { XCircle } from 'lucide-react';

interface CallControlsProps {
  isCalling: boolean;
  isProcessingCall: boolean;
  selectedScenario: any;
  selectedModuleId: string | null;
  userId: string | null;
  onStartCall: () => void;
  onStopCall: () => void;
  onTestProcessing?: () => void;
}

export const CallControls: React.FC<CallControlsProps> = ({
  isCalling,
  isProcessingCall,
  selectedScenario,
  selectedModuleId,
  userId,
  onStartCall,
  onStopCall,
  onTestProcessing
}) => {
  if (!isCalling) {
    return (
      <div className="flex gap-4">
        <Button
          onClick={onStartCall}
          disabled={!selectedScenario || !selectedModuleId || !userId || isProcessingCall}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          🎙️ Start Optimized Call
        </Button>
        
        {/* Debug button for development */}
        {import.meta.env.MODE === 'development' && onTestProcessing && (
          <Button
            onClick={onTestProcessing}
            disabled={isProcessingCall}
            className="bg-purple-600 hover:bg-purple-700 text-sm disabled:opacity-50"
          >
            🧪 Test Processing States
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-4 items-center">
      <Button 
        className="bg-red-500 hover:bg-red-600 text-white" 
        onClick={onStopCall}
        disabled={isProcessingCall}
      >
        <XCircle className="mr-2 w-4 h-4" /> Stop Call
      </Button>
    </div>
  );
};