# Agent Assist Overlay Integration Guide

This guide explains how to integrate the AI-powered agent assist overlay system with Dialara's CRM mode.

## Overview

The agent assist overlay provides real-time AI suggestions, objection handling, and call guidance to sales agents during live calls. It integrates seamlessly with Dialara's existing CRM functionality without affecting the core application.

## Quick Setup

### 1. Install Overlay Dependencies

```bash
# In the main Dialara project root
npm install ws

# Navigate to overlay directory and install
cd electron-overlay
npm install
```

### 2. Configure Environment

Copy and configure the overlay environment:

```bash
cd electron-overlay
cp .env.example .env
```

Edit `.env` with your OpenAI API key:

```bash
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
NODE_ENV=development
```

### 3. Start the Overlay Application

```bash
cd electron-overlay
npm run dev
```

### 4. Integrate with Main App

Add the overlay integration to your main layout component:

```tsx
// src/components/Layout.tsx or App.tsx
import { OverlayIntegration } from './OverlayIntegration';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <OverlayIntegration>
      <div className="app-layout">
        {/* Your existing layout components */}
        {children}
      </div>
    </OverlayIntegration>
  );
};
```

## Integration Points

### 1. Real-time Call Data

The overlay bridge automatically subscribes to Zustand store changes and sends relevant data:

- **Call events**: Start, end, duration updates
- **Lead information**: Contact details, status, notes
- **App mode changes**: CRM ↔ Training mode switching
- **Transcript updates**: Real-time conversation analysis

### 2. Manual Triggers

You can manually send data to the overlay from anywhere in your app:

```tsx
import { useOverlayBridge } from '../hooks/useOverlayBridge';

function CallComponent() {
  const { sendCallStarted, sendTranscriptUpdate, sendLeadUpdate } = useOverlayBridge();

  const handleCallStart = (callData) => {
    sendCallStarted({
      call_id: callData.id,
      caller_number: callData.caller_number,
      contact_name: callData.clinic_name,
      call_type: callData.call_type,
      timestamp: callData.timestamp
    });
  };

  const handleTranscriptUpdate = (transcript) => {
    // Send transcript with auto-trigger flag
    sendTranscriptUpdate(transcript, true);
  };

  return (
    // Your call component JSX
  );
}
```

### 3. Vapi.ai Integration

If you're using Vapi.ai for voice calls, you can integrate transcript streaming:

```tsx
import { useVapi } from '@vapi-ai/react';
import { useOverlayBridge } from '../hooks/useOverlayBridge';

function VapiCallComponent() {
  const { sendTranscriptUpdate } = useOverlayBridge();
  
  const vapi = useVapi({
    apiKey: process.env.VITE_VAPI_API_KEY!,
    assistant: {
      // Your assistant configuration
    },
  });

  useEffect(() => {
    const handleTranscript = (transcript: string) => {
      sendTranscriptUpdate(transcript);
    };

    vapi.on('transcript', handleTranscript);
    
    return () => {
      vapi.off('transcript', handleTranscript);
    };
  }, [vapi, sendTranscriptUpdate]);

  return (
    // Your Vapi component JSX
  );
}
```

## Configuration

### Store Integration

The overlay bridge automatically integrates with existing Zustand stores:

- `useCallsStore`: Call history and active calls
- `useLeadsStore`: Lead management and contact info
- `useAuthStore`: User authentication and permissions
- `useAppMode`: CRM/Training mode switching

### WebSocket Connection

The bridge establishes a WebSocket connection on port 8765:

```typescript
// Connection is automatic when in CRM mode
const bridge = getOverlayBridge();

// Check connection status
if (bridge.getConnectionStatus()) {
  console.log('Overlay connected');
}
```

### Error Handling

The integration includes automatic reconnection and fallback behavior:

```typescript
// Connection will automatically retry on failure
// Overlay functions gracefully when disconnected
// LLM service provides fallback suggestions if API unavailable
```

## Customization

### 1. Custom Prompt Templates

Add new prompt templates in `electron-overlay/src/llm/promptTemplates.js`:

```javascript
// Add new template
PROMPT_TEMPLATES.custom_scenario = {
  system: "Your custom system prompt here...",
  user: "Context: {contact_name} from {clinic_name}..."
};

// Use in LLM service
const result = await llmService.generateSuggestions({
  type: 'custom_scenario',
  call: callData,
  lead: leadData,
  transcript: transcript
});
```

### 2. Custom Keyboard Shortcuts

Modify shortcuts in `electron-overlay/src/main.js`:

```javascript
// Add new shortcut
globalShortcut.register('CmdOrCtrl+Shift+N', () => {
  overlayWindow.webContents.send('trigger-custom-action');
});
```

### 3. UI Customization

Update overlay appearance in `electron-overlay/src/renderer/styles.css`:

```css
/* Custom theme colors */
:root {
  --primary-color: #your-brand-color;
  --background-color: #your-background;
}

/* Custom overlay size */
#overlay-container {
  width: 500px; /* Custom width */
  height: 700px; /* Custom height */
}
```

## Development Workflow

### 1. Development Mode

Run both applications in development:

```bash
# Terminal 1: Main Dialara app
npm run dev

# Terminal 2: Overlay app
cd electron-overlay
npm run dev
```

### 2. Testing Integration

1. Start both applications
2. Navigate to CRM mode in Dialara
3. Check overlay connection status (bottom-left indicator)
4. Test keyboard shortcuts (Ctrl+Shift+H to toggle)
5. Verify data flow by making test calls

### 3. Debugging

Enable debug logging:

```bash
# In overlay .env file
NODE_ENV=development
DEBUG_MODE=true
```

Check browser console for WebSocket messages:

```javascript
// In Dialara dev tools console
window.overlayBridge = getOverlayBridge();
console.log('Bridge status:', window.overlayBridge.getConnectionStatus());
```

## Production Deployment

### 1. Build Overlay Application

```bash
cd electron-overlay
npm run build
npm run pack
```

### 2. Environment Configuration

Set production environment variables:

```bash
# Production .env
NODE_ENV=production
OPENAI_API_KEY=your_production_key
OVERLAY_PORT=8765
```

### 3. Distribution

The overlay can be distributed as:
- Standalone Electron app
- Bundled with main Dialara installation
- Auto-updater for seamless updates

## Security Considerations

### 1. API Key Management

- Store OpenAI keys securely (environment variables)
- Never commit API keys to version control
- Use different keys for development/production

### 2. Data Privacy

Configure privacy settings:

```javascript
// In overlay config
privacy: {
  logTranscripts: false,    // Don't log sensitive data
  anonymizeData: true,      // Remove PII before sending to LLM
  retentionDays: 7         // Automatic cleanup
}
```

### 3. Network Security

- WebSocket connection is local (localhost only)
- LLM requests use HTTPS
- No data stored on external servers

## Troubleshooting

### Common Issues

1. **Overlay not connecting**
   - Check port 8765 availability
   - Verify both apps are running
   - Ensure CRM mode is active

2. **No AI suggestions**
   - Verify OpenAI API key
   - Check API quota and billing
   - Review network connectivity

3. **Performance issues**
   - Monitor memory usage
   - Adjust LLM request frequency
   - Optimize transcript update intervals

### Support

For technical support:
1. Check error logs in both applications
2. Verify configuration settings
3. Test with minimal data to isolate issues
4. Contact development team with specific error details

## Future Enhancements

Planned features for future releases:

- Local LLM support (Ollama, LM Studio)
- Custom industry-specific prompt templates
- Integration with CRM analytics
- Voice command triggers
- Multi-language support
- Advanced objection detection algorithms