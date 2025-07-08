const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

let supabase;

(async () => {
  const module = await import(path.resolve(__dirname, '../src/lib/supabaseAdmin.server.js'));
  supabase = module.supabaseAdmin;
  run();
})();

function run() {
  const VAPI_API_KEY = process.env.VAPI_PRIVATE_KEY;
  const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID;
  const WEBHOOK_URL = process.env.WEBHOOK_URL;
  const OUTBOUND_ASSISTANT_ID = process.env.VAPI_OUTBOUND_ASSISTANT_ID;
  const CALL_CHECK_INTERVAL = 10 * 1000; // Fixed: 10 seconds instead of 0.6 seconds

  console.log("🔧 ENV Check:");
  console.log("➡️ VAPI_API_KEY:", VAPI_API_KEY ? "Loaded" : "Missing");
  console.log("➡️ VAPI_PHONE_NUMBER_ID:", VAPI_PHONE_NUMBER_ID ? "Loaded" : "Missing");
  console.log("➡️ OUTBOUND_ASSISTANT_ID:", OUTBOUND_ASSISTANT_ID ? "Loaded" : "Missing");
  console.log("➡️ WEBHOOK_URL:", WEBHOOK_URL ? "Loaded" : "Missing");

  if (!VAPI_API_KEY || !VAPI_PHONE_NUMBER_ID || !OUTBOUND_ASSISTANT_ID) {
    console.error("❌ Missing required Vapi credentials in .env file");
    process.exit(1);
  }

  async function processOutboundCalls() {
    console.log("🔍 Checking for pending leads...");

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, full_name, phone_number, call_status, agent_id')
      .eq('call_status', 'pending')
      .limit(100);

    if (leadsError) {
      console.error("❌ Error fetching pending leads:", leadsError);
      return;
    }

    if (!leads || leads.length === 0) {
      console.log("⚠️ No pending leads found.");
      return;
    }

    console.log(`✅ Found ${leads.length} pending lead(s)`);

    for (const lead of leads) {
      let agentId = OUTBOUND_ASSISTANT_ID;

      if (lead.agent_id) {
        console.log(`🔍 Fetching agent info for agent_id: ${lead.agent_id}`);

        // ✅ FIXED: Check both id and vapi_agent_id columns
        let agent = null;
        let agentError = null;

        // First try to find by id column
        const { data: agentById, error: errorById } = await supabase
          .from('ai_agents')
          .select('vapi_agent_id')
          .eq('id', lead.agent_id)
          .maybeSingle();

        if (agentById?.vapi_agent_id) {
          agent = agentById;
        } else {
          // If not found by id, try to find by vapi_agent_id (in case lead.agent_id is actually a vapi_agent_id)
          const { data: agentByVapiId, error: errorByVapiId } = await supabase
            .from('ai_agents')
            .select('vapi_agent_id')
            .eq('vapi_agent_id', lead.agent_id)
            .maybeSingle();

          if (agentByVapiId?.vapi_agent_id) {
            agent = agentByVapiId;
          } else {
            agentError = errorById || errorByVapiId;
          }
        }

        if (agentError || !agent?.vapi_agent_id) {
          console.warn(`⚠️ Agent lookup failed for lead ${lead.full_name}, using default outbound agent.`);
          console.warn(`⚠️ Tried both id and vapi_agent_id columns for: ${lead.agent_id}`);
          if (agentError) console.warn(`⚠️ Agent error:`, agentError);
        } else {
          agentId = agent.vapi_agent_id;
          console.log(`✅ Agent found: ${agentId} → lead: ${lead.full_name}`);
        }
      } else {
        console.log(`⚠️ Lead ${lead.full_name} has no agent assigned. Using default outbound agent.`);
      }

      // 🛑 Prevent duplicates by marking as 'attempting'
      await supabase.from('leads').update({ call_status: 'attempting' }).eq('id', lead.id);

      try {
        // ✅ Validate and format phone number to E.164 format
        let formattedPhoneNumber = lead.phone_number;
        if (!formattedPhoneNumber.startsWith('+')) {
          // Add country code if missing - assuming Turkey (+90) based on your number
          if (formattedPhoneNumber.startsWith('0')) {
            formattedPhoneNumber = '+90' + formattedPhoneNumber.substring(1);
          } else if (formattedPhoneNumber.startsWith('90')) {
            formattedPhoneNumber = '+' + formattedPhoneNumber;
          } else {
            formattedPhoneNumber = '+90' + formattedPhoneNumber;
          }
        }

        // ✅ FIXED: Corrected payload structure for Vapi outbound calls
        // Remove server property as it's not supported for phone calls
        const payload = {
          assistantId: agentId,
          phoneNumberId: VAPI_PHONE_NUMBER_ID,
          customer: { 
            number: formattedPhoneNumber,
            name: lead.full_name 
          }
        };

        console.log("📤 Sending payload to Vapi:", JSON.stringify(payload, null, 2));

        const response = await axios.post(
          'https://api.vapi.ai/call/phone',
          payload,
          {
            headers: {
              Authorization: `Bearer ${VAPI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout
          }
        );

        console.log("📞 Vapi Response:", response.data);
        console.log(`✅ Call initiated for: ${formattedPhoneNumber} (formatted from: ${lead.phone_number})`);

        // ✅ Update lead status to 'attempted'
        await supabase.from('leads').update({ 
          call_status: 'attempted' 
        }).eq('id', lead.id);

        // ✅ Log successful attempt
        await supabase.from('outbound_call_attempts').insert({
          lead_id: lead.id,
          agent_id: lead.agent_id || null,
          status: 'success',
          call_id: response.data.id || response.data.callId || null, // Vapi returns 'id', not 'callId'
          vapi_agent_id: agentId,
          response_data: JSON.stringify(response.data)
        });

        // ✅ Add a small delay between calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (err) {
        console.error("❌ Vapi API Call Error:", err.response?.data || err.message);
        console.error("❌ Full error:", err);

        // ✅ Better error categorization
        let errType = 'no_answer';
        let errorMessage = err.message;

        if (err.response?.status === 400) {
          errType = 'invalid';
          errorMessage = err.response?.data?.message || err.response?.data?.error || err.message;
        } else if (err.response?.status === 429) {
          errType = 'rate_limited';
          errorMessage = 'Rate limited by Vapi API';
        } else if (err.response?.status >= 500) {
          errType = 'server_error';
          errorMessage = 'Vapi server error';
        }

        // ✅ Update lead status with specific error type
        await supabase.from('leads').update({ 
          call_status: errType 
        }).eq('id', lead.id);

        // ✅ Log failed attempt with detailed error info
        await supabase.from('outbound_call_attempts').insert({
          lead_id: lead.id,
          agent_id: lead.agent_id || null,
          status: 'fail',
          error_message: errorMessage,
          vapi_agent_id: agentId,
          error_code: err.response?.status || null,
          error_details: JSON.stringify(err.response?.data || err.message)
        });

        console.log(`⚠️ Marked ${lead.full_name} as '${errType}' - ${errorMessage}`);
      }
    }
  }

  // ✅ Start the scheduler
  setInterval(processOutboundCalls, CALL_CHECK_INTERVAL);
  processOutboundCalls(); // Run immediately on startup
  console.log(`🔄 Outbound call scheduler is running... (checking every ${CALL_CHECK_INTERVAL/1000} seconds)`);
}