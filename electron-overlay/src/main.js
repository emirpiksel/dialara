const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');
const Store = require('electron-store');
const WebSocket = require('ws');
require('dotenv').config();

const store = new Store();
let mainWindow;
let overlayWindow;
let wsServer;

// Configuration
const OVERLAY_CONFIG = {
  width: 400,
  height: 600,
  defaultPosition: { x: 100, y: 100 },
  opacity: 0.95,
  alwaysOnTop: true,
  skipTaskbar: true,
  resizable: true,
  minimizable: true,
  maximizable: false,
  autoHideMenuBar: true,
  webSecurity: false,
  nodeIntegration: true,
  contextIsolation: false,
};

// Create overlay window
function createOverlayWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const savedBounds = store.get('overlayBounds');
  
  const bounds = savedBounds || {
    x: width - OVERLAY_CONFIG.width - 20,
    y: height - OVERLAY_CONFIG.height - 20,
    width: OVERLAY_CONFIG.width,
    height: OVERLAY_CONFIG.height,
  };

  overlayWindow = new BrowserWindow({
    ...bounds,
    opacity: OVERLAY_CONFIG.opacity,
    alwaysOnTop: OVERLAY_CONFIG.alwaysOnTop,
    skipTaskbar: OVERLAY_CONFIG.skipTaskbar,
    resizable: OVERLAY_CONFIG.resizable,
    minimizable: OVERLAY_CONFIG.minimizable,
    maximizable: OVERLAY_CONFIG.maximizable,
    autoHideMenuBar: OVERLAY_CONFIG.autoHideMenuBar,
    frame: false,
    transparent: true,
    webPreferences: {
      webSecurity: OVERLAY_CONFIG.webSecurity,
      nodeIntegration: OVERLAY_CONFIG.nodeIntegration,
      contextIsolation: OVERLAY_CONFIG.contextIsolation,
    },
  });

  // Load the overlay HTML
  overlayWindow.loadFile(path.join(__dirname, 'renderer', 'overlay.html'));

  // Save window bounds on close
  overlayWindow.on('close', () => {
    store.set('overlayBounds', overlayWindow.getBounds());
  });

  // Initially hidden
  overlayWindow.hide();

  // Development tools
  if (process.env.NODE_ENV === 'development') {
    overlayWindow.webContents.openDevTools({ mode: 'detach' });
  }

  return overlayWindow;
}

// Setup global shortcuts
function setupGlobalShortcuts() {
  // Toggle overlay visibility
  globalShortcut.register('CmdOrCtrl+Shift+H', () => {
    if (overlayWindow) {
      if (overlayWindow.isVisible()) {
        overlayWindow.hide();
      } else {
        overlayWindow.show();
        overlayWindow.focus();
      }
    }
  });

  // Quick suggestions
  globalShortcut.register('CmdOrCtrl+Shift+S', () => {
    if (overlayWindow && overlayWindow.isVisible()) {
      overlayWindow.webContents.send('trigger-suggestions');
    }
  });

  // Objection handling
  globalShortcut.register('CmdOrCtrl+Shift+O', () => {
    if (overlayWindow && overlayWindow.isVisible()) {
      overlayWindow.webContents.send('trigger-objection-handling');
    }
  });

  // Call checklist
  globalShortcut.register('CmdOrCtrl+Shift+C', () => {
    if (overlayWindow && overlayWindow.isVisible()) {
      overlayWindow.webContents.send('trigger-checklist');
    }
  });
}

// WebSocket server for communication with main Dialara app
function createWebSocketServer() {
  const port = parseInt(process.env.OVERLAY_PORT, 10) || 8765;
  wsServer = new WebSocket.Server({ port });
  
  wsServer.on('connection', (ws) => {
    console.log('Dialara main app connected to overlay');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log('Received from main app:', data.type);
        
        // Forward data to overlay window
        if (overlayWindow && overlayWindow.webContents) {
          overlayWindow.webContents.send('dialara-data', data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('Dialara main app disconnected');
    });
  });
  
  console.log(`WebSocket server started on port ${port}`);
}

// IPC handlers
function setupIpcHandlers() {
  // Handle LLM requests from renderer
  ipcMain.handle('request-llm-suggestions', async (event, data) => {
    try {
      const suggestions = await generateLLMSuggestions(data);
      return { success: true, suggestions };
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return { success: false, error: error.message };
    }
  });

  // Handle configuration updates
  ipcMain.handle('update-config', async (event, config) => {
    try {
      store.set('overlayConfig', config);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get current configuration
  ipcMain.handle('get-config', async () => {
    return store.get('overlayConfig', {});
  });

  // Close overlay
  ipcMain.handle('close-overlay', () => {
    if (overlayWindow) {
      overlayWindow.hide();
    }
  });

  // Minimize overlay
  ipcMain.handle('minimize-overlay', () => {
    if (overlayWindow) {
      overlayWindow.minimize();
    }
  });
}

// Import LLM service
const LLMService = require('./llm/llmService');
let llmService;

// Initialize LLM service
function initializeLLMService() {
  try {
    llmService = new LLMService();
    console.log('LLM service initialized');
  } catch (error) {
    console.error('Failed to initialize LLM service:', error);
    llmService = null;
  }
}

// Generate LLM suggestions using the service
async function generateLLMSuggestions(data) {
  if (!llmService) {
    console.log('LLM service not available, using fallback');
    return getFallbackSuggestions();
  }

  try {
    let result;
    
    switch (data.type) {
      case 'suggestions':
        result = await llmService.generateSuggestions(data);
        break;
      case 'objections':
        result = await llmService.generateObjectionHandling(data);
        break;
      case 'qualification':
        result = await llmService.generateQualificationQuestions(data);
        break;
      case 'summary':
        result = await llmService.generateCallSummary(data);
        break;
      default:
        result = await llmService.generateSuggestions(data);
    }

    return {
      suggestions: result.suggestions || result.objections || result.questions || [],
      objections: result.objections || [],
      checklist: generateChecklist(data),
      confidence: result.confidence || 'medium',
      source: result.source || 'llm'
    };

  } catch (error) {
    console.error('Error generating LLM suggestions:', error);
    return getFallbackSuggestions();
  }
}

// Fallback suggestions when LLM is not available
function getFallbackSuggestions() {
  return {
    suggestions: [
      "Thank you for your interest. Let me explain how our solution can help you...",
      "I understand your concern. Here's how we address that specific issue...",
      "That's a great question. Based on your situation, I'd recommend..."
    ],
    objections: [
      "Price concern: Highlight ROI and cost savings",
      "Timeline concern: Explain implementation process",
      "Feature concern: Demonstrate specific capabilities"
    ],
    checklist: [
      "Qualify budget and decision-making process",
      "Understand current pain points",
      "Present relevant case studies",
      "Schedule follow-up or demo"
    ],
    confidence: 'medium',
    source: 'fallback'
  };
}

// Generate dynamic checklist based on call context
function generateChecklist(data) {
  const baseChecklist = [
    "Proper introduction and rapport building",
    "Qualify budget and decision-making authority",
    "Identify current pain points and challenges",
    "Present relevant solution features",
    "Handle any objections or concerns",
    "Attempt to close or advance the sale",
    "Schedule appropriate follow-up action"
  ];

  // Customize checklist based on call type and context
  if (data.call?.call_type === 'inbound') {
    baseChecklist.unshift("Thank caller and confirm their interest");
  } else if (data.call?.call_type === 'outbound') {
    baseChecklist.unshift("Confirm availability and permission to continue");
  }

  if (data.lead?.status === 'qualified') {
    baseChecklist.push("Review previous conversation notes");
  }

  return baseChecklist;
}

// App event handlers
app.whenReady().then(() => {
  createOverlayWindow();
  setupGlobalShortcuts();
  setupIpcHandlers();
  createWebSocketServer();
  initializeLLMService();
  
  console.log('Dialara Agent Assist Overlay ready');
  
  // Show overlay in development
  if (process.env.NODE_ENV === 'development') {
    overlayWindow.show();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createOverlayWindow();
  }
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
  
  // Close WebSocket server
  if (wsServer) {
    wsServer.close();
  }
});

// Handle app quit
app.on('before-quit', () => {
  if (overlayWindow) {
    store.set('overlayBounds', overlayWindow.getBounds());
  }
});