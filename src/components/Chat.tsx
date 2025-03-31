import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MicrophoneIcon, StopIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';

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
    } catch (error) {
      console.error('Error details:', error);
      let errorMessage = 'Failed to get response from assistant';
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          errorMessage = `Server error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`;
        } else if (error.request) {
          // The request was made but no response was received
          errorMessage = 'No response received from server. Please check if the server is running and accessible.';
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = 'Request timed out. Please check your connection and try again.';
        } else if (error.code === 'ECONNREFUSED') {
          errorMessage = 'Cannot connect to server. Please make sure the backend server is running on port 8005.';
        } else {
          // Something happened in setting up the request that triggered an Error
          errorMessage = `Request error: ${error.message}`;
        }
      }
      
      setError(errorMessage);
      const errorMessageObj: Message = {
        role: 'assistant',
        content: errorMessage,
      };
      setMessages(prev => [...prev, errorMessageObj]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      {/* Safe area padding for mobile devices */}
      <div className="flex-none h-[env(safe-area-inset-top)] bg-white" />
      
      {/* Main chat container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Connection status */}
        {!isConnected && (
          <div className="bg-red-100 text-red-800 px-4 py-2 text-sm text-center">
            {error || 'Not connected to server. Please check your connection.'}
          </div>
        )}
        
        {/* Chat messages area */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 bg-gray-50">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 ${
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              } animate-fade-in`}
            >
              {message.role === 'assistant' && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-base font-bold">
                  LD
                </div>
              )}
              <div
                className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 text-base ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : message.content.includes('error') || message.content.includes('Error')
                    ? 'bg-red-100 text-red-800 rounded-bl-none shadow-sm'
                    : 'bg-white text-gray-800 rounded-bl-none shadow-sm'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex items-start gap-3 animate-fade-in">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-base font-bold">
                LD
              </div>
              <div className="bg-white rounded-2xl rounded-bl-none p-4 shadow-sm">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area with safe area padding for mobile */}
        <div className="flex-none bg-white border-t">
          <div className="h-[env(safe-area-inset-bottom)] bg-white" />
          <form onSubmit={handleSubmit} className="p-3 md:p-4">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 p-3 text-base border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!isConnected}
              />
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-3 rounded-full transition-all duration-200 ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-gray-100 hover:bg-gray-200'
                } ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!isConnected}
              >
                {isRecording ? (
                  <StopIcon className="h-6 w-6 text-white" />
                ) : (
                  <MicrophoneIcon className="h-6 w-6 text-gray-600" />
                )}
              </button>
              <button
                type="submit"
                className={`p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors duration-200 ${
                  !isConnected ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={!isConnected}
              >
                <PaperAirplaneIcon className="h-6 w-6" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat; 