import React from "react";

interface ProgressBarProps {
  value: number;   // between 0 and 100
  label?: string;  // optional label (e.g. "XP Progress")
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, label }) => {
  const safeValue = Math.min(Math.max(value, 0), 100); // clamp between 0-100

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1 text-sm font-medium text-gray-700">
          {label}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className="bg-blue-600 h-4 transition-all duration-500"
          style={{ width: `${safeValue}%` }}
        />
      </div>
      <div className="text-right text-xs text-gray-500 mt-1">
        {safeValue}%
      </div>
    </div>
  );
};
