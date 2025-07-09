/**
 * Reusable Modal Component
 * Provides consistent modal behavior and styling
 */
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  className?: string;
  overlayClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closable = true,
  className = '',
  overlayClassName = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  footer,
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closable) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, closable, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full h-full',
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closable) {
      onClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ${overlayClassName}`}
      onClick={handleOverlayClick}
    >
      <div
        className={`bg-white rounded-lg shadow-xl w-full mx-4 max-h-[90vh] overflow-hidden ${sizeClasses[size]} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || closable) && (
          <div className={`px-6 py-4 border-b border-gray-200 flex items-center justify-between ${headerClassName}`}>
            {title && <h2 className="text-xl font-semibold text-gray-800">{title}</h2>}
            {closable && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className={`px-6 py-4 overflow-y-auto ${bodyClassName}`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={`px-6 py-4 border-t border-gray-200 ${footerClassName}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};