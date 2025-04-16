'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlobeAltIcon } from '@heroicons/react/24/solid';
import VirtualAssistant from './VirtualAssistant';

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

        {/* Right side - Status and Language Selector */}
        <div className="flex items-center space-x-4">
          {/* Language Selector */}
          <div className="relative">
            <motion.button
              type="button"
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <GlobeAltIcon className="h-5 w-5" />
            </motion.button>
            <AnimatePresence>
              {showLanguageMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
                  style={{
                    maxHeight: 'calc(100vh - 200px)',
                    overflowY: 'auto'
                  }}
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        onLanguageChange(lang.code);
                        setShowLanguageMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-100 ${
                        selectedLanguage === lang.code ? 'bg-blue-50 text-blue-600' : ''
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center space-x-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-gray-600">Online</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Navbar; 