import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string; // ✅ Allow dynamic styling
}

export const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div className={`border border-gray-200 shadow-sm rounded-lg p-4 bg-white transition ${className}`}>
      {children}
    </div>
  );
};

export const CardContent: React.FC<CardProps> = ({ children }) => {
  return <div className="p-2">{children}</div>;
};
