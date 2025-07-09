/**
 * useCallManagement Hook
 * Manages call lifecycle including start, stop, and processing
 */
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Vapi from '@vapi-ai/web';
import { useTrainingStore } from '@/store/training';
import { logger } from '@/utils/logger';

interface UseCallManagementProps {
  vapi: Vapi;
  selectedScenario: any;
  universalAgent: any;
}

interface ProcessingState {
  isProcessingCall: boolean;
  processingStage: string;
  processingProgress: number;
  estimatedTimeRemaining: number;
}

export const useCallManagement = ({ vapi, selectedScenario, universalAgent }: UseCallManagementProps) => {
  const navigate = useNavigate();
  const [isCalling, setIsCalling] = useState(false);
  const [callTimeoutId, setCallTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessingCall: false,
    processingStage: '',
    processingProgress: 0,
    estimatedTimeRemaining: 0
  });

  const {
    selectedModuleId,
    userId,
    setCurrentCallId,
    setAnalysisResult,
    addXP,
    reset
  } = useTrainingStore();

  // Helper function to update processing state with progress
  const updateProcessingState = useCallback((stage: string, progress: number, estimatedTime?: number) => {
    setProcessingState(prev => ({
      ...prev,
      processingStage: stage,
      processingProgress: progress,
      estimatedTimeRemaining: estimatedTime ?? prev.estimatedTimeRemaining
    }));
    logger.info(`🔄 Processing: ${stage} (${progress}%) - ETA: ${estimatedTime || processingState.estimatedTimeRemaining}s`);
  }, [processingState.estimatedTimeRemaining]);

  // Helper function to check call status manually
  const checkCallStatus = async (callId: string) => {
    try {
      const response = await fetch(`/api/call-status/${callId}`);
      if (response.ok) {
        const status = await response.json();
        logger.info("📊 Call status:", status);
        return status;
      }
    } catch (error) {
      logger.error("❌ Error checking call status:", error);
    }
    return null;
  };

  // Enhanced handleCallEnded function with detailed progress tracking
  const handleCallEnded = useCallback(async (callData: any) => {
    // Prevent multiple simultaneous processing
    if (processingState.isProcessingCall) {
      logger.info("⚠️ Call processing already in progress, skipping...");
      return;
    }

    setProcessingState(prev => ({ ...prev, isProcessingCall: true }));
    updateProcessingState("Initializing analysis...", 5, 8);
    logger.info("🔍 Processing call-ended data:", callData);
    
    // Clear any safety timeout
    if (callTimeoutId) {
      clearTimeout(callTimeoutId);
      setCallTimeoutId(null);
    }

    const call_id = callData?.id || useTrainingStore.getState().currentCallId;
    if (!call_id) {
      logger.error("❌ No call_id available");
      setProcessingState(prev => ({ ...prev, isProcessingCall: false, processingStage: '' }));
      return;
    }

    logger.info(`📞 Processing call_id: ${call_id}`);

    // PHASE 1: Quick status checks using the new endpoint
    let webhookProcessed = false;
    let statusAttempts = 0;
    const maxStatusAttempts = 4;
    
    updateProcessingState("Checking if analysis is ready...", 10, 6);
    logger.info("⚡ Starting fast status checks...");
    
    while (statusAttempts < maxStatusAttempts && !webhookProcessed) {
      try {
        const progressPercent = 10 + (statusAttempts * 15); // 10, 25, 40, 55
        updateProcessingState(`Checking analysis status (${statusAttempts + 1}/${maxStatusAttempts})...`, progressPercent, 6 - (statusAttempts * 1.5));
        
        logger.info(`⚡ Status check ${statusAttempts + 1}/${maxStatusAttempts}`);
        
        const statusRes = await fetch(`/api/call-status/${call_id}`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          logger.info(`📊 Status result:`, {
            status: statusData.status,
            processed: statusData.processed,
            hasTranscript: statusData.has_transcript,
            hasScore: statusData.has_score,
            score: statusData.score,
            transcriptLength: statusData.transcript_length
          });
          
          if (statusData.processed && statusData.has_transcript && statusData.has_score) {
            webhookProcessed = true;
            updateProcessingState("Analysis complete! Fetching results...", 60, 2);
            logger.info("✅ Webhook processing confirmed - data is ready!");
            break;
          } else if (statusData.status === "found" && statusAttempts >= 2) {
            logger.info("⚠️ Partial data found after multiple attempts, proceeding...");
            webhookProcessed = true; // Proceed even with partial data
            updateProcessingState("Partial analysis found, retrieving data...", 50, 3);
            break;
          }
        } else {
          logger.warn(`⚠️ Status check failed with HTTP ${statusRes.status}`);
        }
        
      } catch (error) {
        logger.error(`❌ Status check error:`, error);
      }
      
      statusAttempts++;
      
      // Progressive delays for status checks: 600ms, 1000ms, 1500ms, 2000ms
      if (statusAttempts < maxStatusAttempts) {
        const delay = 400 + (statusAttempts * 400);
        logger.info(`⏳ Waiting ${delay}ms before next status check...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // PHASE 2: Fetch the actual data
    let logData: any = null;
    let dataFetchAttempts = 0;
    const maxDataAttempts = webhookProcessed ? 2 : 3; // Fewer attempts if we know data is ready
    
    updateProcessingState("Retrieving call transcript and scoring...", 65, 3);
    logger.info(`🚀 Fetching call data (webhook processed: ${webhookProcessed})...`);
    
    while (dataFetchAttempts < maxDataAttempts && !logData) {
      try {
        const progressPercent = 65 + (dataFetchAttempts * 10); // 65, 75, 85
        updateProcessingState(`Fetching analysis data (${dataFetchAttempts + 1}/${maxDataAttempts})...`, progressPercent, 2);
        
        logger.info(`📥 Data fetch attempt ${dataFetchAttempts + 1}/${maxDataAttempts}`);
        
        const res = await fetch(`/log-call?call_id=${call_id}`);
        if (!res.ok) {
          logger.warn(`⚠️ HTTP ${res.status} on data fetch attempt ${dataFetchAttempts + 1}`);
          dataFetchAttempts++;
          continue;
        }

        const fetchedData = await res.json();
        logger.info(`📥 Fetch attempt ${dataFetchAttempts + 1} response:`, {
          message: fetchedData?.message,
          hasTranscript: !!fetchedData?.transcript,
          transcriptLength: fetchedData?.transcript?.length || 0,
          score: fetchedData?.score,
          sentiment: fetchedData?.sentiment,
          hasCompleteData: fetchedData?.has_complete_data
        });

        // Check if we have valid data
        const hasValidTranscript = fetchedData?.transcript && fetchedData.transcript.length > 50;
        const hasValidScore = fetchedData?.score && fetchedData.score > 0;
        
        if (fetchedData?.message === "found" && (hasValidTranscript || hasValidScore)) {
          logData = fetchedData;
          updateProcessingState("Analysis data retrieved successfully!", 85, 1);
          logger.info("✅ Valid data retrieved!");
          break;
        } else if (fetchedData?.message === "not found" && dataFetchAttempts >= 1) {
          logger.warn("⚠️ No data found after multiple attempts");
          updateProcessingState("No analysis data found, may need to retry...", 50, 0);
          break;
        } else {
          logger.warn(`⚠️ Incomplete data on attempt ${dataFetchAttempts + 1}:`, {
            hasTranscript: hasValidTranscript,
            hasScore: hasValidScore,
            message: fetchedData?.message
          });
        }
        
      } catch (error) {
        logger.error(`❌ Data fetch error:`, error);
      }
      
      dataFetchAttempts++;
      
      // Progressive delays for data fetches: 800ms, 1200ms, 1600ms
      if (dataFetchAttempts < maxDataAttempts) {
        const delay = 600 + (dataFetchAttempts * 400);
        logger.info(`⏳ Waiting ${delay}ms before next data fetch...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // PHASE 3: Process the results
    updateProcessingState("Processing results...", 90, 1);
    
    if (logData && logData.message === "found") {
      try {
        logger.info("📊 Processing successful analysis result:", {
          transcript: logData.transcript?.substring(0, 100) + "...",
          score: logData.score,
          sentiment: logData.sentiment,
          feedback: logData.feedback?.substring(0, 100) + "...",
          xp: logData.xp,
          passed: logData.passed
        });

        // Store analysis result
        setAnalysisResult({
          transcript: logData.transcript || "",
          score: logData.score || 0,
          sentiment: logData.sentiment || "neutral",
          feedback: logData.feedback || "No feedback available",
          xp: logData.xp || 0,
          passed: logData.passed || false,
          duration: logData.duration || 0,
          summary: logData.summary || "",
          bonus_xp: logData.bonus_xp || 0
        });

        // Award XP if available
        if (logData.xp && logData.xp > 0) {
          addXP(logData.xp);
          logger.info(`🎉 Added ${logData.xp} XP to user progress`);
        }

        updateProcessingState("Complete! Redirecting to results...", 100, 0);
        
        // Small delay before navigation for better UX
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Navigate to results page
        navigate("/training/results");
        
      } catch (error) {
        logger.error("❌ Error processing analysis result:", error);
        updateProcessingState("Error processing results", 100, 0);
      }
    } else {
      logger.warn("⚠️ No valid analysis data found after all attempts");
      updateProcessingState("Analysis incomplete - you may need to retry", 100, 0);
      
      // Still navigate to results but with incomplete data
      setAnalysisResult({
        transcript: "",
        score: 0,
        sentiment: "neutral",
        feedback: "Analysis data not available. Please try again.",
        xp: 0,
        passed: false,
        duration: 0,
        summary: "",
        bonus_xp: 0
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      navigate("/training/results");
    }

    // Reset processing state
    setProcessingState(prev => ({ 
      ...prev, 
      isProcessingCall: false,
      processingStage: '',
      processingProgress: 0,
      estimatedTimeRemaining: 0 
    }));
  }, [
    processingState.isProcessingCall,
    callTimeoutId,
    setAnalysisResult,
    addXP,
    navigate,
    updateProcessingState
  ]);

  const startSimulation = useCallback(async () => {
    if (!selectedScenario || !selectedModuleId || !userId) {
      logger.error("❌ Missing required data for simulation");
      return;
    }

    if (isCalling) {
      logger.warn("⚠️ Call already in progress");
      return;
    }

    try {
      setIsCalling(true);
      logger.info("🚀 Starting simulation...");

      // Call the start-simulation API
      const response = await fetch("/api/start-simulation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scenario_id: selectedScenario.id,
          module_id: selectedModuleId,
          user_id: userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      logger.info("✅ Simulation started:", result);

      setCurrentCallId(result.call_id);

      // Start the call
      await vapi.start(universalAgent?.vapi_agent_id || universalAgent?.id);

      // Set a safety timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        logger.warn("⚠️ Call safety timeout reached");
        setIsCalling(false);
        handleCallEnded({ id: result.call_id });
      }, 300000); // 5 minutes
      
      setCallTimeoutId(timeoutId);

    } catch (error) {
      logger.error("❌ Error starting simulation:", error);
      setIsCalling(false);
    }
  }, [selectedScenario, selectedModuleId, userId, isCalling, universalAgent, vapi, setCurrentCallId, handleCallEnded]);

  const stopSimulation = useCallback(async () => {
    try {
      logger.info("🛑 Stopping simulation...");
      setIsCalling(false);
      
      // Clear timeout
      if (callTimeoutId) {
        clearTimeout(callTimeoutId);
        setCallTimeoutId(null);
      }

      // Stop the call
      await vapi.stop();

      logger.info("✅ Simulation stopped");
    } catch (error) {
      logger.error("❌ Error stopping simulation:", error);
    }
  }, [vapi, callTimeoutId]);

  const handleTestProcessing = useCallback(async () => {
    const testCallId = "test-call-id-" + Date.now();
    logger.info("🧪 Testing with call ID:", testCallId);
    await handleCallEnded({ id: testCallId });
  }, [handleCallEnded]);

  return {
    isCalling,
    processingState,
    startSimulation,
    stopSimulation,
    handleCallEnded,
    handleTestProcessing,
    updateProcessingState,
    checkCallStatus
  };
};