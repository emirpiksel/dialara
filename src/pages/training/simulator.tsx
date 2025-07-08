import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrainingStore } from '@/store/training';
import { AfterCallSummaryModal } from '@/components/AfterCallSummaryModal';
import { Button } from '@/components/Button';
import { XCircle, PhoneCall, Clock, BarChart3, FileText } from 'lucide-react';
import Vapi from '@vapi-ai/web';

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
  const [isCalling, setIsCalling] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [universalAgent, setUniversalAgent] = useState<any | null>(null);
  const [callTimeoutId, setCallTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [isProcessingCall, setIsProcessingCall] = useState(false);
  
  // Enhanced processing state management
  const [processingStage, setProcessingStage] = useState<string>('');
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number>(0);

  const navigate = useNavigate();
  const {
    selectedModuleId,
    selectedModuleTitle,
    selectedCategoryName,
    userId,
    setCurrentCallId,
    setAnalysisResult,
    addXP,
    reset,
  } = useTrainingStore();

  // Helper function to update processing state with progress
  const updateProcessingState = (stage: string, progress: number, estimatedTime?: number) => {
    setProcessingStage(stage);
    setProcessingProgress(progress);
    if (estimatedTime !== undefined) {
      setEstimatedTimeRemaining(estimatedTime);
    }
    console.log(`🔄 Processing: ${stage} (${progress}%) - ETA: ${estimatedTime || estimatedTimeRemaining}s`);
  };

  // Helper function to check if errors are expected during call end
  const isExpectedCallEndError = (error: any): boolean => {
    const errorMessage = error?.message || error?.toString() || '';
    const errorCode = error?.code || '';
    
    const expectedErrors = [
      'Meeting ended due to ejection',
      'Meeting has ended',
      'Call ended',
      'Connection closed',
      'WebRTC connection closed',
      'Daily meeting ended',
      'ejected from meeting',
      'MEETING_EJECTED',
      'CALL_ENDED'
    ];
    
    return expectedErrors.some(expected => 
      errorMessage.toLowerCase().includes(expected.toLowerCase()) ||
      errorCode.toLowerCase().includes(expected.toLowerCase())
    );
  };

  // Helper function to check call status manually
  const checkCallStatus = async (callId: string) => {
    try {
      const response = await fetch(`/api/call-status/${callId}`);
      if (response.ok) {
        const status = await response.json();
        console.log("📊 Call status:", status);
        return status;
      }
    } catch (error) {
      console.error("❌ Error checking call status:", error);
    }
    return null;
  };

  // Enhanced Vapi event handlers setup
  const setupVapiEventHandlers = () => {
    // Clear any existing listeners to prevent duplicates
    vapi.removeAllListeners();

    vapi.on("call-started", () => {
      console.log("🟢 Vapi call-started event received");
      setProcessingStage('');
      setProcessingProgress(0);
    });

    vapi.on("call-ended", (callData) => {
      console.log("🔴 Vapi call-ended event received", {
        callId: callData?.id,
        endedReason: callData?.endedReason,
        duration: callData?.duration
      });
      setIsCalling(false);
      
      if (!isProcessingCall) {
        handleCallEnded(callData);
      }
    });

    vapi.on("hang", (data) => {
      console.log("📞 Vapi hang event received", data);
      setIsCalling(false);
      if (!isProcessingCall) {
        handleCallEnded(data);
      }
    });

    vapi.on("disconnect", (data) => {
      console.log("🔌 Vapi disconnect event received", data);
      setIsCalling(false);
      if (!isProcessingCall) {
        handleCallEnded(data);
      }
    });

    vapi.on("error", (error) => {
      if (isExpectedCallEndError(error)) {
        console.info("ℹ️ Expected call end event:", error?.message || error);
      } else {
        console.error("❌ Unexpected Vapi error:", error);
      }
      
      setIsCalling(false);
      
      const currentCallId = useTrainingStore.getState().currentCallId;
      if (currentCallId && !isProcessingCall && !isExpectedCallEndError(error)) {
        handleCallEnded({ id: currentCallId });
      }
    });

    // Enhanced transcript logging with filtering
    vapi.on("transcript", (transcript) => {
      if (transcript?.text && transcript.text.length > 10) {
        const speaker = transcript.type === "final" ? "📝" : "📄";
        console.log(`${speaker} ${transcript.type} transcript:`, transcript.text.substring(0, 100) + "...");
      }
    });

    vapi.on("message", (message) => {
      // Filter out noisy volume-level messages
      if (message.type !== "volume-level") {
        console.log("📨 Vapi message:", message.type);
      }
      
      // Monitor for conversation end signals
      if (message.type === "conversation-update" && message.conversation?.status === "ended") {
        console.log("🔚 Conversation ended via message");
        setIsCalling(false);
        if (!isProcessingCall) {
          handleCallEnded({ id: useTrainingStore.getState().currentCallId });
        }
      }
    });

    vapi.on("speech-start", () => {
      console.log("🎤 User speech started");
    });

    vapi.on("speech-end", () => {
      console.log("🎤 User speech ended");
    });
  };

  // Enhanced handleCallEnded function with detailed progress tracking
  const handleCallEnded = async (callData: any) => {
    // Prevent multiple simultaneous processing
    if (isProcessingCall) {
      console.log("⚠️ Call processing already in progress, skipping...");
      return;
    }

    setIsProcessingCall(true);
    updateProcessingState("Initializing analysis...", 5, 8);
    console.log("🔍 Processing call-ended data:", callData);
    
    // Clear any safety timeout
    if (callTimeoutId) {
      clearTimeout(callTimeoutId);
      setCallTimeoutId(null);
    }
    
    const call_id = callData?.id || useTrainingStore.getState().currentCallId;
    if (!call_id) {
      console.error("❌ No call_id available");
      setIsProcessingCall(false);
      setProcessingStage('');
      return;
    }

    console.log(`📞 Processing call_id: ${call_id}`);

    // PHASE 1: Quick status checks using the new endpoint
    let webhookProcessed = false;
    let statusAttempts = 0;
    const maxStatusAttempts = 4;
    
    updateProcessingState("Checking if analysis is ready...", 10, 6);
    console.log("⚡ Starting fast status checks...");
    
    while (statusAttempts < maxStatusAttempts && !webhookProcessed) {
      try {
        const progressPercent = 10 + (statusAttempts * 15); // 10, 25, 40, 55
        updateProcessingState(`Checking analysis status (${statusAttempts + 1}/${maxStatusAttempts})...`, progressPercent, 6 - (statusAttempts * 1.5));
        
        console.log(`⚡ Status check ${statusAttempts + 1}/${maxStatusAttempts}`);
        
        const statusRes = await fetch(`/api/call-status/${call_id}`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          console.log(`📊 Status result:`, {
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
            console.log("✅ Webhook processing confirmed - data is ready!");
            break;
          } else if (statusData.status === "found" && statusAttempts >= 2) {
            console.log("⚠️ Partial data found after multiple attempts, proceeding...");
            webhookProcessed = true; // Proceed even with partial data
            updateProcessingState("Partial analysis found, retrieving data...", 50, 3);
            break;
          }
        } else {
          console.warn(`⚠️ Status check failed with HTTP ${statusRes.status}`);
        }
        
      } catch (error) {
        console.error(`❌ Status check error:`, error);
      }
      
      statusAttempts++;
      
      // Progressive delays for status checks: 600ms, 1000ms, 1500ms, 2000ms
      if (statusAttempts < maxStatusAttempts) {
        const delay = 400 + (statusAttempts * 400);
        console.log(`⏳ Waiting ${delay}ms before next status check...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // PHASE 2: Fetch the actual data
    let logData: any = null;
    let dataFetchAttempts = 0;
    const maxDataAttempts = webhookProcessed ? 2 : 3; // Fewer attempts if we know data is ready
    
    updateProcessingState("Retrieving call transcript and scoring...", 65, 3);
    console.log(`🚀 Fetching call data (webhook processed: ${webhookProcessed})...`);
    
    while (dataFetchAttempts < maxDataAttempts && !logData) {
      try {
        const progressPercent = 65 + (dataFetchAttempts * 10); // 65, 75, 85
        updateProcessingState(`Fetching analysis data (${dataFetchAttempts + 1}/${maxDataAttempts})...`, progressPercent, 2);
        
        console.log(`📥 Data fetch attempt ${dataFetchAttempts + 1}/${maxDataAttempts}`);
        
        const res = await fetch(`/log-call?call_id=${call_id}`);
        if (!res.ok) {
          console.warn(`⚠️ HTTP ${res.status} on data fetch attempt ${dataFetchAttempts + 1}`);
          dataFetchAttempts++;
          continue;
        }

        const fetchedData = await res.json();
        console.log(`📥 Fetch attempt ${dataFetchAttempts + 1} response:`, {
          message: fetchedData?.message,
          hasTranscript: !!fetchedData?.transcript,
          transcriptLength: fetchedData?.transcript?.length || 0,
          score: fetchedData?.score,
          sentiment: fetchedData?.sentiment,
          hasCompleteData: fetchedData?.has_complete_data
        });

        // Check if we have valid data
        const hasValidTranscript = fetchedData?.transcript && 
                                  fetchedData.transcript.trim().length > 0 && 
                                  !fetchedData.transcript.toLowerCase().includes("no transcript");
        
        const hasValidScore = fetchedData?.score !== null && 
                             fetchedData?.score !== undefined && 
                             fetchedData?.score >= 0; // Allow score of 0

        if (fetchedData?.message === "found" && (hasValidTranscript || hasValidScore)) {
          logData = fetchedData;
          updateProcessingState("Successfully retrieved analysis results!", 85, 1);
          console.log("✅ Valid data received from backend");
          break;
        } else if (fetchedData?.message === "found" && dataFetchAttempts >= 1) {
          console.log("⚠️ Partial data found, proceeding anyway...");
          logData = fetchedData;
          updateProcessingState("Partial data retrieved, processing...", 80, 1);
          break;
        }

      } catch (error) {
        console.error(`❌ Error on data fetch attempt ${dataFetchAttempts + 1}:`, error);
      }

      dataFetchAttempts++;
      
      // Short delays for data fetching since status check confirmed readiness
      if (dataFetchAttempts < maxDataAttempts) {
        const delay = webhookProcessed ? 500 : 1000; // Shorter delay if we know data is ready
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // PHASE 3: Final fallback attempt if still no data
    if (!logData || logData?.message !== "found") {
      updateProcessingState("Performing final data retrieval attempt...", 88, 2);
      console.log("🔄 Final fallback attempt after longer wait...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      try {
        const res = await fetch(`/log-call?call_id=${call_id}`);
        if (res.ok) {
          const finalData = await res.json();
          if (finalData?.message === "found") {
            logData = finalData;
            updateProcessingState("Final attempt successful!", 92, 1);
            console.log("✅ Final fallback attempt successful");
          }
        }
      } catch (error) {
        console.error("❌ Final fallback attempt failed:", error);
      }
    }

    // PHASE 4: Process the results
    updateProcessingState("Processing and calculating final results...", 95, 1);
    
    if (logData?.message === "found") {
      console.log("✅ Processing valid data from backend");
      
      const finalScore = logData.score || 0;
      const finalTranscript = logData.transcript || "No transcript available";
      const finalFeedback = logData.feedback || logData.summary || "Training session completed.";
      const finalSentiment = logData.sentiment || "neutral";
      const finalPassed = logData.passed !== undefined ? logData.passed : (finalScore >= 5);
      const finalXP = logData.xp || (finalScore * 10);
      const finalBonusXP = logData.bonus_xp || 0;
      const finalDuration = logData.duration || 0;

      console.log("📊 Final processed data:", {
        score: finalScore,
        transcriptLength: finalTranscript.length,
        sentiment: finalSentiment,
        passed: finalPassed,
        xp: finalXP,
        bonusXP: finalBonusXP,
        duration: finalDuration,
        feedbackLength: finalFeedback.length
      });

      // Update Zustand store
      setAnalysisResult({
        feedback: finalFeedback,
        sentiment: finalSentiment,
        score: finalScore,
        passed: finalPassed,
        transcript: finalTranscript,
        xp: finalXP,
        bonusXP: finalBonusXP,
        duration: finalDuration,
      });

      // Add XP if passed
      if (finalPassed && finalXP > 0) {
        console.log(`🎉 Adding ${finalXP} XP to user (including ${finalBonusXP} bonus XP)`);
        addXP(finalXP);
      }

      updateProcessingState("Analysis complete! Preparing summary...", 100, 0);

    } else {
      console.warn("⚠️ No valid data received after all attempts, using fallback");
      
      // Provide helpful fallback response
      setAnalysisResult({
        feedback: "Your training session has been completed and is being processed. The results will be available shortly. Please check your training history or try again in a moment.",
        sentiment: "neutral",
        score: 0,
        passed: false,
        transcript: "Session data is being processed by our servers. Please try again in a moment if you need immediate access to the transcript.",
        xp: 0,
        bonusXP: 0,
        duration: 0,
      });

      updateProcessingState("Processing complete - partial results available", 100, 0);
    }

    // PHASE 5: Clean up - End session API call (non-blocking)
    console.log("🧹 Cleaning up session...");
    
    fetch("/api/end-training-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ call_id }),
    })
    .then(response => {
      if (response.ok) {
        console.log("✅ Training session ended successfully");
      } else {
        console.warn("⚠️ Failed to end training session properly");
      }
    })
    .catch(error => {
      console.error("❌ Error ending training session:", error);
    });

    // Mark processing as complete
    setIsProcessingCall(false);
    setProcessingStage('');
    setProcessingProgress(0);
    setEstimatedTimeRemaining(0);

    // Show the summary modal with a small delay to ensure state updates
    setTimeout(() => {
      console.log("🎭 Opening summary modal");
      setShowSummary(true);
    }, 300);
  };

  useEffect(() => {
    if (!selectedModuleId) {
      navigate('/training');
      return;
    }

    const loadScenarios = async () => {
      try {
        const res = await fetch(`/api/getScenariosByModule/${selectedModuleId}`);
        const data = await res.json();
        setScenarios(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("❌ Error fetching scenarios:", err);
      }
    };

    const loadAgent = async () => {
      try {
        const res = await fetch('/api/getUniversalAgent');
        const data = await res.json();
        if (data?.length > 0) setUniversalAgent(data[0]);
      } catch (err) {
        console.error("❌ Error fetching universal agent:", err);
      }
    };

    loadScenarios();
    loadAgent();
  }, [selectedModuleId, navigate]);

  const startSimulation = async () => {
    console.log("🔥 startSimulation triggered with optimizations");

    if (!selectedModuleId || !selectedScenario || !userId) {
      console.warn("⚠️ Missing required state:", {
        selectedModuleId: !!selectedModuleId,
        selectedScenario: !!selectedScenario,
        userId: !!userId
      });
      return;
    }

    try {
      console.log("🎙️ Starting optimized Vapi web call...");
      
      const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID;
      if (!assistantId) {
        console.error("❌ Missing VITE_VAPI_ASSISTANT_ID in .env");
        return;
      }

      const systemPrompt =
        selectedScenario.prompt_template
          ?.replace("{{title}}", selectedScenario.title)
          .replace("{{module}}", selectedModuleTitle || "Unknown Module")
          .replace("{{category}}", selectedCategoryName || "Unknown Category") ||
        "You are a helpful assistant.";

      // Setup event handlers before starting the call
      setupVapiEventHandlers();

      // Start the web call
      const vapiCall = await vapi.start(assistantId, {
        firstMessage: selectedScenario.first_message || "Hello, how can I help you today?",
        transcriber: {
          provider: "deepgram",
          model: "nova-2",
          language: "en-US",
        },
        recordingEnabled: true,
        model: {
          provider: "openai",
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
          ],
        },
        variableValues: {
          title: selectedScenario.title,
          module: selectedModuleTitle || "Unknown Module",
          category: selectedCategoryName || "Unknown Category",
        },
      });

      const callId = vapiCall?.id;
      if (!callId) {
        throw new Error("No call ID returned from Vapi");
      }

      console.log("✅ Optimized Vapi web call started:", callId);
      
      // Store the call in backend for webhook processing
      try {
        const logResponse = await fetch("/api/start-training-call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            call_id: callId,
            user_id: userId,
            module_id: selectedModuleId,
            scenario_id: selectedScenario.id,
          }),
        });
        
        if (logResponse.ok) {
          console.log("✅ Call logged in backend for webhook processing");
        } else {
          console.error("❌ Failed to log call in backend:", await logResponse.text());
          throw new Error("Failed to initialize session tracking");
        }
      } catch (error) {
        console.error("❌ Critical error logging call in backend:", error);
        alert("Failed to initialize session tracking. The call may not be properly recorded.");
        return;
      }

      setCurrentCallId(callId);
      setIsCalling(true);

      // Set a safety timeout (reduced from 2 minutes to 90 seconds due to faster processing)
      const timeoutId = setTimeout(async () => {
        console.log("⏰ Call safety timeout - checking if call is still active...");
        
        // Quick status check before forcing completion
        const status = await checkCallStatus(callId);
        if (status?.processed) {
          console.log("✅ Call was already processed, showing results...");
          await handleCallEnded({ id: callId });
        } else if (useTrainingStore.getState().isCallActive && !isProcessingCall) {
          console.log("⏰ Call appears to be stuck, forcing completion check...");
          await handleCallEnded({ id: callId });
        }
      }, 90000); // Reduced to 90 seconds

      setCallTimeoutId(timeoutId);

    } catch (err) {
      console.error("❌ Failed to start optimized simulation:", err);
      setIsCalling(false);
      alert(`Failed to start simulation: ${err.message}`);
    }
  };

  const stopSimulation = async () => {
    console.log("🛑 Stopping optimized simulation...");
    
    // Clear any safety timeout
    if (callTimeoutId) {
      clearTimeout(callTimeoutId);
      setCallTimeoutId(null);
    }
    
    // Stop the Vapi call
    try {
      vapi.stop();
      console.log("✅ Vapi call stopped successfully");
    } catch (error) {
      console.error("❌ Error stopping Vapi call:", error);
    }
    
    setIsCalling(false);
    
    // Quick status check to see if webhook already processed
    const currentCallId = useTrainingStore.getState().currentCallId;
    if (currentCallId && !isProcessingCall) {
      console.log("📞 Checking if manually stopped call was already processed...");
      
      const status = await checkCallStatus(currentCallId);
      if (status?.processed) {
        console.log("✅ Call was already processed by webhook");
        await handleCallEnded({ id: currentCallId });
      } else {
        console.log("⏳ Webhook hasn't processed yet, waiting briefly...");
        // Wait a bit for webhook to process, then check again
        setTimeout(async () => {
          if (!isProcessingCall) {
            await handleCallEnded({ id: currentCallId });
          }
        }, 1500);
      }
    } else {
      console.warn("⚠️ No call ID found for manual processing or already processing");
    }
  };

  const handleRetry = () => {
    setShowSummary(false);
    setIsProcessingCall(false);
    setProcessingStage('');
    setProcessingProgress(0);
    startSimulation();
  };

  const handleNext = () => {
    reset();
    setIsProcessingCall(false);
    setProcessingStage('');
    setProcessingProgress(0);
    navigate("/training");
  };

  // Enhanced status indicator component
  const StatusIndicator = () => {
    if (isCalling && !isProcessingCall) {
      return (
        <div className="flex items-center space-x-2">
          <div className="animate-pulse rounded-full h-3 w-3 bg-green-500"></div>
          <span className="text-sm text-green-600 font-medium">
            Call in progress
          </span>
        </div>
      );
    }

    if (isProcessingCall && processingStage) {
      return (
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
            {processingProgress > 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600">
                  {Math.round(processingProgress)}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-blue-600 font-medium">
              {processingStage}
            </span>
            {estimatedTimeRemaining > 0 && (
              <span className="text-xs text-gray-500">
                ~{estimatedTimeRemaining}s remaining
              </span>
            )}
          </div>
          {processingProgress > 0 && (
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              ></div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold flex items-center mb-4">
        <PhoneCall className="mr-2" /> Training Simulation
      </h1>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">1. Select a Scenario</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedScenario?.id === scenario.id 
                  ? "border-blue-500 bg-blue-50" 
                  : "hover:border-gray-300"
              }`}
              onClick={() => setSelectedScenario(scenario)}
            >
              <h3 className="font-semibold">{scenario.title}</h3>
              <p className="text-gray-500 text-sm">{scenario.description}</p>
              <div className="mt-2">
                <span className="text-xs text-gray-400">
                  Difficulty: {scenario.difficulty}/10
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!isCalling ? (
        <div className="flex gap-4">
          <Button
            onClick={startSimulation}
            disabled={!selectedScenario || !selectedModuleId || !userId || isProcessingCall}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            🎙️ Start Optimized Call
          </Button>
          
          {/* Debug button for development */}
          {process.env.NODE_ENV === 'development' && (
            <Button
              onClick={async () => {
                const testCallId = "test-call-id-" + Date.now();
                console.log("🧪 Testing with call ID:", testCallId);
                await handleCallEnded({ id: testCallId });
              }}
              disabled={isProcessingCall}
              className="bg-purple-600 hover:bg-purple-700 text-sm disabled:opacity-50"
            >
              🧪 Test Processing States
            </Button>
          )}
        </div>
      ) : (
        <div className="flex gap-4 items-center">
          <Button 
            className="bg-red-500 hover:bg-red-600 text-white" 
            onClick={stopSimulation}
            disabled={isProcessingCall}
          >
            <XCircle className="mr-2 w-4 h-4" /> Stop Call
          </Button>
        </div>
      )}

      {/* Enhanced Status Display */}
      <div className="mt-4">
        <StatusIndicator />
      </div>

      {/* Enhanced Development info panel */}
      {process.env.NODE_ENV === 'development' && (
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
      )}

      <AfterCallSummaryModal
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        onRetry={handleRetry}
        onNext={handleNext}
      />
    </div>
  );
}