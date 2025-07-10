const { ipcRenderer } = require('electron');

class OverlayManager {
    constructor() {
        this.currentCall = null;
        this.currentLead = null;
        this.transcript = '';
        this.isConnected = false;
        this.suggestions = [];
        this.objections = [];
        this.checklist = [];
        
        this.initializeUI();
        this.setupEventListeners();
        this.setupIpcListeners();
    }

    initializeUI() {
        // Update status indicators
        this.updateConnectionStatus(false);
        this.updateCallInfo(null);
        this.showDefaultContent();
    }

    setupEventListeners() {
        // Header controls
        document.getElementById('close-btn').addEventListener('click', () => {
            ipcRenderer.invoke('close-overlay');
        });

        document.getElementById('minimize-btn').addEventListener('click', () => {
            ipcRenderer.invoke('minimize-overlay');
        });

        // Action buttons
        document.getElementById('refresh-suggestions').addEventListener('click', () => {
            this.requestSuggestions();
        });

        document.getElementById('refresh-objections').addEventListener('click', () => {
            this.requestObjectionHandling();
        });

        document.getElementById('reset-checklist').addEventListener('click', () => {
            this.resetChecklist();
        });

        // Checklist items
        document.querySelectorAll('.checklist-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.saveChecklistState();
            });
        });

        // Suggestion cards click-to-copy
        document.addEventListener('click', (e) => {
            if (e.target.closest('.suggestion-card.clickable')) {
                const text = e.target.closest('.suggestion-card').textContent;
                navigator.clipboard.writeText(text);
                this.showNotification('Copied to clipboard!');
            }
        });
    }

    setupIpcListeners() {
        // Listen for data from main Dialara app
        ipcRenderer.on('dialara-data', (event, data) => {
            this.handleDialaraData(data);
        });

        // Listen for trigger events from keyboard shortcuts
        ipcRenderer.on('trigger-suggestions', () => {
            this.requestSuggestions();
        });

        ipcRenderer.on('trigger-objection-handling', () => {
            this.requestObjectionHandling();
        });

        ipcRenderer.on('trigger-checklist', () => {
            this.scrollToSection('checklist-section');
        });
    }

    handleDialaraData(data) {
        console.log('Received data from Dialara:', data);
        
        switch (data.type) {
            case 'call-started':
                this.handleCallStarted(data.payload);
                break;
            case 'call-ended':
                this.handleCallEnded(data.payload);
                break;
            case 'transcript-update':
                this.handleTranscriptUpdate(data.payload);
                break;
            case 'lead-data':
                this.handleLeadData(data.payload);
                break;
            case 'app-mode-changed':
                this.handleAppModeChanged(data.payload);
                break;
            case 'connection-status':
                this.updateConnectionStatus(data.payload.connected);
                break;
            default:
                console.log('Unknown data type:', data.type);
        }
    }

    handleCallStarted(callData) {
        this.currentCall = callData;
        this.updateCallInfo(callData);
        this.updateConnectionStatus(true);
        this.resetChecklist();
        this.requestSuggestions();
    }

    handleCallEnded(callData) {
        this.currentCall = null;
        this.updateCallInfo(null);
        this.clearSuggestions();
        // Keep checklist for review
    }

    handleTranscriptUpdate(transcriptData) {
        this.transcript = transcriptData.transcript || '';
        // Auto-request suggestions if transcript has significant changes
        if (transcriptData.shouldTriggerSuggestions) {
            this.requestSuggestions();
        }
    }

    handleLeadData(leadData) {
        this.currentLead = leadData;
        this.updateCallInfo(leadData);
    }

    handleAppModeChanged(modeData) {
        // Only show overlay in CRM mode
        if (modeData.mode !== 'crm') {
            document.getElementById('overlay-container').style.display = 'none';
        } else {
            document.getElementById('overlay-container').style.display = 'flex';
        }
    }

    updateConnectionStatus(connected) {
        this.isConnected = connected;
        const statusIndicator = document.getElementById('connection-status');
        if (connected) {
            statusIndicator.className = 'status-indicator connected';
        } else {
            statusIndicator.className = 'status-indicator disconnected';
        }
    }

    updateCallInfo(callData) {
        if (callData) {
            document.getElementById('contact-name').textContent = callData.contact_name || callData.caller_number || 'Unknown';
            document.getElementById('contact-phone').textContent = callData.caller_number || callData.phone_number || '-';
            document.getElementById('call-duration').textContent = this.formatDuration(callData.duration || 0);
            document.getElementById('lead-status').textContent = callData.status || 'active';
        } else {
            document.getElementById('contact-name').textContent = 'No active call';
            document.getElementById('contact-phone').textContent = '-';
            document.getElementById('call-duration').textContent = '-';
            document.getElementById('lead-status').textContent = '-';
        }
    }

    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    async requestSuggestions() {
        this.showLoadingSuggestions();
        
        try {
            const contextData = {
                call: this.currentCall,
                lead: this.currentLead,
                transcript: this.transcript,
                type: 'suggestions'
            };

            const response = await ipcRenderer.invoke('request-llm-suggestions', contextData);
            
            if (response.success) {
                this.displaySuggestions(response.suggestions.suggestions || []);
            } else {
                this.showError('Failed to get suggestions: ' + response.error);
            }
        } catch (error) {
            console.error('Error requesting suggestions:', error);
            this.showError('Failed to get suggestions');
        }
    }

    async requestObjectionHandling() {
        try {
            const contextData = {
                call: this.currentCall,
                lead: this.currentLead,
                transcript: this.transcript,
                type: 'objections'
            };

            const response = await ipcRenderer.invoke('request-llm-suggestions', contextData);
            
            if (response.success) {
                this.displayObjections(response.suggestions.objections || []);
            } else {
                this.showError('Failed to get objection handling: ' + response.error);
            }
        } catch (error) {
            console.error('Error requesting objection handling:', error);
            this.showError('Failed to get objection handling');
        }
    }

    showLoadingSuggestions() {
        const content = document.getElementById('suggestions-content');
        content.innerHTML = `
            <div class="suggestion-card" id="loading-suggestions">
                <div class="loading-spinner"></div>
                <p>Generating suggestions...</p>
            </div>
        `;
    }

    displaySuggestions(suggestions) {
        const content = document.getElementById('suggestions-content');
        
        if (suggestions.length === 0) {
            content.innerHTML = '<div class="suggestion-card">No suggestions available</div>';
            return;
        }

        content.innerHTML = suggestions.map((suggestion, index) => `
            <div class="suggestion-card clickable" title="Click to copy">
                <div class="suggestion-text">${suggestion}</div>
                <div class="confidence">Confidence: High</div>
            </div>
        `).join('');
    }

    displayObjections(objections) {
        const content = document.getElementById('objections-content');
        
        if (objections.length === 0) {
            content.innerHTML = '<div class="objection-card">No objections detected</div>';
            return;
        }

        content.innerHTML = objections.map(objection => `
            <div class="objection-card">
                <div class="objection-type">${objection.split(':')[0]}</div>
                <div class="objection-responses">
                    <div class="response-item">
                        ${objection.split(':')[1] || objection}
                    </div>
                </div>
            </div>
        `).join('');
    }

    clearSuggestions() {
        document.getElementById('suggestions-content').innerHTML = `
            <div class="suggestion-card">
                <p>No active call</p>
            </div>
        `;
    }

    resetChecklist() {
        document.querySelectorAll('.checklist-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        this.saveChecklistState();
    }

    saveChecklistState() {
        const checklistState = {};
        document.querySelectorAll('.checklist-checkbox').forEach(checkbox => {
            checklistState[checkbox.id] = checkbox.checked;
        });
        localStorage.setItem('checklist-state', JSON.stringify(checklistState));
    }

    loadChecklistState() {
        const saved = localStorage.getItem('checklist-state');
        if (saved) {
            const checklistState = JSON.parse(saved);
            Object.keys(checklistState).forEach(id => {
                const checkbox = document.getElementById(id);
                if (checkbox) {
                    checkbox.checked = checklistState[id];
                }
            });
        }
    }

    showDefaultContent() {
        this.clearSuggestions();
        this.displayObjections([]);
        this.loadChecklistState();
    }

    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }

    showNotification(message) {
        // Simple notification system
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(16, 185, 129, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            z-index: 1000;
            animation: fadeInOut 3s ease-in-out;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showError(message) {
        console.error(message);
        this.showNotification('Error: ' + message);
    }
}

// Add fadeInOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(-10px); }
        20% { opacity: 1; transform: translateY(0); }
        80% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-10px); }
    }
`;
document.head.appendChild(style);

// Initialize overlay manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.overlayManager = new OverlayManager();
});

// Handle window focus for better UX
window.addEventListener('focus', () => {
    if (window.overlayManager && window.overlayManager.currentCall) {
        window.overlayManager.requestSuggestions();
    }
});