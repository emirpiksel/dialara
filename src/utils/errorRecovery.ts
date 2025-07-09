/**
 * Error Recovery System
 * Provides comprehensive error handling, recovery, and resilience mechanisms
 */

import { logger } from './logger';

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Error categories
export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA = 'data',
  UI = 'ui',
  SYSTEM = 'system',
}

// Enhanced error interface
export interface EnhancedError {
  id: string;
  message: string;
  originalError?: Error;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context: string;
  timestamp: Date;
  userId?: string;
  userAgent?: string;
  url?: string;
  stackTrace?: string;
  metadata?: Record<string, any>;
  recoverable: boolean;
  attempts: number;
  maxAttempts: number;
}

// Recovery action interface
export interface RecoveryAction {
  id: string;
  name: string;
  description: string;
  condition: (error: EnhancedError) => boolean;
  action: (error: EnhancedError) => Promise<boolean>;
  priority: number;
  maxAttempts: number;
}

// Error recovery result
export interface RecoveryResult {
  success: boolean;
  action?: RecoveryAction;
  message: string;
  nextAttemptDelay?: number;
}

// Error recovery manager
export class ErrorRecoveryManager {
  private errors: Map<string, EnhancedError> = new Map();
  private recoveryActions: RecoveryAction[] = [];
  private recoveryQueue: EnhancedError[] = [];
  private isProcessing = false;
  private maxRetries = 3;
  private baseDelayMs = 1000;
  private maxDelayMs = 30000;

  constructor() {
    this.setupDefaultRecoveryActions();
  }

  // Register a new recovery action
  registerRecoveryAction(action: RecoveryAction): void {
    this.recoveryActions.push(action);
    this.recoveryActions.sort((a, b) => b.priority - a.priority);
    
    logger.component('ErrorRecovery').info('Recovery action registered', {
      actionId: action.id,
      priority: action.priority,
    });
  }

  // Handle an error with automatic recovery
  async handleError(
    error: Error,
    context: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    category: ErrorCategory = ErrorCategory.SYSTEM,
    metadata?: Record<string, any>
  ): Promise<RecoveryResult> {
    const enhancedError = this.createEnhancedError(
      error,
      context,
      severity,
      category,
      metadata
    );

    // Store error for tracking
    this.errors.set(enhancedError.id, enhancedError);

    // Log error
    logger.component('ErrorRecovery').error('Error occurred', {
      errorId: enhancedError.id,
      message: enhancedError.message,
      severity: enhancedError.severity,
      category: enhancedError.category,
      context: enhancedError.context,
    });

    // Attempt immediate recovery
    if (enhancedError.recoverable) {
      return await this.attemptRecovery(enhancedError);
    }

    return {
      success: false,
      message: 'Error is not recoverable',
    };
  }

  // Attempt to recover from an error
  private async attemptRecovery(error: EnhancedError): Promise<RecoveryResult> {
    if (error.attempts >= error.maxAttempts) {
      logger.component('ErrorRecovery').error('Max recovery attempts exceeded', {
        errorId: error.id,
        attempts: error.attempts,
        maxAttempts: error.maxAttempts,
      });
      
      return {
        success: false,
        message: `Max recovery attempts (${error.maxAttempts}) exceeded`,
      };
    }

    // Find applicable recovery action
    const recoveryAction = this.findRecoveryAction(error);
    
    if (!recoveryAction) {
      logger.component('ErrorRecovery').warn('No recovery action found for error', {
        errorId: error.id,
        category: error.category,
      });
      
      return {
        success: false,
        message: 'No recovery action available',
      };
    }

    // Increment attempt count
    error.attempts++;
    this.errors.set(error.id, error);

    try {
      logger.component('ErrorRecovery').info('Attempting recovery', {
        errorId: error.id,
        actionId: recoveryAction.id,
        attempt: error.attempts,
      });

      const success = await recoveryAction.action(error);
      
      if (success) {
        logger.component('ErrorRecovery').info('Recovery successful', {
          errorId: error.id,
          actionId: recoveryAction.id,
        });
        
        // Remove error from tracking
        this.errors.delete(error.id);
        
        return {
          success: true,
          action: recoveryAction,
          message: 'Recovery successful',
        };
      } else {
        logger.component('ErrorRecovery').warn('Recovery failed', {
          errorId: error.id,
          actionId: recoveryAction.id,
          attempt: error.attempts,
        });
        
        // Calculate delay for next attempt
        const nextDelay = this.calculateBackoffDelay(error.attempts);
        
        return {
          success: false,
          action: recoveryAction,
          message: 'Recovery failed, will retry',
          nextAttemptDelay: nextDelay,
        };
      }
    } catch (recoveryError) {
      logger.component('ErrorRecovery').error('Recovery action threw error', {
        errorId: error.id,
        actionId: recoveryAction.id,
        recoveryError: recoveryError instanceof Error ? recoveryError.message : recoveryError,
      });
      
      return {
        success: false,
        action: recoveryAction,
        message: 'Recovery action failed',
      };
    }
  }

  // Find the best recovery action for an error
  private findRecoveryAction(error: EnhancedError): RecoveryAction | undefined {
    return this.recoveryActions.find(action => 
      action.condition(error) && error.attempts < action.maxAttempts
    );
  }

  // Create an enhanced error from a regular error
  private createEnhancedError(
    originalError: Error,
    context: string,
    severity: ErrorSeverity,
    category: ErrorCategory,
    metadata?: Record<string, any>
  ): EnhancedError {
    const errorId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: errorId,
      message: originalError.message,
      originalError,
      severity,
      category,
      context,
      timestamp: new Date(),
      userId: this.getCurrentUserId(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      stackTrace: originalError.stack,
      metadata,
      recoverable: this.isRecoverable(originalError, category),
      attempts: 0,
      maxAttempts: this.getMaxAttempts(severity, category),
    };
  }

  // Determine if an error is recoverable
  private isRecoverable(error: Error, category: ErrorCategory): boolean {
    // Network errors are usually recoverable
    if (category === ErrorCategory.NETWORK) {
      return true;
    }
    
    // Some validation errors can be recovered
    if (category === ErrorCategory.VALIDATION) {
      return true;
    }
    
    // Authentication errors might be recoverable
    if (category === ErrorCategory.AUTHENTICATION) {
      return error.message.includes('token') || error.message.includes('session');
    }
    
    // Data errors might be recoverable
    if (category === ErrorCategory.DATA) {
      return !error.message.includes('constraint') && !error.message.includes('unique');
    }
    
    // UI errors are usually recoverable
    if (category === ErrorCategory.UI) {
      return true;
    }
    
    // System errors are usually not recoverable
    return false;
  }

  // Get max attempts based on severity and category
  private getMaxAttempts(severity: ErrorSeverity, category: ErrorCategory): number {
    if (category === ErrorCategory.NETWORK) {
      return severity === ErrorSeverity.CRITICAL ? 5 : 3;
    }
    
    if (category === ErrorCategory.AUTHENTICATION) {
      return 2;
    }
    
    return this.maxRetries;
  }

  // Calculate exponential backoff delay
  private calculateBackoffDelay(attempts: number): number {
    const delay = this.baseDelayMs * Math.pow(2, attempts - 1);
    return Math.min(delay, this.maxDelayMs);
  }

  // Get current user ID (implement based on your auth system)
  private getCurrentUserId(): string | undefined {
    // This would typically get the user ID from your auth store
    return undefined;
  }

  // Setup default recovery actions
  private setupDefaultRecoveryActions(): void {
    // Network error recovery
    this.registerRecoveryAction({
      id: 'network-retry',
      name: 'Network Retry',
      description: 'Retry network requests with exponential backoff',
      condition: (error) => error.category === ErrorCategory.NETWORK,
      action: async (error) => {
        // Wait for backoff delay
        const delay = this.calculateBackoffDelay(error.attempts);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // If the error has retry metadata, use it
        if (error.metadata?.retryFn) {
          try {
            await error.metadata.retryFn();
            return true;
          } catch (retryError) {
            return false;
          }
        }
        
        return false;
      },
      priority: 100,
      maxAttempts: 3,
    });

    // Authentication error recovery
    this.registerRecoveryAction({
      id: 'auth-refresh',
      name: 'Authentication Refresh',
      description: 'Attempt to refresh authentication tokens',
      condition: (error) => 
        error.category === ErrorCategory.AUTHENTICATION &&
        (error.message.includes('token') || error.message.includes('session')),
      action: async (error) => {
        // This would refresh the auth token
        // Implementation depends on your auth system
        if (error.metadata?.refreshAuth) {
          try {
            await error.metadata.refreshAuth();
            return true;
          } catch (refreshError) {
            return false;
          }
        }
        
        return false;
      },
      priority: 90,
      maxAttempts: 2,
    });

    // UI error recovery
    this.registerRecoveryAction({
      id: 'ui-reset',
      name: 'UI Reset',
      description: 'Reset UI state to recover from rendering errors',
      condition: (error) => error.category === ErrorCategory.UI,
      action: async (error) => {
        // This would reset the UI state
        if (error.metadata?.resetUI) {
          try {
            error.metadata.resetUI();
            return true;
          } catch (resetError) {
            return false;
          }
        }
        
        return false;
      },
      priority: 80,
      maxAttempts: 1,
    });

    // Data error recovery
    this.registerRecoveryAction({
      id: 'data-retry',
      name: 'Data Retry',
      description: 'Retry data operations with cleaned data',
      condition: (error) => error.category === ErrorCategory.DATA,
      action: async (error) => {
        // This would retry with sanitized data
        if (error.metadata?.retryWithCleanData) {
          try {
            await error.metadata.retryWithCleanData();
            return true;
          } catch (retryError) {
            return false;
          }
        }
        
        return false;
      },
      priority: 70,
      maxAttempts: 2,
    });
  }

  // Get error statistics
  getErrorStats(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    byCategory: Record<ErrorCategory, number>;
    recoverable: number;
  } {
    const stats = {
      total: this.errors.size,
      bySeverity: {} as Record<ErrorSeverity, number>,
      byCategory: {} as Record<ErrorCategory, number>,
      recoverable: 0,
    };

    // Initialize counters
    Object.values(ErrorSeverity).forEach(severity => {
      stats.bySeverity[severity] = 0;
    });
    
    Object.values(ErrorCategory).forEach(category => {
      stats.byCategory[category] = 0;
    });

    // Count errors
    this.errors.forEach(error => {
      stats.bySeverity[error.severity]++;
      stats.byCategory[error.category]++;
      if (error.recoverable) {
        stats.recoverable++;
      }
    });

    return stats;
  }

  // Clear resolved errors
  clearResolvedErrors(): void {
    this.errors.clear();
    logger.component('ErrorRecovery').info('Cleared resolved errors');
  }

  // Get all errors
  getAllErrors(): EnhancedError[] {
    return Array.from(this.errors.values());
  }

  // Get errors by category
  getErrorsByCategory(category: ErrorCategory): EnhancedError[] {
    return Array.from(this.errors.values()).filter(error => error.category === category);
  }

  // Get errors by severity
  getErrorsBySeverity(severity: ErrorSeverity): EnhancedError[] {
    return Array.from(this.errors.values()).filter(error => error.severity === severity);
  }
}

// Create global error recovery manager instance
export const errorRecovery = new ErrorRecoveryManager();

// Utility functions for common error scenarios
export const handleNetworkError = (error: Error, retryFn?: () => Promise<void>) => {
  return errorRecovery.handleError(
    error,
    'Network Request',
    ErrorSeverity.MEDIUM,
    ErrorCategory.NETWORK,
    { retryFn }
  );
};

export const handleAuthError = (error: Error, refreshAuth?: () => Promise<void>) => {
  return errorRecovery.handleError(
    error,
    'Authentication',
    ErrorSeverity.HIGH,
    ErrorCategory.AUTHENTICATION,
    { refreshAuth }
  );
};

export const handleValidationError = (error: Error, context: string) => {
  return errorRecovery.handleError(
    error,
    context,
    ErrorSeverity.LOW,
    ErrorCategory.VALIDATION
  );
};

export const handleDataError = (error: Error, retryWithCleanData?: () => Promise<void>) => {
  return errorRecovery.handleError(
    error,
    'Data Operation',
    ErrorSeverity.MEDIUM,
    ErrorCategory.DATA,
    { retryWithCleanData }
  );
};

export const handleUIError = (error: Error, resetUI?: () => void) => {
  return errorRecovery.handleError(
    error,
    'UI Rendering',
    ErrorSeverity.MEDIUM,
    ErrorCategory.UI,
    { resetUI }
  );
};

export const handleSystemError = (error: Error, context: string) => {
  return errorRecovery.handleError(
    error,
    context,
    ErrorSeverity.CRITICAL,
    ErrorCategory.SYSTEM
  );
};