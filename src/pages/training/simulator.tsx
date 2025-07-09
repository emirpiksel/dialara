/**
 * Refactored Training Simulator
 * Uses extracted components and hooks for better organization
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '@/store/training';
import { AfterCallSummaryModal } from '@/components/AfterCallSummaryModal';
import { PhoneCall } from 'lucide-react';
import Vapi from '@vapi-ai/web';

// Import extracted components
import { ScenarioSelector } from '@/components/training/ScenarioSelector';
import { CallControls } from '@/components/training/CallControls';
import { ProcessingStatusIndicator } from '@/components/training/ProcessingStatusIndicator';
import { DevelopmentInfo } from '@/components/training/DevelopmentInfo';

// Import custom hooks
import { useCallManagement } from '@/hooks/useCallManagement';
import { useVapiEvents } from '@/hooks/useVapiEvents';
import { logger } from '@/utils/logger';
import { api } from '@/lib/api';

interface Scenario {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  prompt_template?: string;
  first_message?: string;
}

const vapi = new Vapi(import.meta.env.VITE_VAPI_WEB_KEY);

export default function TrainingSimulator() {
  const [showSummary, setShowSummary] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [universalAgent, setUniversalAgent] = useState<any | null>(null);

  const navigate = useNavigate();
  const {
    selectedModuleId,
    selectedModuleTitle,
    selectedCategoryName,
    userId,
    reset,
  } = useTrainingStore();

  // Use custom hooks
  const {
    isCalling,
    processingState,
    startSimulation,
    stopSimulation,
    handleCallEnded,
    handleTestProcessing,
    updateProcessingState
  } = useCallManagement({
    vapi,
    selectedScenario,
    universalAgent
  });

  // Setup Vapi event handlers
  useVapiEvents({
    vapi,
    isProcessingCall: processingState.isProcessingCall,
    setIsCalling: (calling) => {}, // This is handled in useCallManagement
    setProcessingStage: (stage) => updateProcessingState(stage, processingState.processingProgress),
    setProcessingProgress: (progress) => updateProcessingState(processingState.processingStage, progress),
    handleCallEnded
  });

  // Initialize component
  useEffect(() => {
    const initializeComponent = async () => {
      if (!selectedModuleId) {
        logger.info("No module selected, redirecting to module selection");
        navigate("/training");
        return;
      }

      try {
        // Fetch scenarios for the selected module using API service
        const scenariosData = await api.training.getScenariosByModule(selectedModuleId);
        setScenarios(scenariosData);
        logger.info(`Loaded ${scenariosData.length} scenarios for module ${selectedModuleId}`);

        // Fetch universal agent using API service
        const agentData = await api.training.getUniversalAgent();
        if (agentData.length > 0) {
          setUniversalAgent(agentData[0]);
          logger.info("Universal agent loaded:", agentData[0]);
        } else {
          logger.warn("No universal agent found");
        }

      } catch (error) {
        logger.error("Error initializing simulator:", error);
      }
    };

    initializeComponent();
  }, [selectedModuleId, navigate]);

  // Reset when component unmounts
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  const handleRetry = () => {
    setShowSummary(false);
    // Reset any state if needed
  };

  const handleNext = () => {
    setShowSummary(false);
    navigate("/training");
  };

  // Show loading state while initializing
  if (!selectedModuleId) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading simulator...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold flex items-center mb-4">
        <PhoneCall className="mr-2" /> Training Simulation
      </h1>

      <ScenarioSelector
        scenarios={scenarios}
        selectedScenario={selectedScenario}
        onSelectScenario={setSelectedScenario}
      />

      <CallControls
        isCalling={isCalling}
        isProcessingCall={processingState.isProcessingCall}
        selectedScenario={selectedScenario}
        selectedModuleId={selectedModuleId}
        userId={userId}
        onStartCall={startSimulation}
        onStopCall={stopSimulation}
        onTestProcessing={handleTestProcessing}
      />

      {/* Enhanced Status Display */}
      <div className="mt-4">
        <ProcessingStatusIndicator
          isProcessingCall={processingState.isProcessingCall}
          processingStage={processingState.processingStage}
          processingProgress={processingState.processingProgress}
          estimatedTimeRemaining={processingState.estimatedTimeRemaining}
        />
      </div>

      {/* Development Info Panel */}
      <DevelopmentInfo
        selectedModuleTitle={selectedModuleTitle}
        selectedScenario={selectedScenario}
        userId={userId}
        isProcessingCall={processingState.isProcessingCall}
        processingStage={processingState.processingStage}
        processingProgress={processingState.processingProgress}
      />

      <AfterCallSummaryModal
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        onRetry={handleRetry}
        onNext={handleNext}
      />
    </div>
  );
}