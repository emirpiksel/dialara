#!/usr/bin/env node

// Setup script for the agent assist overlay

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Setting up Dialara Agent Assist Overlay...\n');

const overlayPath = path.join(__dirname, 'electron-overlay');
const envPath = path.join(overlayPath, '.env');
const envExamplePath = path.join(overlayPath, '.env.example');

// Check if overlay directory exists
if (!fs.existsSync(overlayPath)) {
  console.error('❌ Overlay directory not found at:', overlayPath);
  process.exit(1);
}

// Step 1: Install dependencies
console.log('📦 Installing overlay dependencies...');
const installProcess = spawn('npm', ['install'], {
  cwd: overlayPath,
  stdio: 'inherit'
});

installProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Failed to install dependencies');
    process.exit(1);
  }
  
  console.log('✅ Dependencies installed successfully\n');
  
  // Step 2: Setup environment file
  console.log('⚙️  Setting up environment configuration...');
  
  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log('✅ Created .env file from template');
    } else {
      // Create basic .env file
      const envContent = `# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.7

# Overlay Configuration
OVERLAY_PORT=8765
OVERLAY_WIDTH=400
OVERLAY_HEIGHT=600
OVERLAY_OPACITY=0.95

# Development
NODE_ENV=development
DEBUG_MODE=true
`;
      fs.writeFileSync(envPath, envContent);
      console.log('✅ Created basic .env file');
    }
  } else {
    console.log('✅ .env file already exists');
  }
  
  console.log('\n🎉 Setup completed successfully!\n');
  
  console.log('📋 Next steps:');
  console.log('1. Edit electron-overlay/.env with your OpenAI API key');
  console.log('2. Start the overlay: cd electron-overlay && npm run dev');
  console.log('3. Start Dialara CRM: npm run dev');
  console.log('4. Test integration: node test-overlay.js');
  console.log('\n📚 Documentation:');
  console.log('- Overlay README: electron-overlay/README.md');
  console.log('- Integration guide: docs/AGENT_ASSIST_INTEGRATION.md');
  
  console.log('\n⌨️  Keyboard shortcuts (when overlay is active):');
  console.log('- Ctrl+Shift+H: Toggle overlay');
  console.log('- Ctrl+Shift+S: Refresh suggestions');
  console.log('- Ctrl+Shift+O: Objection handling');
  console.log('- Ctrl+Shift+C: Call checklist');
});

installProcess.on('error', (error) => {
  console.error('❌ Failed to start installation:', error.message);
  console.log('\nMake sure you have Node.js and npm installed.');
});