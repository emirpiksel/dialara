import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// ✅ Define __dirname & load env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ✅ Supabase Admin Setup
const supabaseUrl =
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey =
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    '❌ Missing Supabase credentials. Check VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY'
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ✅ App Setup
const app = express();
const PORT = process.env.PORT || 3000;
const callIdMap = new Map();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/vapi/inbound-call', async (req, res) => {
  try {
    const callerNumber = req.body.From || req.body.Caller;
    const callSid = req.body.CallSid || uuidv4();
    const dialedNumber = req.body.To || req.body.Called;

    if (!callerNumber || !dialedNumber) {
      console.error('❌ Missing caller or called number');
      return res.status(400).send('Missing numbers');
    }

    console.log(`📞 Inbound call from ${callerNumber} to ${dialedNumber}`);

    const { data: agent, error } = await supabase
      .from('ai_agents')
      .select('id, vapi_agent_id, clinic_name, user_id')
      .eq('phone_number', dialedNumber)
      .maybeSingle();

    if (error) console.error('❌ Agent lookup failed:', error.message);

    const agentId = agent?.id || null;
    const vapiAgentId = agent?.vapi_agent_id || process.env.VAPI_ASSISTANT_ID;
    const clinicName = agent?.clinic_name ?? 'Unknown Clinic';
    const userId = agent?.user_id ?? null;

    await supabase.from('call_logs').insert([
      {
        id: callSid,
        call_id: null,
        caller_number: callerNumber,
        call_type: 'inbound',
        agent_id: agentId,
        user_id: userId,
        clinic_name: clinicName,
        status: 'in_progress',
        timestamp: new Date().toISOString(),
      },
    ]);

    const vapiRes = await axios.post(
      'https://api.vapi.ai/call',
      {
        phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
        assistantId: vapiAgentId,
        phoneCallProviderBypassEnabled: true,
        customer: { number: callerNumber },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const vapiCallId = vapiRes?.data?.id;
    const twiml = vapiRes?.data?.phoneCallProviderDetails?.twiml;

    if (vapiCallId) {
      callIdMap.set(vapiCallId, callSid);
      console.log(`🔗 Linked Vapi Call ID ${vapiCallId} ↔ CallSid ${callSid}`);
      await supabase
        .from('call_logs')
        .update({ call_id: vapiCallId })
        .eq('id', callSid);
    }

    if (!twiml) {
      console.error('❌ No TwiML from Vapi:', vapiRes.data);
      return res.status(500).send('Missing TwiML');
    }

    console.log('✅ TwiML received, sending to Twilio.');
    res.type('text/xml').send(twiml);
  } catch (err) {
    console.error('❌ Inbound call error:', err.response?.data || err.message);
    res.status(500).send('Server error');
  }
});

app.post('/webhook', async (req, res) => {
  console.log('📩 Webhook HIT');
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { message = {}, call = {}, event } = body;

  const vapiCallId = call?.id || message?.callId || message?.call?.id;
  console.log('🔍 Extracted vapiCallId:', vapiCallId);

  try {
    if (message.type === 'assistant-request') {
      console.log('🧪 Assistant-request triggered');
      return res.status(200).json({
        response: {
          action: {
            type: 'end_call',
            params: { text: 'Teşekkür ederim, görüşmek üzere.' },
          },
        },
      });
    }

    if (message.type === 'end-of-call-report' || event === 'end_of_call_report') {
      console.log('📞 End-of-call report received');

      const {
        endedReason,
        recordingUrl,
        summary,
        transcript,
        messages: messageList,
      } = message;

      const duration =
        call?.duration ||
        message?.duration ||
        message?.durationMs / 1000 ||
        message?.durationSeconds ||
        0;

      let callSid = callIdMap.get(vapiCallId);
      if (!callSid) {
        const { data: match } = await supabase
          .from('call_logs')
          .select('id')
          .eq('call_id', vapiCallId)
          .maybeSingle();
        callSid = match?.id;
      }

      console.log('🧩 callSid resolved as:', callSid);

      if (!callSid) {
        console.warn(`⚠️ No CallSid match for Vapi Call ID: ${vapiCallId}`);
        return res.status(200).json({ warning: 'CallSid not found' });
      }

      const updatePayload = {
        duration: Math.round(duration),
        status: call?.status || message?.status || 'completed',
        ended_reason: endedReason || 'unknown',
        recording_url: recordingUrl || '',
        summary: summary || '',
        transcript: transcript || '',
        messages: JSON.stringify(messageList || []),
        twilio_sid: call?.id || vapiCallId || null,
        call_start: call?.createdAt || null,
        call_end: call?.updatedAt || null,
        dialed_number: call?.phoneCallProviderDetails?.from || null,
        provider: call?.phoneCallProvider || null,
        topic_summary: message?.topic_summary || message?.summary || null,
        issues_detected: message?.issues_detected
          ? JSON.stringify(message.issues_detected)
          : null,
        timestamp: new Date().toISOString(),
      };

      console.log('📦 Updating call_logs with:', updatePayload);

      const { error: updateError } = await supabase
        .from('call_logs')
        .update(updatePayload)
        .eq('id', callSid);

      if (updateError) {
        console.error('❌ Final update failed:', updateError);
      } else {
        console.log(`✅ Final log updated for CallSid ${callSid}`);
      }

      try {
        const analyzeRes = await axios.post('http://127.0.0.1:8000/api/analyze', {
          call_id: callSid,
          transcript: transcript || '',
          duration: Math.round(duration),
        });

        const { score, sentiment, summary: aiSummary } = analyzeRes.data;

        const { error: aiUpdateError } = await supabase
          .from('call_logs')
          .update({ score, sentiment, summary: aiSummary })
          .eq('id', callSid);

        if (aiUpdateError) {
          console.error('❌ Failed to update AI fields:', aiUpdateError);
        } else {
          console.log(`✅ AI fields updated for CallSid ${callSid}`);
        }
      } catch (err) {
        console.error(
          '❌ Failed to call /api/analyze or update AI fields:',
          err.response?.data || err.message
        );
      }

      return res.status(200).json({ success: true });
    }

    if (event === 'status_update') {
      console.log('🔁 Status update received');

      const newStatus = message.status || call?.status || null;
      if (!vapiCallId || !newStatus) {
        return res.status(200).json({ skipped: 'Missing call_id or status' });
      }

      let callSid = callIdMap.get(vapiCallId);
      if (!callSid) {
        const { data: match } = await supabase
          .from('call_logs')
          .select('id')
          .eq('call_id', vapiCallId)
          .maybeSingle();
        callSid = match?.id;
      }

      if (!callSid) {
        console.warn(`⚠️ No CallSid found for status update call_id ${vapiCallId}`);
        return res.status(200).json({ skipped: 'No CallSid match' });
      }

      const { error: statusUpdateError } = await supabase
        .from('call_logs')
        .update({ status: newStatus })
        .eq('id', callSid);

      if (statusUpdateError) {
        console.error('❌ Failed to update status from status_update:', statusUpdateError);
      } else {
        console.log(`✅ Status updated to "${newStatus}" for CallSid ${callSid}`);
      }

      return res.status(200).json({ success: true });
    }

    await supabase.from('event_logs').insert([
      {
        id: uuidv4(),
        call_id: vapiCallId || 'unknown',
        event_type: message?.type || event || 'unknown',
        payload: JSON.stringify(body),
        created_at: new Date().toISOString(),
      },
    ]);

    console.log(
      `ℹ️ Unhandled webhook event type received:\n🔹 message.type: ${message.type}\n🔹 event: ${event}\n📦 Full body:`,
      JSON.stringify(body, null, 2)
    );
    return res.status(200).json({ skipped: true });
  } catch (err) {
    console.error('❌ Webhook handler error:', err.message);
    return res.status(500).json({ error: 'Webhook crash' });
  }
});

app.listen(PORT, () => {
  console.log(`🧠 Server running at http://localhost:${PORT}`);
});
