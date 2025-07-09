/**
 * API Service Layer
 * Centralized API calls with consistent error handling and typing
 */

import { CallLog, TrainingSession, TrainingScenario, User } from '@/types';
import { logger } from '@/utils/logger';

// Base API configuration
const API_BASE_URL = '/api';

// Generic API error class
export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data: any = null
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

// Generic API request function with error handling
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `${API_BASE_URL}/${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    logger.info(`🌐 API Request: ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      logger.error(`❌ API Error: ${response.status} ${response.statusText}`, errorData);
      throw new ApiError(response.status, response.statusText, errorData);
    }

    const data = await response.json();
    logger.info(`✅ API Success: ${options.method || 'GET'} ${url}`);
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    logger.error(`❌ API Request failed: ${url}`, error);
    throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Call Management API
export const callApi = {
  // Get call logs for the main calls page
  getCallLogs: (): Promise<CallLog[]> => {
    return apiRequest<CallLog[]>('/api/getCallLogs');
  },

  // Get specific call log details
  getCallLogDetails: (callId: string): Promise<CallLog> => {
    return apiRequest<CallLog>(`/api/getCallLog/${callId}`);
  },

  // Get call details (training-specific)
  getCallDetails: (callId: string): Promise<any> => {
    return apiRequest<any>(`/api/getCallDetails?call_id=${callId}`);
  },

  // Check call processing status
  getCallStatus: (callId: string): Promise<{
    status: string;
    processed: boolean;
    has_transcript: boolean;
    has_score: boolean;
    score: number;
    transcript_length: number;
    call_id: string;
    checked_at: string;
  }> => {
    return apiRequest(`/api/call-status/${callId}`);
  },

  // Log call (GET version)
  logCall: (callId: string): Promise<{
    message: string;
    transcript: string;
    duration: number;
    score: number;
    summary: string;
    sentiment: string;
    feedback: string;
    xp: number;
    bonus_xp: number;
    passed: boolean;
    call_id: string;
    retrieved_at: string;
    has_complete_data: boolean;
  }> => {
    return apiRequest(`/log-call?call_id=${callId}`);
  },

  // Log call (POST version)
  logCallPost: (data: {
    call_id: string;
    user_id: string;
    agent_id: string;
    module_id: string;
  }): Promise<any> => {
    return apiRequest('/api/log-call', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update call ID
  updateCallId: (oldCallId: string, newCallId: string): Promise<{
    status: string;
    old_call_id: string;
    new_call_id?: string;
  }> => {
    return apiRequest('/api/update-call-id', {
      method: 'POST',
      body: JSON.stringify({
        old_call_id: oldCallId,
        new_call_id: newCallId,
      }),
    });
  },
};

// Training API
export const trainingApi = {
  // Get training sessions
  getTrainingSessions: (): Promise<TrainingSession[]> => {
    return apiRequest<TrainingSession[]>('/api/getTrainingCalls');
  },

  // Get training sessions with names
  getTrainingSessionsWithNames: (): Promise<TrainingSession[]> => {
    return apiRequest<TrainingSession[]>('/api/getTrainingCallsWithNames');
  },

  // Analyze training call
  analyzeTrainingCall: (data: {
    call_id: string;
    user_id: string;
    module_id: string;
    transcript: string;
    duration: number;
  }): Promise<{
    call_id: string;
    score: number;
    sentiment: string;
    passed: boolean;
  }> => {
    return apiRequest('/api/analyze-training-call', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Start simulation
  startSimulation: (data: {
    scenario_id: string;
    module_id: string;
    user_id: string;
  }): Promise<{
    message: string;
    call_id: string;
    status: string;
  }> => {
    return apiRequest('/api/start-simulation', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // End training session
  endTrainingSession: (callId: string): Promise<{
    status: string;
    call_id: string;
  }> => {
    return apiRequest('/api/end-training-session', {
      method: 'POST',
      body: JSON.stringify({ call_id: callId }),
    });
  },

  // Start training call
  startTrainingCall: (data: {
    call_id: string;
    user_id: string;
    module_id: string;
    scenario_id: string;
  }): Promise<{
    status: string;
    call_id: string;
  }> => {
    return apiRequest('/api/start-training-call', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get user statistics
  getUserStats: (userId: string): Promise<{
    user_id: string;
    total_sessions: number;
    total_xp: number;
    average_score: number;
    passed_sessions: number;
    failed_sessions: number;
    pass_rate: number;
    total_training_time: number;
    last_session_date: string | null;
  }> => {
    return apiRequest(`/api/getUserStats/${userId}`);
  },

  // Get universal agent
  getUniversalAgent: (): Promise<any[]> => {
    return apiRequest<any[]>('/api/getUniversalAgent');
  },

  // Get leaderboard
  getLeaderboard: (): Promise<any[]> => {
    return apiRequest<any[]>('/api/getLeaderboard');
  },

  // Get training modules
  getModules: (): Promise<any[]> => {
    return apiRequest<any[]>('/api/getModules');
  },

  // Get modules by category
  getModulesByCategory: (categoryId: string): Promise<any[]> => {
    return apiRequest<any[]>(`/api/getModulesByCategory/${categoryId}`);
  },

  // Get training categories
  getTrainingCategories: (): Promise<any[]> => {
    return apiRequest<any[]>('/api/getTrainingCategories');
  },

  // Get training agents by module
  getTrainingAgentsByModule: (moduleId: string): Promise<any[]> => {
    return apiRequest<any[]>(`/api/getTrainingAgentsByModule/${moduleId}`);
  },

  // Get scenarios by module
  getScenariosByModule: (moduleId: string): Promise<TrainingScenario[]> => {
    return apiRequest<TrainingScenario[]>(`/api/getScenariosByModule/${moduleId}`);
  },
};

// System API
export const systemApi = {
  // Health check
  healthCheck: (): Promise<{
    status: string;
    timestamp: string;
  }> => {
    return apiRequest('/health');
  },

  // Get root info
  getSystemInfo: (): Promise<{
    message: string;
    status: string;
    version: string;
    features: Record<string, string>;
    endpoints: Record<string, string>;
  }> => {
    return apiRequest('/');
  },
};

// Convenience functions for common operations
export const apiHelpers = {
  // Retry a function with exponential backoff
  retryWithBackoff: async <T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> => {
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Retry ${i + 1}/${maxRetries} failed:`, error);
        
        if (i < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, i);
          logger.info(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  },

  // Poll for data until condition is met
  pollUntilReady: async <T>(
    checkFn: () => Promise<T>,
    isReady: (data: T) => boolean,
    maxAttempts: number = 10,
    interval: number = 1000
  ): Promise<T> => {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const data = await checkFn();
        if (isReady(data)) {
          return data;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          logger.info(`Polling attempt ${attempts}/${maxAttempts}, waiting ${interval}ms...`);
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      } catch (error) {
        logger.error(`Polling attempt ${attempts + 1} failed:`, error);
        attempts++;
        
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      }
    }
    
    throw new Error(`Polling failed after ${maxAttempts} attempts`);
  },

  // Check if call is ready (common use case)
  checkCallReady: async (callId: string): Promise<boolean> => {
    try {
      const status = await callApi.getCallStatus(callId);
      return status.processed && status.has_transcript && status.has_score;
    } catch (error) {
      logger.error(`Error checking if call ${callId} is ready:`, error);
      return false;
    }
  },

  // Wait for call to be processed
  waitForCallProcessing: async (callId: string, maxWaitTime: number = 30000): Promise<any> => {
    const startTime = Date.now();
    
    return apiHelpers.pollUntilReady(
      () => callApi.logCall(callId),
      (data) => data.has_complete_data || (Date.now() - startTime) > maxWaitTime,
      Math.ceil(maxWaitTime / 1000), // Convert to attempts
      1000
    );
  },
};

// Export all APIs as a single object for convenience
export const api = {
  call: callApi,
  training: trainingApi,
  system: systemApi,
  helpers: apiHelpers,
};

export default api;