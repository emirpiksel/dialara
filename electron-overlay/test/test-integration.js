// Simple test script to verify overlay integration
const WebSocket = require('ws');

const TEST_DATA = {
  callStarted: {
    type: 'call-started',
    payload: {
      call_id: 'test-call-123',
      caller_number: '+1234567890',
      contact_name: 'Test Contact',
      duration: 0,
      status: 'active',
      call_type: 'outbound',
      timestamp: new Date().toISOString()
    }
  },
  leadData: {
    type: 'lead-data',
    payload: {
      id: 'test-lead-123',
      full_name: 'Test Contact',
      phone_number: '+1234567890',
      email: 'test@example.com',
      status: 'qualified',
      clinic_name: 'Test Clinic',
      notes: 'Test lead for overlay integration',
      source: 'website'
    }
  },
  transcriptUpdate: {
    type: 'transcript-update',
    payload: {
      transcript: 'Hello, thank you for calling. How can I help you today?',
      shouldTriggerSuggestions: true
    }
  }
};

async function testOverlayConnection() {
  console.log('Testing Dialara Agent Assist Overlay Integration...\n');

  try {
    // Test WebSocket connection
    console.log('1. Testing WebSocket connection...');
    const ws = new WebSocket('ws://localhost:8765');

    ws.on('open', () => {
      console.log('✅ WebSocket connected successfully');
      
      // Test sending data
      console.log('\n2. Testing data transmission...');
      
      setTimeout(() => {
        console.log('📞 Sending call started event...');
        ws.send(JSON.stringify(TEST_DATA.callStarted));
      }, 1000);

      setTimeout(() => {
        console.log('👤 Sending lead data...');
        ws.send(JSON.stringify(TEST_DATA.leadData));
      }, 2000);

      setTimeout(() => {
        console.log('💬 Sending transcript update...');
        ws.send(JSON.stringify(TEST_DATA.transcriptUpdate));
      }, 3000);

      setTimeout(() => {
        console.log('\n3. Testing connection status...');
        ws.send(JSON.stringify({
          type: 'ping',
          payload: { timestamp: Date.now() }
        }));
      }, 4000);

      setTimeout(() => {
        console.log('\n✅ Integration test completed successfully!');
        console.log('\nIf overlay is running, you should see:');
        console.log('- Call information updated');
        console.log('- AI suggestions generated');
        console.log('- Connection status indicator');
        ws.close();
      }, 5000);
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      console.log('📨 Received response:', message.type);
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      console.log('\nTroubleshooting:');
      console.log('1. Make sure the overlay app is running (npm run dev)');
      console.log('2. Check that port 8765 is not blocked');
      console.log('3. Verify overlay is in development mode');
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket connection closed');
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testOverlayConnection();