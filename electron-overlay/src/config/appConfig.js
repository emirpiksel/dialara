const Store = require('electron-store');
const path = require('path');

class AppConfig {
  constructor() {
    this.store = new Store({
      name: 'dialara-agent-assist-config',
      defaults: {
        overlay: {
          width: parseInt(process.env.OVERLAY_WIDTH) || 400,
          height: parseInt(process.env.OVERLAY_HEIGHT) || 600,
          opacity: parseFloat(process.env.OVERLAY_OPACITY) || 0.95,
          alwaysOnTop: true,
          autoShow: false,
          position: 'bottom-right'
        },
        shortcuts: {
          toggle: 'CmdOrCtrl+Shift+H',
          suggestions: 'CmdOrCtrl+Shift+S',
          objections: 'CmdOrCtrl+Shift+O',
          checklist: 'CmdOrCtrl+Shift+C'
        },
        llm: {
          provider: 'openai', // 'openai', 'gemini', or 'none'
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
          maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 500,
          temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
          timeout: 10000, // 10 seconds
          retries: 3
        },
        websocket: {
          port: parseInt(process.env.OVERLAY_PORT) || 8765,
          reconnectDelay: 1000,
          maxReconnectAttempts: 5
        },
        ui: {
          theme: 'light', // 'light' or 'dark'
          animations: true,
          notifications: true,
          autoRefresh: true,
          refreshInterval: 30000 // 30 seconds
        },
        features: {
          suggestions: true,
          objections: true,
          checklist: true,
          autoTrigger: false,
          transcriptAnalysis: true,
          callSummary: true
        },
        privacy: {
          logTranscripts: false,
          anonymizeData: true,
          retentionDays: 7
        }
      }
    });
  }

  // Getters for main configuration sections
  getOverlayConfig() {
    return this.store.get('overlay');
  }

  getShortcutsConfig() {
    return this.store.get('shortcuts');
  }

  getLLMConfig() {
    return this.store.get('llm');
  }

  getWebSocketConfig() {
    return this.store.get('websocket');
  }

  getUIConfig() {
    return this.store.get('ui');
  }

  getFeaturesConfig() {
    return this.store.get('features');
  }

  getPrivacyConfig() {
    return this.store.get('privacy');
  }

  // Setters for updating configuration
  updateOverlayConfig(updates) {
    const current = this.getOverlayConfig();
    this.store.set('overlay', { ...current, ...updates });
  }

  updateShortcutsConfig(updates) {
    const current = this.getShortcutsConfig();
    this.store.set('shortcuts', { ...current, ...updates });
  }

  updateLLMConfig(updates) {
    const current = this.getLLMConfig();
    this.store.set('llm', { ...current, ...updates });
  }

  updateUIConfig(updates) {
    const current = this.getUIConfig();
    this.store.set('ui', { ...current, ...updates });
  }

  updateFeaturesConfig(updates) {
    const current = this.getFeaturesConfig();
    this.store.set('features', { ...current, ...updates });
  }

  updatePrivacyConfig(updates) {
    const current = this.getPrivacyConfig();
    this.store.set('privacy', { ...current, ...updates });
  }

  // Get complete configuration
  getAllConfig() {
    return {
      overlay: this.getOverlayConfig(),
      shortcuts: this.getShortcutsConfig(),
      llm: this.getLLMConfig(),
      websocket: this.getWebSocketConfig(),
      ui: this.getUIConfig(),
      features: this.getFeaturesConfig(),
      privacy: this.getPrivacyConfig()
    };
  }

  // Reset to defaults
  resetToDefaults() {
    this.store.clear();
    console.log('Configuration reset to defaults');
  }

  // Validation methods
  validateLLMConfig(config) {
    const { provider, model, maxTokens, temperature } = config;
    
    if (!['openai', 'gemini', 'none'].includes(provider)) {
      throw new Error('Invalid LLM provider. Must be openai, gemini, or none');
    }
    
    if (maxTokens && (maxTokens < 10 || maxTokens > 4000)) {
      throw new Error('maxTokens must be between 10 and 4000');
    }
    
    if (temperature && (temperature < 0 || temperature > 2)) {
      throw new Error('temperature must be between 0 and 2');
    }
    
    return true;
  }

  validateOverlayConfig(config) {
    const { width, height, opacity } = config;
    
    if (width && (width < 200 || width > 800)) {
      throw new Error('Overlay width must be between 200 and 800 pixels');
    }
    
    if (height && (height < 300 || height > 1000)) {
      throw new Error('Overlay height must be between 300 and 1000 pixels');
    }
    
    if (opacity && (opacity < 0.1 || opacity > 1.0)) {
      throw new Error('Overlay opacity must be between 0.1 and 1.0');
    }
    
    return true;
  }

  // Export configuration
  exportConfig() {
    const config = this.getAllConfig();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `dialara-config-${timestamp}.json`;
    
    return {
      filename,
      config: JSON.stringify(config, null, 2)
    };
  }

  // Import configuration
  importConfig(configData) {
    try {
      const config = typeof configData === 'string' ? JSON.parse(configData) : configData;
      
      // Validate each section
      if (config.llm) this.validateLLMConfig(config.llm);
      if (config.overlay) this.validateOverlayConfig(config.overlay);
      
      // Update configuration
      Object.keys(config).forEach(key => {
        if (this.store.has(key)) {
          this.store.set(key, config[key]);
        }
      });
      
      console.log('Configuration imported successfully');
      return true;
    } catch (error) {
      console.error('Failed to import configuration:', error);
      throw error;
    }
  }

  // Get environment-specific configuration
  getEnvironmentConfig() {
    return {
      isDevelopment: process.env.NODE_ENV === 'development',
      debugMode: process.env.DEBUG_MODE === 'true',
      logLevel: process.env.LOG_LEVEL || 'info',
      version: require('../../package.json').version
    };
  }
}

module.exports = AppConfig;