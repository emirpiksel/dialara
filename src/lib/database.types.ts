export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_agents: {
        Row: {
          id: string
          clinic_name: string
          phone_number: string
          vapi_agent_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_name: string
          phone_number: string
          vapi_agent_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_name?: string
          phone_number?: string
          vapi_agent_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      call_logs: {
        Row: {
          id: string
          agent_id: string
          clinic_name: string
          caller_number: string
          call_type: 'inbound' | 'outbound' | 'webCall'
          duration: number
          recording_url: string | null
          timestamp: string
          created_at: string
          updated_at: string
          score: number | null
          sentiment: 'positive' | 'neutral' | 'negative' | null
          summary: string | null
        }
        Insert: {
          id?: string
          agent_id: string
          clinic_name: string
          caller_number: string
          call_type?: 'inbound' | 'outbound' | 'webCall'
          duration?: number
          recording_url?: string | null
          timestamp?: string
          created_at?: string
          updated_at?: string
          score?: number | null
          sentiment?: 'positive' | 'neutral' | 'negative' | null
          summary?: string | null
        }
        Update: {
          id?: string
          agent_id?: string
          clinic_name?: string
          caller_number?: string
          call_type?: 'inbound' | 'outbound' | 'webCall'
          duration?: number
          recording_url?: string | null
          timestamp?: string
          created_at?: string
          updated_at?: string
          score?: number | null
          sentiment?: 'positive' | 'neutral' | 'negative' | null
          summary?: string | null
        }
      }
      leads: {
        Row: {
          id: string
          clinic_name: string
          full_name: string
          phone_number: string
          email: string | null
          status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
          source: 'call' | 'web' | 'referral'
          notes: string | null
          last_contact_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clinic_name: string
          full_name: string
          phone_number: string
          email?: string | null
          status?: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
          source: 'call' | 'web' | 'referral'
          notes?: string | null
          last_contact_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clinic_name?: string
          full_name?: string
          phone_number?: string
          email?: string | null
          status?: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
          source?: 'call' | 'web' | 'referral'
          notes?: string | null
          last_contact_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Enums: {
      call_type: 'inbound' | 'outbound' | 'webCall'
    }
  }
}
