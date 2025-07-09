/**
 * useVapiEvents Hook
 * Manages Vapi event handling and call state
 */
import { useEffect } from 'react';
import Vapi from '@vapi-ai/web';
import { useTrainingStore } from '@/store/training';
import { logger } from '@/utils/logger';

interface VapiEventHandlers {
  onCallStarted: () => void;
  onCallEnded: (callData: any) => void;
  onHang: (data: any) => void;
  onDisconnect: (data: any) => void;
  onError: (error: any) => void;
  onTranscript: (transcript: any) => void;
  onMessage: (message: any) => void;
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
}

interface UseVapiEventsProps {
  vapi: Vapi;
  isProcessingCall: boolean;
  setIsCalling: (calling: boolean) => void;
  setProcessingStage: (stage: string) => void;
  setProcessingProgress: (progress: number) => void;
  handleCallEnded: (callData: any) => void;
}

export const useVapiEvents = ({
  vapi,
  isProcessingCall,
  setIsCalling,
  setProcessingStage,
  setProcessingProgress,
  handleCallEnded
}: UseVapiEventsProps) => {
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

  const setupVapiEventHandlers = () => {
    // Clear any existing listeners to prevent duplicates
    vapi.removeAllListeners();

    vapi.on("call-started", async (callData) => {
      logger.info("🟢 Vapi call-started event received", {
        callId: callData?.id,
        tempCallId: useTrainingStore.getState().currentCallId
      });
      
      // Update training session with real call_id from Vapi
      const tempCallId = useTrainingStore.getState().currentCallId;
      const realCallId = callData?.id;
      
      if (tempCallId && realCallId && tempCallId !== realCallId) {
        try {
          logger.info(`🔄 Updating training session: ${tempCallId} → ${realCallId}`);
          
          const response = await fetch('/api/update-call-id', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              old_call_id: tempCallId,
              new_call_id: realCallId,
            }),
          });
          
          if (response.ok) {
            const result = await response.json();
            logger.info("✅ Training session call_id updated successfully", result);
            
            // Update the store with the real call_id
            useTrainingStore.getState().setCurrentCallId(realCallId);
          } else {
            logger.error("❌ Failed to update training session call_id", {
              status: response.status,
              tempCallId,
              realCallId
            });
          }
        } catch (error) {
          logger.error("❌ Error updating training session call_id", error);
        }
      }
      
      setProcessingStage('');
      setProcessingProgress(0);
    });

    vapi.on("call-ended", (callData) => {
      logger.info("🔴 Vapi call-ended event received", {
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
      logger.info("📞 Vapi hang event received", data);
      setIsCalling(false);
      if (!isProcessingCall) {
        handleCallEnded(data);
      }
    });

    vapi.on("disconnect", (data) => {
      logger.info("🔌 Vapi disconnect event received", data);
      setIsCalling(false);
      if (!isProcessingCall) {
        handleCallEnded(data);
      }
    });

    vapi.on("error", (error) => {
      if (isExpectedCallEndError(error)) {
        logger.info("ℹ️ Expected call end event:", error?.message || error);
      } else {
        logger.error("❌ Unexpected Vapi error:", error);
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
        logger.info(`${speaker} ${transcript.type} transcript:`, transcript.text.substring(0, 100) + "...");
      }
    });

    vapi.on("message", (message) => {
      // Filter out noisy volume-level messages
      if (message.type !== "volume-level") {
        logger.info("📨 Vapi message:", message.type);
      }
      
      // Monitor for conversation end signals
      if (message.type === "conversation-update" && message.conversation?.status === "ended") {
        logger.info("🔚 Conversation ended via message");
        setIsCalling(false);
        if (!isProcessingCall) {
          handleCallEnded({ id: useTrainingStore.getState().currentCallId });
        }
      }
    });

    vapi.on("speech-start", () => {
      logger.info("🎤 User speech started");
    });

    vapi.on("speech-end", () => {
      logger.info("🎤 User speech ended");
    });
  };

  useEffect(() => {
    setupVapiEventHandlers();
    
    // Cleanup function
    return () => {
      vapi.removeAllListeners();
    };
  }, [vapi, isProcessingCall, handleCallEnded]);

  return {
    setupVapiEventHandlers,
    isExpectedCallEndError
  };
};