#!/usr/bin/env node

// Simple script to test the agent assist overlay from the main project directory

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing Dialara Agent Assist Overlay...\n');

// Check if we're in the right directory
const overlayPath = path.join(__dirname, 'electron-overlay');
const testPath = path.join(overlayPath, 'test', 'test-integration.js');

// Check if the test file exists
const fs = require('fs');
if (!fs.existsSync(testPath)) {
  console.error('❌ Test file not found at:', testPath);
  console.log('Make sure you\'re running this from the main Dialara project directory.');
  process.exit(1);
}

console.log('📁 Running test from:', testPath);
console.log('⚡ Starting overlay integration test...\n');

// Run the test
const testProcess = spawn('node', [testPath], {
  cwd: overlayPath,
  stdio: 'inherit'
});

testProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Start the overlay: cd electron-overlay && npm run dev');
    console.log('2. Start Dialara CRM: npm run dev');
    console.log('3. Switch to CRM mode and test the integration');
  } else {
    console.log(`\n❌ Test failed with exit code ${code}`);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure the overlay is running: cd electron-overlay && npm run dev');
    console.log('2. Check that port 8765 is available');
    console.log('3. Verify Node.js and npm are installed');
  }
});

testProcess.on('error', (error) => {
  console.error('❌ Failed to start test:', error.message);
});