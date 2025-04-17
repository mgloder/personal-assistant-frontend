'use client';

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MicrophoneIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';
import VirtualAssistant from './VirtualAssistant';
import Navbar from './Navbar';
import Login from './Login';

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [assistantEmotion, setAssistantEmotion] = useState<'happy' | 'thinking' | 'listening' | 'neutral'>('neutral');
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      // Call the authentication API
      const response = await axios.post('/api/auth/login', { email, password });
      
      if (response.data && response.data.token) {
        // Store the token in localStorage
        localStorage.setItem('access_token', response.data.token);
        
        // Set authentication state
        setIsAuthenticated(true);
        
        // Test the connection with the new token
        await testConnection();
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAccessToken();
      if (token) {
        setIsAuthenticated(true);
        // Test the connection with the token
        await testConnection();
      } else {
        setIsAuthenticated(false);
        setIsConnected(false);
      }
    };
    
    checkAuth();
  }, []);

  const getAccessToken = () => {
    console.log('Getting access token...');
    
    // First check cookies
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith('access_token=')) {
        const token = cookie.substring('access_token='.length);
        console.log('Token found in cookies');
        return token;
      }
    }
    
    // Then check localStorage
    const storedToken = localStorage.getItem('access_token');
    if (storedToken) {
      console.log('Token found in localStorage');
      return storedToken;
    }
    
    console.log('No token found in cookies or localStorage');
    return null;
  };

  const testConnection = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        setIsConnected(false);
        return;
      }

      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8005';
      const response = await fetch(`${backendUrl}/api/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setIsConnected(true);
        setError(null);
      } else {
        setIsConnected(false);
        setError('Failed to connect to the server');
      }
    } catch (err) {
      console.error('Connection test error:', err);
      setIsConnected(false);
      setError('Failed to connect to the server');
    }
  };

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

          // Get the access token
          const token = getAccessToken();
          console.log('Sending message with token:', token);

          // Send the message to the API
          axios.post('/api/chat', {
            message: userMessage
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            timeout: 20000
          })
          .then(response => {
            if (!response.data || !response.data.message) {
              throw new Error('Invalid response format from server');
            }

            const assistantMessage: Message = {
              role: 'assistant',
              content: response.data.message,
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
  }, [selectedLanguage]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const token = getAccessToken();
    if (!token) {
      console.error('No authentication token found');
      setError('No authentication token found. Please log in.');
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

    try {
      console.log('Sending message with token:', token);
      const response = await axios.post('/api/chat', {
        message: userMessage
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        timeout: 20000
      });

      if (!response.data || !response.data.message) {
        throw new Error('Invalid response format from server');
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setAssistantEmotion('happy');
    } catch (error) {
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
    } finally {
      setIsTyping(false);
      setTimeout(() => setAssistantEmotion('neutral'), 2000);
    }
  };

  if (!isAuthenticated) {
    console.log('Not authenticated');
    return <Login onLogin={handleLogin} />;
  }
  console.log('default');

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
                      onContextMenu={(e) => e.preventDefault()}
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
                  onSubmit={handleSubmit}
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