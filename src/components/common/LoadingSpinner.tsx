/**
 * Reusable Loading Spinner Component
 * Provides consistent loading states across the application
 */
import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
  text?: string;
  centered?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'text-blue-600',
  className = '',
  text,
  centered = false,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const spinner = (
    <div className={`${centered ? 'flex items-center justify-center' : 'inline-flex items-center'} ${className}`}>
      <Loader2 className={`animate-spin ${sizeClasses[size]} ${color}`} />
      {text && <span className="ml-2 text-sm text-gray-600">{text}</span>}
    </div>
  );

  if (centered) {
    return (
      <div className="flex items-center justify-center min-h-[100px]">
        {spinner}
      </div>
    );
  }

  return spinner;
};

// Skeleton loading component for content placeholders
interface SkeletonProps {
  className?: string;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', lines = 1 }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`bg-gray-200 rounded ${index > 0 ? 'mt-2' : ''}`}
          style={{ height: '1rem' }}
        />
      ))}
    </div>
  );
};

// Page loading component
export const PageLoading: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <LoadingSpinner size="lg" />
      <p className="text-gray-600 text-lg">{message}</p>
    </div>
  );
};