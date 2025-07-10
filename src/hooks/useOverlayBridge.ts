import { useEffect, useRef } from 'react';
import { getOverlayBridge, disconnectOverlayBridge } from '../services/overlayBridge';
import { useAppMode } from '../store/useAppMode';

export const useOverlayBridge = () => {
  const bridgeRef = useRef(getOverlayBridge());
  const { mode } = useAppMode();

  useEffect(() => {
    // Only initialize bridge in CRM mode
    if (mode === 'crm') {
      bridgeRef.current = getOverlayBridge();
    }

    // Cleanup on component unmount
    return () => {
      // Don't disconnect on unmount unless app is closing
      // The bridge should persist across component renders
    };
  }, [mode]);

  // Cleanup function for app shutdown
  useEffect(() => {
    const handleBeforeUnload = () => {
      disconnectOverlayBridge();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return {
    bridge: bridgeRef.current,
    isConnected: bridgeRef.current?.getConnectionStatus() || false,
    sendCallStarted: (callData: any) => bridgeRef.current?.sendCallStarted(callData),
    sendCallEnded: (callData: any) => bridgeRef.current?.sendCallEnded(callData),
    sendTranscriptUpdate: (transcript: string, shouldTrigger?: boolean) => 
      bridgeRef.current?.sendTranscriptUpdate(transcript, shouldTrigger),
    sendLeadUpdate: (leadData: any) => bridgeRef.current?.sendLeadUpdate(leadData),
  };
};