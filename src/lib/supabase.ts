// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types'; // Make sure this file exists

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// ✅ Fetch AI Agents (for real sales calls)
export async function fetchAIAgents() {
  const { data, error } = await supabase.from('ai_agents').select('*');
  if (error) {
    console.error('Error fetching AI agents:', error);
    return [];
  }
  return data;
}

