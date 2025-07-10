# Dialara Agent Assist Overlay

An AI-powered agent assist overlay system for Dialara's CRM mode, inspired by the free-cluely project. This Electron application provides real-time suggestions, objection handling, and call guidance to sales agents.

## Features

- **Real-time AI Suggestions**: Context-aware suggestions based on call transcript and lead data
- **Objection Handling**: AI-powered responses to common sales objections
- **Call Checklist**: Dynamic checklist that adapts to call type and context
- **Keyboard Shortcuts**: Quick access to all features via global hotkeys
- **Live Transcript Analysis**: Automatically triggers suggestions based on conversation flow
- **CRM Integration**: Seamlessly integrates with Dialara's dual-mode system

## Requirements

- Node.js 16+ and npm
- Electron 27+
- OpenAI API key (or configure for local LLM)
- Running Dialara CRM application

## Quick Start

### 1. Installation

```bash
cd electron-overlay
npm install
```

### 2. Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```bash
# Required: OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo

# Optional: Overlay Settings
OVERLAY_PORT=8765
OVERLAY_WIDTH=400
OVERLAY_HEIGHT=600
OVERLAY_OPACITY=0.95

# Development
NODE_ENV=development
```

### 3. Start the Overlay

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 4. Integrate with Dialara CRM

In your main Dialara application, add the overlay integration component:

```tsx
// In your main App.tsx or Layout component
import { OverlayIntegration } from './components/OverlayIntegration';

function App() {
  return (
    <OverlayIntegration>
      {/* Your existing app components */}
    </OverlayIntegration>
  );
}
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+H` | Toggle overlay visibility |
| `Ctrl+Shift+S` | Refresh AI suggestions |
| `Ctrl+Shift+O` | Get objection handling advice |
| `Ctrl+Shift+C` | Focus on call checklist |

## Architecture

### Communication Flow

```
Dialara CRM ←→ WebSocket ←→ Electron Overlay ←→ LLM Service
```

1. **Dialara CRM** sends call data via WebSocket bridge
2. **Electron Overlay** receives context and displays UI
3. **LLM Service** processes context and generates suggestions
4. **Agent** receives real-time assistance via overlay

### Key Components

- **Main Process** (`src/main.js`): Electron main process, window management, global shortcuts
- **Renderer Process** (`src/renderer/`): Overlay UI and client-side logic
- **LLM Service** (`src/llm/`): AI integration and prompt management
- **WebSocket Bridge** (`src/services/overlayBridge.ts`): Real-time communication with CRM
- **Configuration** (`src/config/`): Settings management and persistence

## Configuration Options

### LLM Settings

```javascript
{
  provider: 'openai',        // 'openai', 'gemini', or 'none'
  model: 'gpt-3.5-turbo',   // Model to use
  maxTokens: 500,           // Maximum response length
  temperature: 0.7,         // Creativity level (0-2)
  timeout: 10000           // Request timeout (ms)
}
```

### Overlay Settings

```javascript
{
  width: 400,              // Overlay width (px)
  height: 600,             // Overlay height (px)
  opacity: 0.95,           // Transparency level
  alwaysOnTop: true,       // Stay above other windows
  autoShow: false          // Show automatically on call start
}
```

### Features

```javascript
{
  suggestions: true,        // AI suggestions
  objections: true,         // Objection handling
  checklist: true,          // Call checklist
  autoTrigger: false,       // Auto-trigger on transcript updates
  transcriptAnalysis: true  // Analyze conversation context
}
```

## Development

### Project Structure

```
electron-overlay/
├── src/
│   ├── main.js              # Electron main process
│   ├── renderer/            # UI components and logic
│   │   ├── overlay.html     # Main overlay interface
│   │   ├── overlay.js       # Client-side JavaScript
│   │   └── styles.css       # Overlay styling
│   ├── llm/                 # AI integration
│   │   ├── llmService.js    # LLM service implementation
│   │   └── promptTemplates.js # Prompt templates
│   └── config/              # Configuration management
│       └── appConfig.js     # Settings and persistence
├── package.json             # Dependencies and scripts
└── .env                     # Environment configuration
```

### Adding New Features

1. **New AI Prompt Type**: Add to `src/llm/promptTemplates.js`
2. **UI Components**: Modify `src/renderer/overlay.html` and `styles.css`
3. **Shortcuts**: Update `src/main.js` shortcut registration
4. **Configuration**: Extend `src/config/appConfig.js` defaults

### Testing

```bash
# Start in development mode with debugging
NODE_ENV=development npm run dev

# Test WebSocket connection
# (Start Dialara CRM and verify connection in overlay)

# Test LLM integration
# (Trigger suggestions and verify API calls)
```

## Troubleshooting

### Common Issues

1. **Overlay not connecting to CRM**
   - Verify WebSocket port (default: 8765) is not blocked
   - Check that Dialara CRM is running and in CRM mode
   - Look for connection errors in overlay console

2. **LLM suggestions not working**
   - Verify OpenAI API key is valid and has credits
   - Check network connectivity
   - Review rate limiting in OpenAI dashboard

3. **Keyboard shortcuts not responding**
   - Ensure overlay has focus or is running in background
   - Check for conflicts with other applications
   - Verify shortcuts are registered (see console logs)

4. **Overlay positioning issues**
   - Reset overlay bounds via settings
   - Check display scaling settings
   - Verify overlay doesn't go off-screen

### Debugging

Enable debug mode in `.env`:

```bash
NODE_ENV=development
DEBUG_MODE=true
```

Check logs:
- Electron main process: Terminal/console output
- Renderer process: Overlay dev tools (F12)
- WebSocket: Network tab in browser dev tools

### Performance

- **Memory usage**: Overlay typically uses 50-100MB
- **CPU usage**: Minimal when idle, brief spikes during LLM requests
- **Network**: Only during LLM API calls (1-5 KB per request)

## Security Considerations

- API keys are stored locally and never transmitted to Dialara servers
- Transcript data is only sent to configured LLM provider
- Enable anonymization in privacy settings if needed
- Configure data retention policies

## Building for Production

```bash
# Build renderer and main process
npm run build

# Create distributable package
npm run pack

# Create installer
npm run dist
```

## License

This project is part of the Dialara ecosystem. See main project license for details.

## Support

For issues related to the overlay system:
1. Check this README and troubleshooting section
2. Review console logs and error messages
3. Verify configuration settings
4. Contact the development team with specific error details