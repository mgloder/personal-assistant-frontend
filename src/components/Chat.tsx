'use client';

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MicrophoneIcon, StopIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';
import VirtualAssistant from './VirtualAssistant';
import Navbar from './Navbar';
import { SUPPORTED_LANGUAGES } from './Navbar';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [assistantEmotion, setAssistantEmotion] = useState<'happy' | 'thinking' | 'listening' | 'neutral'>('neutral');
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Test API connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('Testing connection to:', '/api');
        console.log('Current window location:', window.location.href);
        
        // Try to connect to the API endpoint for health check
        console.log('Making request to:', '/api');
        const response = await axios.get('/api', {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log('Connection test response:', response.data);
        if (response.data && response.data.message) {
          setIsConnected(true);
          setError(null);
          // Store the session ID from the initial connection
          if (response.data.session_id) {
            setSessionId(response.data.session_id);
          }
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('Connection test failed:', error);
        setIsConnected(false);
        if (axios.isAxiosError(error)) {
          console.error('Axios error details:', {
            code: error.code,
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            headers: error.response?.headers,
          });
          if (error.code === 'ECONNREFUSED') {
            setError('Cannot connect to server. Please make sure the backend server is running on port 8005.');
          } else if (error.code === 'ECONNABORTED') {
            setError('Connection timed out. Please check your network connection.');
          } else if (error.response) {
            setError(`Server error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
          } else if (error.request) {
            setError('No response received from server. Please check if the server is running and accessible.');
          } else {
            setError(`Connection error: ${error.message}`);
          }
        } else {
          setError('Unable to connect to the server. Please check if the server is running.');
        }
      }
    };

    testConnection();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLanguage;

      let finalTranscript = '';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        setInput(finalTranscript || interimTranscript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        if (finalTranscript.trim()) {
          const userMessage: Message = {
            role: 'user',
            content: finalTranscript.trim(),
            timestamp: new Date()
          };

          setMessages(prev => [...prev, userMessage]);
          setInput('');
          setIsTyping(true);
          setAssistantEmotion('thinking');
          setError(null);

          // Send the message to the API with session ID
          axios.post('/api/chat', {
            message: userMessage,
            session_id: sessionId
          }, {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 20000
          })
          .then(response => {
            if (!response.data || !response.data.response) {
              throw new Error('Invalid response format from server');
            }

            // Update session ID if provided in response
            if (response.data.session_id) {
              setSessionId(response.data.session_id);
            }

            const assistantMessage: Message = {
              role: 'assistant',
              content: response.data.response,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
            setAssistantEmotion('happy');
          })
          .catch(error => {
            console.error('Error details:', error);
            let errorMessage = 'Failed to get response from assistant';
            
            if (axios.isAxiosError(error)) {
              if (error.response) {
                errorMessage = `Server error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`;
              } else if (error.request) {
                errorMessage = 'No response received from server. Please check if the server is running and accessible.';
              } else if (error.code === 'ECONNABORTED') {
                errorMessage = 'Request timed out. Please check your connection and try again.';
              } else if (error.code === 'ECONNREFUSED') {
                errorMessage = 'Cannot connect to server. Please make sure the backend server is running on port 8005.';
              } else {
                errorMessage = `Request error: ${error.message}`;
              }
            }
            
            setError(errorMessage);
            const errorMessageObj: Message = {
              role: 'assistant',
              content: errorMessage,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessageObj]);
            setAssistantEmotion('neutral');
          })
          .finally(() => {
            setIsTyping(false);
            setTimeout(() => setAssistantEmotion('neutral'), 2000);
            finalTranscript = ''; // Clear the final transcript after sending
          });
        }
      };
    }
  }, [selectedLanguage, sessionId]);

  const startRecording = () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      setInput(''); // Clear any previous input
      recognition.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Navbar */}
      <Navbar 
        isTyping={isTyping} 
        isListening={false} 
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
      />

      {/* Main chat container */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Connection status */}
        <AnimatePresence>
          {!isConnected && (
            <motion.div 
              className="bg-red-100 text-red-800 px-4 py-2 text-sm text-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {error || 'Not connected to server. Please check your connection.'}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Chat messages area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                Start a conversation with Little Dragon!
              </div>
            )}
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start space-x-2 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0">
                        <VirtualAssistant 
                          isTyping={isTyping && index === messages.length - 1}
                          isListening={false}
                          emotion={assistantEmotion}
                        />
                      </div>
                    )}
                    <div className={`rounded-2xl px-4 py-2 ${
                      message.role === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : message.content.includes('error') || message.content.includes('Error')
                        ? 'bg-red-100 text-red-800'
                        : 'bg-white text-gray-800 shadow-sm'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex justify-center"
                >
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <motion.div
                        className="w-2 h-2 bg-gray-400 rounded-full"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-gray-400 rounded-full"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay: 0.15 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-gray-400 rounded-full"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay: 0.3 }}
                      />
                    </div>
                    <span className="text-sm">Little Dragon is typing...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 bg-white">
          <div className="p-4">
            <AnimatePresence mode="wait">
              {isRecording ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center justify-center space-y-4 w-full max-w-4xl mx-auto"
                >
                  <motion.div
                    className="relative w-full"
                    animate={{
                      scale: [1, 1.01, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <motion.div
                      className="absolute inset-0 rounded-lg bg-blue-500/5"
                      animate={{
                        scale: [1, 1.05],
                        opacity: [0.2, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeOut"
                      }}
                    />
                    <motion.button
                      type="button"
                      onMouseDown={startRecording}
                      onMouseUp={stopRecording}
                      onTouchStart={startRecording}
                      onTouchEnd={stopRecording}
                      className="relative w-full h-16 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white flex flex-row items-center justify-center space-x-4 shadow-md hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-200 active:from-blue-400 active:to-blue-500"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <motion.div
                        animate={{
                          scale: [1, 1.05, 1],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <MicrophoneIcon className="h-6 w-6" />
                      </motion.div>
                      <span className="text-base font-medium">Hold to Speak</span>
                    </motion.button>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-gray-500"
                  >
                    Release to send message
                  </motion.div>
                </motion.div>
              ) : (
                <motion.form
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!input.trim()) return;

                    if (!isConnected) {
                      setError('Not connected to server. Please check your connection and try again.');
                      return;
                    }

                    const userMessage: Message = {
                      role: 'user',
                      content: input.trim(),
                      timestamp: new Date()
                    };

                    setMessages(prev => [...prev, userMessage]);
                    setInput('');
                    setIsTyping(true);
                    setAssistantEmotion('thinking');
                    setError(null);

                    axios.post('/api/chat', {
                      message: userMessage,
                      session_id: sessionId
                    }, {
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      timeout: 20000
                    })
                    .then(response => {
                      if (!response.data || !response.data.response) {
                        throw new Error('Invalid response format from server');
                      }

                      // Update session ID if provided in response
                      if (response.data.session_id) {
                        setSessionId(response.data.session_id);
                      }

                      const assistantMessage: Message = {
                        role: 'assistant',
                        content: response.data.response,
                        timestamp: new Date()
                      };
                      setMessages(prev => [...prev, assistantMessage]);
                      setAssistantEmotion('happy');
                    })
                    .catch(error => {
                      console.error('Error details:', error);
                      let errorMessage = 'Failed to get response from assistant';
                      
                      if (axios.isAxiosError(error)) {
                        if (error.response) {
                          errorMessage = `Server error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`;
                        } else if (error.request) {
                          errorMessage = 'No response received from server. Please check if the server is running and accessible.';
                        } else if (error.code === 'ECONNABORTED') {
                          errorMessage = 'Request timed out. Please check your connection and try again.';
                        } else if (error.code === 'ECONNREFUSED') {
                          errorMessage = 'Cannot connect to server. Please make sure the backend server is running on port 8005.';
                        } else {
                          errorMessage = `Request error: ${error.message}`;
                        }
                      }
                      
                      setError(errorMessage);
                      const errorMessageObj: Message = {
                        role: 'assistant',
                        content: errorMessage,
                        timestamp: new Date()
                      };
                      setMessages(prev => [...prev, errorMessageObj]);
                      setAssistantEmotion('neutral');
                    })
                    .finally(() => {
                      setIsTyping(false);
                      setTimeout(() => setAssistantEmotion('neutral'), 2000);
                    });
                  }}
                  className="flex space-x-4"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 rounded-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!isConnected || isTyping}
                  />
                  <div className="flex space-x-2">
                    <motion.button
                      type="button"
                      onClick={() => setIsRecording(true)}
                      disabled={!isConnected || isTyping}
                      className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <MicrophoneIcon className="h-5 w-5" />
                    </motion.button>
                    <motion.button
                      type="submit"
                      disabled={!input.trim() || isTyping}
                      className={`px-6 py-2 rounded-full text-white font-medium ${
                        !input.trim() || isTyping
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-500 hover:bg-blue-600'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <PaperAirplaneIcon className="h-5 w-5" />
                    </motion.button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 left-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg"
          >
            <p className="text-sm">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chat; 