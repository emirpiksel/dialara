/**
 * Reusable Info Card Component
 * Displays information in a consistent card format
 */
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InfoItem {
  icon?: LucideIcon;
  label: string;
  value: React.ReactNode;
  color?: string;
  className?: string;
}

interface InfoCardProps {
  title?: string;
  items: InfoItem[];
  className?: string;
  itemClassName?: string;
  vertical?: boolean;
}

export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  items,
  className = '',
  itemClassName = '',
  vertical = false,
}) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {title && (
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
      )}
      
      <div className={`p-4 ${vertical ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}`}>
        {items.map((item, index) => (
          <InfoItem
            key={index}
            {...item}
            className={`${itemClassName} ${item.className || ''}`}
          />
        ))}
      </div>
    </div>
  );
};

const InfoItem: React.FC<InfoItem> = ({ icon: Icon, label, value, color, className = '' }) => {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {Icon && (
        <div className="flex-shrink-0">
          <Icon className={`w-5 h-5 ${color || 'text-gray-500'}`} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <div className="text-sm text-gray-600">{value}</div>
      </div>
    </div>
  );
};