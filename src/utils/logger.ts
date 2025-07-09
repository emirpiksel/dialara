/**
 * Frontend logging utility with structured logging support
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  component?: string;
  action?: string;
  userId?: string;
  error?: Error;
}

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.logLevel = this.getLogLevel();
    this.isDevelopment = this.getEnvironmentMode() === 'development';
  }

  private getEnvironmentMode(): string {
    // In Vite, use import.meta.env.MODE instead of process.env.NODE_ENV
    // Fallback to 'production' if not available
    try {
      return import.meta.env?.MODE || 'production';
    } catch (error) {
      // Fallback in case import.meta is not available
      return 'production';
    }
  }

  private getLogLevel(): LogLevel {
    // Use VITE_ prefix for environment variables in Vite
    // Provide safe fallback if import.meta.env is not available
    let envLevel = 'INFO';
    
    try {
      envLevel = import.meta.env?.VITE_LOG_LEVEL || 'INFO';
    } catch (error) {
      // Fallback to INFO if import.meta.env is not available
      envLevel = 'INFO';
    }
    
    switch (envLevel.toUpperCase()) {
      case 'DEBUG':
        return LogLevel.DEBUG;
      case 'INFO':
        return LogLevel.INFO;
      case 'WARN':
        return LogLevel.WARN;
      case 'ERROR':
        return LogLevel.ERROR;
      default:
        return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(entry: LogEntry): string {
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const prefix = `[${entry.timestamp}] ${levelNames[entry.level]}`;
    
    let message = `${prefix}: ${entry.message}`;
    
    if (entry.component) {
      message += ` (${entry.component})`;
    }
    
    if (entry.action) {
      message += ` [${entry.action}]`;
    }
    
    if (entry.userId) {
      message += ` {user: ${entry.userId}}`;
    }
    
    return message;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
    };

    const formattedMessage = this.formatMessage(entry);

    // In development, use console with colors and formatting
    if (this.isDevelopment) {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage, context, error);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage, context, error);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage, context, error);
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage, context, error);
          break;
      }
    } else {
      // In production, could send to external logging service
      console.log(JSON.stringify(entry));
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  // Component-specific logging methods
  component(componentName: string) {
    return {
      debug: (message: string, context?: Record<string, any>) => {
        const entry: LogEntry = {
          timestamp: new Date().toISOString(),
          level: LogLevel.DEBUG,
          message,
          context,
          component: componentName,
        };
        if (this.shouldLog(LogLevel.DEBUG)) {
          const formattedMessage = this.formatMessage(entry);
          if (this.isDevelopment) {
            console.debug(formattedMessage, context);
          } else {
            console.log(JSON.stringify(entry));
          }
        }
      },
      info: (message: string, context?: Record<string, any>) => {
        const entry: LogEntry = {
          timestamp: new Date().toISOString(),
          level: LogLevel.INFO,
          message,
          context,
          component: componentName,
        };
        if (this.shouldLog(LogLevel.INFO)) {
          const formattedMessage = this.formatMessage(entry);
          if (this.isDevelopment) {
            console.info(formattedMessage, context);
          } else {
            console.log(JSON.stringify(entry));
          }
        }
      },
      warn: (message: string, context?: Record<string, any>) => {
        const entry: LogEntry = {
          timestamp: new Date().toISOString(),
          level: LogLevel.WARN,
          message,
          context,
          component: componentName,
        };
        if (this.shouldLog(LogLevel.WARN)) {
          const formattedMessage = this.formatMessage(entry);
          if (this.isDevelopment) {
            console.warn(formattedMessage, context);
          } else {
            console.log(JSON.stringify(entry));
          }
        }
      },
      error: (message: string, context?: Record<string, any>, error?: Error) => {
        const entry: LogEntry = {
          timestamp: new Date().toISOString(),
          level: LogLevel.ERROR,
          message,
          context,
          component: componentName,
          error,
        };
        if (this.shouldLog(LogLevel.ERROR)) {
          const formattedMessage = this.formatMessage(entry);
          if (this.isDevelopment) {
            console.error(formattedMessage, context, error);
          } else {
            console.log(JSON.stringify(entry));
          }
        }
      },
    };
  }

  // Action-specific logging (for user actions, API calls, etc.)
  action(actionName: string, userId?: string) {
    return {
      start: (message: string, context?: Record<string, any>) => {
        this.log(LogLevel.INFO, `Started: ${message}`, { ...context, action: actionName, userId });
      },
      success: (message: string, context?: Record<string, any>) => {
        this.log(LogLevel.INFO, `Success: ${message}`, { ...context, action: actionName, userId });
      },
      failure: (message: string, context?: Record<string, any>, error?: Error) => {
        this.log(LogLevel.ERROR, `Failed: ${message}`, { ...context, action: actionName, userId }, error);
      },
      debug: (message: string, context?: Record<string, any>) => {
        this.log(LogLevel.DEBUG, message, { ...context, action: actionName, userId });
      },
    };
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const log = logger;
export default logger;