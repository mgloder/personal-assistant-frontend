import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MicrophoneIcon, StopIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';
import VirtualAssistant from './VirtualAssistant';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [assistantEmotion, setAssistantEmotion] = useState<'happy' | 'thinking' | 'listening' | 'neutral'>('neutral');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Test API connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        console.log('Testing connection to:', apiUrl);
        console.log('Current window location:', window.location.href);
        
        // Try to connect to the root endpoint for health check
        console.log('Making request to:', `${apiUrl}/`);
        const response = await axios.get(`${apiUrl}/`, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true
        });
        
        console.log('Connection test response:', response.data);
        if (response.data && response.data.message) {
          setIsConnected(true);
          setError(null);
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

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };
    }
  }, []);

  const startRecording = () => {
    const recognition = recognitionRef.current;
    if (recognition) {
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

    if (!isConnected) {
      setError('Not connected to server. Please check your connection and try again.');
      return;
    }

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setAssistantEmotion('thinking');
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      console.log('Sending request to:', `${apiUrl}/chat`);
      console.log('Request payload:', { message: userMessage });

      const response = await axios.post(`${apiUrl}/chat`, {
        message: userMessage
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000
      });

      console.log('Received response:', response.data);

      if (!response.data || !response.data.response) {
        throw new Error('Invalid response format from server');
      }

      // Simulate typing delay for more natural feel
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.response,
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
      };
      setMessages(prev => [...prev, errorMessageObj]);
      setAssistantEmotion('neutral');
    } finally {
      setIsTyping(false);
      // Reset emotion after a delay
      setTimeout(() => setAssistantEmotion('neutral'), 2000);
    }
  };

  return (
    <motion.div 
      className="fixed inset-0 flex flex-col bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Safe area padding for mobile devices */}
      <div className="flex-none h-[env(safe-area-inset-top)] bg-white" />
      
      {/* Main chat container */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 bg-gray-50">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                className={`flex items-start gap-3 ${
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <VirtualAssistant 
                      isTyping={isTyping && index === messages.length - 1}
                      isListening={isRecording}
                      emotion={assistantEmotion}
                    />
                  </div>
                )}
                <motion.div
                  className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 text-base ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : message.content.includes('error') || message.content.includes('Error')
                      ? 'bg-red-100 text-red-800 rounded-bl-none shadow-sm'
                      : 'bg-white text-gray-800 rounded-bl-none shadow-sm'
                  }`}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {message.content}
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {isTyping && (
              <motion.div 
                className="flex items-start gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex-shrink-0">
                  <VirtualAssistant isTyping={true} emotion="thinking" />
                </div>
                <motion.div 
                  className="bg-white rounded-2xl rounded-bl-none p-4 shadow-sm"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex space-x-2">
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
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input area with safe area padding for mobile */}
        <motion.div 
          className="flex-none bg-white border-t"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="h-[env(safe-area-inset-bottom)] bg-white" />
          <form onSubmit={handleSubmit} className="p-3 md:p-4">
            <div className="flex gap-2 items-center">
              <motion.input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 p-3 text-base border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!isConnected}
                whileFocus={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              />
              <motion.button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-3 rounded-full ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-gray-100 hover:bg-gray-200'
                } ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!isConnected}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={isRecording ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.2 }}
              >
                {isRecording ? (
                  <StopIcon className="h-6 w-6 text-white" />
                ) : (
                  <MicrophoneIcon className="h-6 w-6 text-gray-600" />
                )}
              </motion.button>
              <motion.button
                type="submit"
                className={`p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 ${
                  !isConnected ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={!isConnected}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <PaperAirplaneIcon className="h-6 w-6" />
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Chat; 