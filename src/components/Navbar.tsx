'use client';

import React from 'react';
import { motion } from 'framer-motion';
import VirtualAssistant from './VirtualAssistant';

interface NavbarProps {
  isTyping?: boolean;
  isListening?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ isTyping, isListening }) => {
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

        {/* Right side - Status */}
        <div className="flex items-center space-x-2">
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