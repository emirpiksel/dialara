import React, { useEffect, useRef } from 'react';
import { useOverlayBridge } from '../hooks/useOverlayBridge';
import { useAppMode } from '../store/useAppMode';
import { logger } from '../utils/logger';

interface OverlayIntegrationProps {
  children: React.ReactNode;
}

export const OverlayIntegration: React.FC<OverlayIntegrationProps> = ({ children }) => {
  const { mode } = useAppMode();
  const { bridge, isConnected } = useOverlayBridge();
  const lastConnectionStatus = useRef(false);

  useEffect(() => {
    // Only run in CRM mode
    if (mode !== 'crm') {
      return;
    }

    // Log connection status changes
    if (isConnected !== lastConnectionStatus.current) {
      lastConnectionStatus.current = isConnected;
      
      if (isConnected) {
        logger.component('OverlayIntegration').info('Agent assist overlay connected');
        showConnectionNotification('Agent assist overlay connected', 'success');
      } else {
        logger.component('OverlayIntegration').warn('Agent assist overlay disconnected');
        showConnectionNotification('Agent assist overlay disconnected', 'warning');
      }
    }
  }, [mode, isConnected]);

  useEffect(() => {
    // Set up keyboard shortcuts for overlay features (as backup)
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only in CRM mode
      if (mode !== 'crm') return;

      // Ctrl+Shift+H - Toggle overlay visibility
      if (event.ctrlKey && event.shiftKey && event.key === 'H') {
        event.preventDefault();
        logger.component('OverlayIntegration').info('Toggle overlay shortcut triggered');
      }

      // Ctrl+Shift+S - Trigger suggestions
      if (event.ctrlKey && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        logger.component('OverlayIntegration').info('Suggestions shortcut triggered');
      }

      // Ctrl+Shift+O - Objection handling
      if (event.ctrlKey && event.shiftKey && event.key === 'O') {
        event.preventDefault();
        logger.component('OverlayIntegration').info('Objection handling shortcut triggered');
      }

      // Ctrl+Shift+C - Checklist
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        logger.component('OverlayIntegration').info('Checklist shortcut triggered');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mode]);

  const showConnectionNotification = (message: string, type: 'success' | 'warning' | 'error') => {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 6px;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
      ${type === 'success' ? 'background-color: #10b981;' : ''}
      ${type === 'warning' ? 'background-color: #f59e0b;' : ''}
      ${type === 'error' ? 'background-color: #ef4444;' : ''}
    `;
    notification.textContent = message;

    // Add animation styles
    if (!document.querySelector('#overlay-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'overlay-notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  };

  // Render children with overlay integration context
  return (
    <>
      {children}
      {mode === 'crm' && (
        <div 
          id="overlay-integration-status" 
          style={{ 
            position: 'fixed', 
            bottom: '20px', 
            left: '20px', 
            fontSize: '12px', 
            color: isConnected ? '#10b981' : '#ef4444',
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '4px 8px',
            borderRadius: '4px',
            border: `1px solid ${isConnected ? '#10b981' : '#ef4444'}`,
            zIndex: 1000,
            fontFamily: 'monospace'
          }}
        >
          AI Assist: {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      )}
    </>
  );
};