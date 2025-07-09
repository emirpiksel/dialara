/**
 * State Validation and Error Recovery Utilities
 * Provides comprehensive validation and recovery mechanisms for Zustand stores
 */

import { logger } from './logger';

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// Validation error interface
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  code: string;
}

// Validation warning interface
export interface ValidationWarning {
  field: string;
  message: string;
  suggestion: string;
}

// Schema definition for validation
export interface ValidationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date' | 'null';
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any) => boolean;
    customMessage?: string;
  };
}

// State sanitization options
export interface SanitizationOptions {
  removeNullish?: boolean;
  trimStrings?: boolean;
  normalizeArrays?: boolean;
  validateTypes?: boolean;
  maxDepth?: number;
}

// Create validation schema for common store patterns
export const createStoreValidationSchema = (customFields: ValidationSchema = {}): ValidationSchema => ({
  // Base store fields
  isLoading: {
    type: 'boolean',
    required: true,
  },
  error: {
    type: 'string',
    required: false,
  },
  initialized: {
    type: 'boolean',
    required: true,
  },
  lastUpdated: {
    type: 'date',
    required: false,
  },
  
  // Pagination fields
  currentPage: {
    type: 'number',
    required: false,
    min: 1,
  },
  pageSize: {
    type: 'number',
    required: false,
    min: 1,
    max: 100,
  },
  totalPages: {
    type: 'number',
    required: false,
    min: 0,
  },
  totalItems: {
    type: 'number',
    required: false,
    min: 0,
  },
  
  // Filter fields
  searchQuery: {
    type: 'string',
    required: false,
  },
  sortBy: {
    type: 'string',
    required: false,
  },
  sortOrder: {
    type: 'string',
    required: false,
    custom: (value: string) => ['asc', 'desc'].includes(value),
    customMessage: 'sortOrder must be "asc" or "desc"',
  },
  
  // Custom fields
  ...customFields,
});

// Validate state against schema
export const validateState = <T extends Record<string, any>>(
  state: T,
  schema: ValidationSchema,
  context = 'State'
): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  try {
    // Check required fields
    Object.entries(schema).forEach(([field, rules]) => {
      const value = state[field];
      
      // Required field check
      if (rules.required && (value === undefined || value === null)) {
        errors.push({
          field,
          message: `${field} is required`,
          severity: 'error',
          code: 'REQUIRED_FIELD_MISSING',
        });
        return;
      }
      
      // Skip validation for optional null/undefined values
      if (value === undefined || value === null) {
        return;
      }
      
      // Type validation
      if (!validateType(value, rules.type)) {
        errors.push({
          field,
          message: `${field} must be of type ${rules.type}`,
          severity: 'error',
          code: 'TYPE_MISMATCH',
        });
        return;
      }
      
      // Range validation for numbers
      if (rules.type === 'number' && typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push({
            field,
            message: `${field} must be at least ${rules.min}`,
            severity: 'error',
            code: 'VALUE_TOO_LOW',
          });
        }
        
        if (rules.max !== undefined && value > rules.max) {
          errors.push({
            field,
            message: `${field} must be at most ${rules.max}`,
            severity: 'error',
            code: 'VALUE_TOO_HIGH',
          });
        }
      }
      
      // String pattern validation
      if (rules.type === 'string' && typeof value === 'string' && rules.pattern) {
        if (!rules.pattern.test(value)) {
          errors.push({
            field,
            message: `${field} format is invalid`,
            severity: 'error',
            code: 'PATTERN_MISMATCH',
          });
        }
      }
      
      // Custom validation
      if (rules.custom && !rules.custom(value)) {
        errors.push({
          field,
          message: rules.customMessage || `${field} failed custom validation`,
          severity: 'error',
          code: 'CUSTOM_VALIDATION_FAILED',
        });
      }
    });
    
    // Check for unexpected fields
    Object.keys(state).forEach(field => {
      if (!schema[field]) {
        warnings.push({
          field,
          message: `Unexpected field: ${field}`,
          suggestion: 'Consider adding this field to the validation schema',
        });
      }
    });
    
    // Log validation results
    const logContext = logger.component('StateValidation');
    
    if (errors.length > 0) {
      logContext.error(`${context} validation failed`, { errors });
    } else if (warnings.length > 0) {
      logContext.warn(`${context} validation warnings`, { warnings });
    } else {
      logContext.info(`${context} validation passed`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
    
  } catch (error) {
    const validationError: ValidationError = {
      field: 'validation',
      message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'error',
      code: 'VALIDATION_ERROR',
    };
    
    return {
      isValid: false,
      errors: [validationError],
      warnings: [],
    };
  }
};

// Type validation helper
const validateType = (value: any, expectedType: string): boolean => {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'date':
      return value instanceof Date && !isNaN(value.getTime());
    case 'null':
      return value === null;
    default:
      return false;
  }
};

// Sanitize state to fix common issues
export const sanitizeState = <T extends Record<string, any>>(
  state: T,
  options: SanitizationOptions = {}
): T => {
  const {
    removeNullish = false,
    trimStrings = true,
    normalizeArrays = true,
    validateTypes = true,
    maxDepth = 10,
  } = options;
  
  const sanitize = (obj: any, depth = 0): any => {
    if (depth > maxDepth) {
      logger.component('StateValidation').warn('Max depth exceeded during sanitization');
      return obj;
    }
    
    if (obj === null || obj === undefined) {
      return removeNullish ? undefined : obj;
    }
    
    if (typeof obj === 'string') {
      return trimStrings ? obj.trim() : obj;
    }
    
    if (Array.isArray(obj)) {
      let sanitized = obj.map(item => sanitize(item, depth + 1));
      
      if (normalizeArrays) {
        sanitized = sanitized.filter(item => item !== undefined);
      }
      
      return sanitized;
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
      
      Object.entries(obj).forEach(([key, value]) => {
        const sanitizedValue = sanitize(value, depth + 1);
        
        if (!removeNullish || sanitizedValue !== undefined) {
          sanitized[key] = sanitizedValue;
        }
      });
      
      return sanitized;
    }
    
    return obj;
  };
  
  return sanitize(state);
};

// Error recovery strategies
export interface RecoveryStrategy {
  name: string;
  condition: (error: ValidationError) => boolean;
  recover: (state: any, error: ValidationError) => any;
}

// Default recovery strategies
export const defaultRecoveryStrategies: RecoveryStrategy[] = [
  {
    name: 'SetDefaultBoolean',
    condition: (error) => error.code === 'TYPE_MISMATCH' && error.message.includes('boolean'),
    recover: (state, error) => ({
      ...state,
      [error.field]: false,
    }),
  },
  {
    name: 'SetDefaultNumber',
    condition: (error) => error.code === 'TYPE_MISMATCH' && error.message.includes('number'),
    recover: (state, error) => ({
      ...state,
      [error.field]: 0,
    }),
  },
  {
    name: 'SetDefaultString',
    condition: (error) => error.code === 'TYPE_MISMATCH' && error.message.includes('string'),
    recover: (state, error) => ({
      ...state,
      [error.field]: '',
    }),
  },
  {
    name: 'SetDefaultArray',
    condition: (error) => error.code === 'TYPE_MISMATCH' && error.message.includes('array'),
    recover: (state, error) => ({
      ...state,
      [error.field]: [],
    }),
  },
  {
    name: 'SetDefaultObject',
    condition: (error) => error.code === 'TYPE_MISMATCH' && error.message.includes('object'),
    recover: (state, error) => ({
      ...state,
      [error.field]: {},
    }),
  },
  {
    name: 'FixPageNumber',
    condition: (error) => error.field === 'currentPage' && error.code === 'VALUE_TOO_LOW',
    recover: (state, error) => ({
      ...state,
      currentPage: 1,
    }),
  },
  {
    name: 'FixSortOrder',
    condition: (error) => error.field === 'sortOrder' && error.code === 'CUSTOM_VALIDATION_FAILED',
    recover: (state, error) => ({
      ...state,
      sortOrder: 'desc',
    }),
  },
];

// Attempt to recover from validation errors
export const recoverFromValidationErrors = <T extends Record<string, any>>(
  state: T,
  errors: ValidationError[],
  strategies: RecoveryStrategy[] = defaultRecoveryStrategies
): T => {
  let recoveredState = { ...state };
  const unrecoveredErrors: ValidationError[] = [];
  
  errors.forEach(error => {
    const strategy = strategies.find(s => s.condition(error));
    
    if (strategy) {
      logger.component('StateValidation').info(`Applying recovery strategy: ${strategy.name}`, {
        field: error.field,
        error: error.message,
      });
      
      recoveredState = strategy.recover(recoveredState, error);
    } else {
      unrecoveredErrors.push(error);
    }
  });
  
  if (unrecoveredErrors.length > 0) {
    logger.component('StateValidation').error('Could not recover from all validation errors', {
      unrecoveredErrors,
    });
  }
  
  return recoveredState;
};

// Create store validator with built-in recovery
export const createStoreValidator = <T extends Record<string, any>>(
  schema: ValidationSchema,
  customStrategies: RecoveryStrategy[] = []
) => {
  const allStrategies = [...defaultRecoveryStrategies, ...customStrategies];
  
  return {
    validate: (state: T, context?: string): ValidationResult => {
      return validateState(state, schema, context);
    },
    
    validateAndRecover: (state: T, context?: string): { state: T; result: ValidationResult } => {
      const result = validateState(state, schema, context);
      
      if (!result.isValid) {
        const recoveredState = recoverFromValidationErrors(state, result.errors, allStrategies);
        
        // Re-validate recovered state
        const newResult = validateState(recoveredState, schema, context);
        
        return {
          state: recoveredState,
          result: newResult,
        };
      }
      
      return { state, result };
    },
    
    sanitize: (state: T, options?: SanitizationOptions): T => {
      return sanitizeState(state, options);
    },
  };
};

// Store health check utilities
export const createHealthCheck = <T extends Record<string, any>>(
  storeName: string,
  validator: ReturnType<typeof createStoreValidator>
) => {
  let healthCheckInterval: NodeJS.Timeout | null = null;
  
  return {
    startHealthCheck: (
      getState: () => T,
      setState: (state: T) => void,
      intervalMs = 30000 // 30 seconds
    ) => {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
      
      healthCheckInterval = setInterval(() => {
        const state = getState();
        const { state: recoveredState, result } = validator.validateAndRecover(state, `${storeName} Health Check`);
        
        if (!result.isValid) {
          logger.component('StateValidation').warn(`${storeName} health check found issues`, {
            errors: result.errors,
            warnings: result.warnings,
          });
          
          // Update state with recovered version
          setState(recoveredState);
        }
      }, intervalMs);
      
      logger.component('StateValidation').info(`${storeName} health check started`, { intervalMs });
    },
    
    stopHealthCheck: () => {
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
        logger.component('StateValidation').info(`${storeName} health check stopped`);
      }
    },
    
    runHealthCheck: (getState: () => T, setState: (state: T) => void) => {
      const state = getState();
      const { state: recoveredState, result } = validator.validateAndRecover(state, `${storeName} Manual Health Check`);
      
      if (!result.isValid) {
        setState(recoveredState);
      }
      
      return result;
    },
  };
};