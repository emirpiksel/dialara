import { supabase } from '@/lib/supabase'; // ✅ Use shared client
import type { Database } from '@/lib/database.types';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Extract call data from the webhook payload
    const {
      call_id,
      agent_id,
      clinic_name,
      caller_number,
      call_type,
      duration,
      recording_url,
      timestamp
    } = data;

    // Validate required fields
    if (!agent_id || !clinic_name || !caller_number) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: agent_id, clinic_name, or caller_number' 
        }), 
        { status: 400 }
      );
    }

    // Insert the call log into the database
    const { error } = await supabase
      .from('call_logs')
      .insert({
        agent_id,
        clinic_name,
        caller_number,
        call_type: call_type || 'inbound',
        duration: Math.round(duration || 0),
        recording_url,
        timestamp: timestamp || new Date().toISOString(),
      });

    if (error) {
      console.error('Error inserting call log:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to save call log' }), 
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true }), 
      { status: 200 }
    );
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500 }
    );
  }
}
