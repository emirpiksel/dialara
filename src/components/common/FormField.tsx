/**
 * Reusable Form Field Components
 * Provides consistent form styling and validation
 */
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface BaseFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  errorClassName?: string;
  helpText?: string;
  icon?: LucideIcon;
}

interface InputFieldProps extends BaseFieldProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxLength?: number;
  pattern?: string;
}

interface TextareaFieldProps extends BaseFieldProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
}

interface SelectFieldProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}

interface CheckboxFieldProps extends BaseFieldProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

// Base field wrapper component
const FieldWrapper: React.FC<{
  label?: string;
  error?: string;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  errorClassName?: string;
  helpText?: string;
  children: React.ReactNode;
}> = ({
  label,
  error,
  required,
  className = '',
  labelClassName = '',
  errorClassName = '',
  helpText,
  children,
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className={`block text-sm font-medium text-gray-700 ${labelClassName}`}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className={`text-sm text-red-600 ${errorClassName}`}>
          {error}
        </p>
      )}
      {helpText && !error && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  );
};

// Input field component
export const InputField: React.FC<InputFieldProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled,
  maxLength,
  pattern,
  icon: Icon,
  ...wrapperProps
}) => {
  return (
    <FieldWrapper {...wrapperProps}>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          maxLength={maxLength}
          pattern={pattern}
          className={`
            block w-full rounded-lg border-gray-300 shadow-sm 
            focus:border-blue-500 focus:ring-blue-500 
            disabled:bg-gray-50 disabled:text-gray-500 
            ${Icon ? 'pl-10' : 'pl-3'} pr-3 py-2
            ${wrapperProps.error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
          `}
        />
      </div>
    </FieldWrapper>
  );
};

// Textarea field component
export const TextareaField: React.FC<TextareaFieldProps> = ({
  placeholder,
  value,
  onChange,
  disabled,
  rows = 3,
  maxLength,
  ...wrapperProps
}) => {
  return (
    <FieldWrapper {...wrapperProps}>
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        className={`
          block w-full rounded-lg border-gray-300 shadow-sm 
          focus:border-blue-500 focus:ring-blue-500 
          disabled:bg-gray-50 disabled:text-gray-500 
          px-3 py-2
          ${wrapperProps.error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
        `}
      />
    </FieldWrapper>
  );
};

// Select field component
export const SelectField: React.FC<SelectFieldProps> = ({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  ...wrapperProps
}) => {
  return (
    <FieldWrapper {...wrapperProps}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`
          block w-full rounded-lg border-gray-300 shadow-sm 
          focus:border-blue-500 focus:ring-blue-500 
          disabled:bg-gray-50 disabled:text-gray-500 
          px-3 py-2
          ${wrapperProps.error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
        `}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
};

// Checkbox field component
export const CheckboxField: React.FC<CheckboxFieldProps> = ({
  checked,
  onChange,
  disabled,
  ...wrapperProps
}) => {
  return (
    <FieldWrapper {...wrapperProps}>
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className={`
            h-4 w-4 rounded border-gray-300 text-blue-600 
            focus:ring-blue-500 disabled:opacity-50
            ${wrapperProps.error ? 'border-red-300' : ''}
          `}
        />
        {wrapperProps.label && (
          <label className={`ml-2 block text-sm text-gray-700 ${wrapperProps.labelClassName}`}>
            {wrapperProps.label}
            {wrapperProps.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
      </div>
    </FieldWrapper>
  );
};

// Form validation utilities
export const createValidator = (rules: Record<string, (value: any) => string | null>) => {
  return (data: Record<string, any>) => {
    const errors: Record<string, string> = {};
    
    Object.entries(rules).forEach(([field, rule]) => {
      const error = rule(data[field]);
      if (error) {
        errors[field] = error;
      }
    });
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };
};

// Common validation rules
export const validationRules = {
  required: (value: any) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return 'This field is required';
    }
    return null;
  },
  
  email: (value: string) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },
  
  minLength: (min: number) => (value: string) => {
    if (!value) return null;
    if (value.length < min) {
      return `Must be at least ${min} characters long`;
    }
    return null;
  },
  
  maxLength: (max: number) => (value: string) => {
    if (!value) return null;
    if (value.length > max) {
      return `Must be no more than ${max} characters long`;
    }
    return null;
  },
  
  pattern: (pattern: RegExp, message: string) => (value: string) => {
    if (!value) return null;
    if (!pattern.test(value)) {
      return message;
    }
    return null;
  },
  
  phone: (value: string) => {
    if (!value) return null;
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(value.replace(/\D/g, ''))) {
      return 'Please enter a valid phone number';
    }
    return null;
  },
};