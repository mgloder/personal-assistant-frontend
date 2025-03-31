import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import dragonAnimation from '../assets/dragon.json';

// Dynamically import Lottie with no SSR
const Lottie = dynamic(() => import('lottie-react'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-blue-100 rounded-full animate-pulse" />
  )
});

interface VirtualAssistantProps {
  isTyping?: boolean;
  isListening?: boolean;
  size?: 'small' | 'medium' | 'large';
  emotion?: 'happy' | 'thinking' | 'listening' | 'neutral';
}

const VirtualAssistant: React.FC<VirtualAssistantProps> = ({
  isTyping = false,
  isListening = false,
  size = 'medium',
  emotion = 'neutral'
}) => {
  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-16 h-16',
    large: 'w-24 h-24'
  };

  const containerVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: { duration: 0.3 }
    }
  };

  return (
    <motion.div 
      className={`relative ${sizeClasses[size]}`}
      initial="initial"
      animate="animate"
      variants={containerVariants}
    >
      <div className="relative w-full h-full">
        {/* Dragon Animation */}
        <Lottie
          animationData={dragonAnimation}
          loop={true}
          autoplay={true}
          className="w-full h-full"
          style={{
            filter: emotion === 'happy' ? 'brightness(1.2)' : 
                    emotion === 'thinking' ? 'brightness(0.9)' : 
                    'brightness(1)'
          }}
        />

        {/* Status indicators */}
        <AnimatePresence>
          {isTyping && (
            <motion.div 
              className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
            >
              <motion.div 
                className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: 0 }}
              />
              <motion.div 
                className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: 0.15 }}
              />
              <motion.div 
                className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: 0.3 }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isListening && (
            <motion.div 
              className="absolute -inset-2 border-2 border-blue-400 rounded-full"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default VirtualAssistant; 