// Common TypeScript types for the application

export interface ApiResponse<T = any> {
  status: 'ok' | 'error' | 'ignored' | 'skipped';
  message?: string;
  data?: T;
  call_id?: string;
  processed_at?: string;
}

export interface CallLog {
  id: string;
  call_id: string;
  agent_id?: string;
  caller_number?: string;
  call_type: 'inbound' | 'outbound' | 'webCall';
  duration: number;
  recording_url?: string;
  transcript?: string;
  status: string;
  timestamp: string;
  created_at: string;
  updated_at: string;
  ended_reason?: string;
  summary?: string;
  sentiment?: string;
  score?: number;
  user_id?: string;
}

export interface TrainingSession {
  id: string;
  call_id: string;
  user_id: string;
  agent_id?: string;
  module_id: string;
  scenario_id?: string;
  transcript?: string;
  duration?: number;
  score?: number;
  sentiment?: string;
  xp?: number;
  bonus_xp?: number;
  passed?: boolean;
  feedback?: string;
  scoring_breakdown?: string;
  recording_url?: string;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  summary?: string;
  ended_reason?: string;
}

export interface TrainingScenario {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  prompt_template?: string;
  first_message?: string;
  module_id: string;
  created_at: string;
}

export interface TrainingModule {
  id: string;
  title: string;
  description?: string;
  difficulty: number;
  category_id: string;
  created_at: string;
}

export interface TrainingCategory {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  clinic_name?: string;
  role: 'admin' | 'superadmin' | 'user';
  created_at: string;
  updated_at?: string;
}

export interface Lead {
  id: string;
  clinic_name: string;
  full_name: string;
  phone_number: string;
  email?: string;
  status: 'new' | 'contacted' | 'qualified' | 'closed';
  source: string;
  notes?: string;
  last_contact_date?: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
  call_status?: string;
  agent_id?: string;
}

export interface Agent {
  id: string;
  user_id?: string;
  vapi_agent_id?: string;
  model_provider: string;
  model_name: string;
  first_message: string;
  created_at: string;
  updated_at: string;
}

export interface CallStatusResponse {
  status: 'found' | 'not_found' | 'error';
  processed: boolean;
  has_transcript: boolean;
  has_score: boolean;
  has_feedback: boolean;
  score: number;
  transcript_length: number;
  call_id: string;
  checked_at: string;
  error?: string;
}

export interface ScoringBreakdown {
  engagement: number;
  communication: number;
  problem_solving: number;
  professionalism: number;
  duration_factor: number;
  raw_score?: number;
}

export interface CallAnalysisResult {
  call_id: string;
  transcript: string;
  duration: number;
  score: number;
  xp: number;
  bonus_xp: number;
  feedback: string;
  breakdown: ScoringBreakdown;
  passed: boolean;
  sentiment: string;
  summary: string;
}

export interface VapiEvent {
  type: string;
  call?: {
    id: string;
    status?: string;
    startTime?: string;
    endTime?: string;
  };
  transcript?: string;
  message?: string;
}

export interface UserStats {
  user_id: string;
  total_sessions: number;
  total_xp: number;
  average_score: number;
  passed_sessions: number;
  failed_sessions: number;
  pass_rate: number;
  total_training_time: number;
  last_session_date?: string;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  totalItems?: number;
}

export interface FilterState {
  search: string;
  status?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type AppMode = 'crm' | 'training';

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface AuthState extends LoadingState {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  fullName: string | null;
  clinicName: string | null;
  isAdmin: boolean;
}