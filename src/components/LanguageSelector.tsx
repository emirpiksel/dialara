import React, { useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { useTranslation, Language, getAvailableLanguages, setLanguage } from '../lib/i18n';

interface LanguageSelectorProps {
  className?: string;
  onLanguageChange?: (language: Language) => void;
}

export function LanguageSelector({ className = '', onLanguageChange }: LanguageSelectorProps) {
  const { language } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const availableLanguages = getAvailableLanguages();

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    setIsOpen(false);
    
    // Trigger page reload to apply language changes throughout the app
    window.location.reload();
    
    if (onLanguageChange) {
      onLanguageChange(newLanguage);
    }
  };

  const currentLang = availableLanguages.find(lang => lang.code === language);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <Globe className="h-4 w-4" />
        <span>{currentLang?.nativeName || 'English'}</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 z-20 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg">
            <div className="py-1">
              {availableLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-medium">{lang.nativeName}</span>
                    <span className="text-gray-500">({lang.name})</span>
                  </div>
                  {language === lang.code && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}