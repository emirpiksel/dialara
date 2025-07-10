import { useCallsStore } from '../store/calls';
import { useLeadsStore } from '../store/leads';
import { useAuthStore } from '../store/auth';
import { useAppMode } from '../store/useAppMode';

export class OverlayBridge {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;
  private currentCallId: string | null = null;
  private lastTranscriptUpdate = '';
  private storeUnsubscribers: (() => void)[] = [];

  constructor() {
    this.connect();
    this.setupStoreListeners();
  }

  private async connect() {
    // Only connect in CRM mode
    const { mode } = useAppMode.getState();
    if (mode !== 'crm') {
      console.log('Overlay bridge: Not in CRM mode, skipping connection');
      return;
    }

    try {
      this.ws = new WebSocket('ws://localhost:8765');
      
      this.ws.onopen = () => {
        console.log('Overlay bridge: Connected to agent assist overlay');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.sendConnectionStatus(true);
        this.sendInitialData();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleOverlayMessage(data);
        } catch (error) {
          console.error('Overlay bridge: Error parsing message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('Overlay bridge: Connection closed');
        this.isConnected = false;
        this.sendConnectionStatus(false);
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('Overlay bridge: WebSocket error:', error);
        this.isConnected = false;
      };

    } catch (error) {
      console.error('Overlay bridge: Failed to connect:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Overlay bridge: Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.log('Overlay bridge: Max reconnect attempts reached');
    }
  }

  private setupStoreListeners() {
    // Listen for app mode changes
    const unsubscribeAppMode = useAppMode.subscribe((state) => {
      this.sendData({
        type: 'app-mode-changed',
        payload: { mode: state.mode }
      });

      // Reconnect when switching to CRM mode
      if (state.mode === 'crm' && !this.isConnected) {
        this.connect();
      }
    });

    // Listen for call changes
    const unsubscribeCalls = useCallsStore.subscribe((state) => {
      // Send call updates when calls change
      if (state.calls.length > 0) {
        const latestCall = state.calls[0]; // Most recent call
        
        if (latestCall.id !== this.currentCallId) {
          this.currentCallId = latestCall.id;
          this.sendData({
            type: 'call-started',
            payload: {
              call_id: latestCall.id,
              caller_number: latestCall.caller_number,
              contact_name: latestCall.clinic_name,
              duration: latestCall.duration,
              status: latestCall.status,
              call_type: latestCall.call_type,
              timestamp: latestCall.timestamp
            }
          });
        }
      }
    });

    // Listen for lead changes
    const unsubscribeLeads = useLeadsStore.subscribe((state) => {
      // Send lead data when leads change
      if (state.leads.length > 0) {
        const currentLead = state.leads.find(lead => 
          lead.call_status === 'active' || lead.call_status === 'in_progress'
        );

        if (currentLead) {
          this.sendData({
            type: 'lead-data',
            payload: {
              id: currentLead.id,
              full_name: currentLead.full_name,
              phone_number: currentLead.phone_number,
              email: currentLead.email,
              status: currentLead.status,
              clinic_name: currentLead.clinic_name,
              notes: currentLead.notes,
              source: currentLead.source,
              last_contact_date: currentLead.last_contact_date
            }
          });
        }
      }
    });

    this.storeUnsubscribers = [
      unsubscribeAppMode,
      unsubscribeCalls,
      unsubscribeLeads
    ];
  }

  private sendInitialData() {
    // Send current app mode
    const { mode } = useAppMode.getState();
    this.sendData({
      type: 'app-mode-changed',
      payload: { mode }
    });

    // Send current call data
    const { calls } = useCallsStore.getState();
    if (calls.length > 0) {
      const latestCall = calls[0];
      this.sendData({
        type: 'call-started',
        payload: {
          call_id: latestCall.id,
          caller_number: latestCall.caller_number,
          contact_name: latestCall.clinic_name,
          duration: latestCall.duration,
          status: latestCall.status,
          call_type: latestCall.call_type,
          timestamp: latestCall.timestamp
        }
      });
    }

    // Send current lead data
    const { leads } = useLeadsStore.getState();
    const activeLead = leads.find(lead => 
      lead.call_status === 'active' || lead.call_status === 'in_progress'
    );

    if (activeLead) {
      this.sendData({
        type: 'lead-data',
        payload: {
          id: activeLead.id,
          full_name: activeLead.full_name,
          phone_number: activeLead.phone_number,
          email: activeLead.email,
          status: activeLead.status,
          clinic_name: activeLead.clinic_name,
          notes: activeLead.notes,
          source: activeLead.source,
          last_contact_date: activeLead.last_contact_date
        }
      });
    }
  }

  private sendConnectionStatus(connected: boolean) {
    this.sendData({
      type: 'connection-status',
      payload: { connected }
    });
  }

  private handleOverlayMessage(data: any) {
    console.log('Overlay bridge: Received message from overlay:', data);
    
    // Handle requests from overlay
    switch (data.type) {
      case 'request-current-data':
        this.sendInitialData();
        break;
      case 'ping':
        this.sendData({ type: 'pong', payload: {} });
        break;
      default:
        console.log('Overlay bridge: Unknown message type:', data.type);
    }
  }

  private sendData(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
      } catch (error) {
        console.error('Overlay bridge: Error sending data:', error);
      }
    }
  }

  // Public methods for external use
  public sendCallStarted(callData: any) {
    this.currentCallId = callData.call_id;
    this.sendData({
      type: 'call-started',
      payload: callData
    });
  }

  public sendCallEnded(callData: any) {
    this.currentCallId = null;
    this.sendData({
      type: 'call-ended',
      payload: callData
    });
  }

  public sendTranscriptUpdate(transcript: string, shouldTriggerSuggestions = false) {
    if (transcript !== this.lastTranscriptUpdate) {
      this.lastTranscriptUpdate = transcript;
      this.sendData({
        type: 'transcript-update',
        payload: {
          transcript,
          shouldTriggerSuggestions: shouldTriggerSuggestions || transcript.length > this.lastTranscriptUpdate.length + 50
        }
      });
    }
  }

  public sendLeadUpdate(leadData: any) {
    this.sendData({
      type: 'lead-data',
      payload: leadData
    });
  }

  public disconnect() {
    // Cleanup store listeners
    this.storeUnsubscribers.forEach(unsubscribe => unsubscribe());
    this.storeUnsubscribers = [];

    // Close WebSocket connection
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.currentCallId = null;
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
let overlayBridge: OverlayBridge | null = null;

export const getOverlayBridge = (): OverlayBridge => {
  if (!overlayBridge) {
    overlayBridge = new OverlayBridge();
  }
  return overlayBridge;
};

export const disconnectOverlayBridge = (): void => {
  if (overlayBridge) {
    overlayBridge.disconnect();
    overlayBridge = null;
  }
};