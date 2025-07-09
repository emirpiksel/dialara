/**
 * Reusable Status Badge Component
 * Displays status information with consistent styling
 */
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  icon?: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'neutral',
  icon: Icon,
  size = 'md',
  className = '',
}) => {
  const variantClasses = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    neutral: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {Icon && (
        <Icon className={`mr-1 ${iconSizeClasses[size]}`} />
      )}
      {status}
    </span>
  );
};