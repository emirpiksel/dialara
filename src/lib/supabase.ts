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

// ✅ Fetch Training Agents (for training simulations)
export async function fetchTrainingAgents() {
  const { data, error } = await supabase.from('training_agents').select('*');
  if (error) {
    console.error('Error fetching training agents:', error);
    return [];
  }
  return data;
}

// ✅ Fetch New Leads (Leads with status 'new')
export async function fetchNewLeads() {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('status', 'new')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching new leads:', error);
    return [];
  }

  console.log("✅ Fetched new leads:", data);
  return data;
}

// ✅ Create AI Agent
export async function createAgent(agentData: any) {
  const { data, error } = await supabase
    .from('ai_agents')
    .insert([agentData])
    .single();

  if (error) {
    console.error('Error creating agent:', error.message);
    throw error;
  }

  return data;
}

// ✅ Update AI Agent
export async function updateAgent(agentId: string, updates: any) {
  const { data, error } = await supabase
    .from('ai_agents')
    .update(updates)
    .eq('id', agentId)
    .single();

  if (error) {
    console.error('Error updating agent:', error.message);
    throw error;
  }

  return data;
}

// ✅ Delete AI Agent
export async function deleteAgent(agentId: string) {
  const { error } = await supabase
    .from('ai_agents')
    .delete()
    .eq('id', agentId);

  if (error) {
    console.error('Error deleting agent:', error.message);
    throw error;
  }
}

// ✅ Start an Outbound Call
export async function startOutboundCall(leadId: string, leadPhone: string) {
  const { data: agents, error: agentError } = await supabase
    .from('ai_agents')
    .select('*')
    .limit(1);

  if (agentError || !agents.length) {
    console.error('Error fetching AI agent:', agentError);
    return { success: false, message: 'No AI agents available.' };
  }

  const agent = agents[0];
  console.log(`📞 Assigning AI agent ${agent.id} to call lead ${leadId}`);

  try {
    const response = await fetch('https://api.vapi.ai/start-call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_VAPI_API_KEY}`,
      },
      body: JSON.stringify({
        agent_id: agent.vapi_agent_id,
        phone_number: leadPhone,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to start call');
    }

    console.log(`✅ Call started: ${result.call_id}`);

    await supabase.from('call_logs').insert([{
      agent_id: agent.vapi_agent_id,
      caller_number: leadPhone,
      call_type: 'outbound',
      status: 'ongoing',
      timestamp: new Date().toISOString(),
    }]);

    await supabase.from('leads').update({ status: 'contacted' }).eq('id', leadId);

    return { success: true, callId: result.call_id };
  } catch (error) {
    console.error('❌ Error starting call:', error);
    return { success: false, message: 'Call failed.' };
  }
}
