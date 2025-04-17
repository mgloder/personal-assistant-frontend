'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlobeAltIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/solid';
import VirtualAssistant from './VirtualAssistant';
import { useAuth } from '@/hooks/useAuth';

// Supported languages for speech recognition
export const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'es-ES', name: 'Spanish' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
];

interface NavbarProps {
  isTyping?: boolean;
  isListening?: boolean;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ 
  isTyping, 
  isListening, 
  selectedLanguage,
  onLanguageChange 
}) => {
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const { logout } = useAuth();

  return (
    <motion.div 
      className="w-full bg-white border-b border-gray-200"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left side - Logo and Title */}
        <div className="flex items-center space-x-3">
          <VirtualAssistant size="small" isTyping={isTyping} isListening={isListening} />
          <div>
            <h1 className="text-base font-semibold text-gray-800">Little Dragon</h1>
            <p className="text-xs text-gray-500">AI Assistant</p>
          </div>
        </div>

        {/* Right side - Language Selector and Logout */}
        <div className="flex items-center space-x-4">
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 focus:outline-none"
            >
              <GlobeAltIcon className="h-5 w-5" />
              <span className="text-sm">
                {SUPPORTED_LANGUAGES.find(lang => lang.code === selectedLanguage)?.name || 'Language'}
              </span>
            </button>

            {/* Language Dropdown */}
            <AnimatePresence>
              {showLanguageMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200"
                >
                  <div className="py-1">
                    {SUPPORTED_LANGUAGES.map((language) => (
                      <button
                        key={language.code}
                        onClick={() => {
                          onLanguageChange(language.code);
                          setShowLanguageMenu(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          selectedLanguage === language.code
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {language.name}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 focus:outline-none"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default Navbar; 