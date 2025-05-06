'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MicrophoneIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import VirtualAssistant from './VirtualAssistant';
import Navbar from './Navbar';
import Login from './Login';
import { post, get, getAuthToken, API, LoginResponse, ChatResponse, HealthResponse, stream } from '@/utils/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatProps {}

const Chat: React.FC<ChatProps> = (): React.ReactElement => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [assistantEmotion, setAssistantEmotion] = useState<'happy' | 'thinking' | 'listening' | 'neutral'>('neutral');
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Combined authentication and connection check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = getAuthToken();
        if (token) {
          setIsAuthenticated(true);
          setIsConnected(true);
        } else {
          setIsAuthenticated(false);
          setIsConnected(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      // Call the authentication API
      const response = await post<LoginResponse>(API.auth.login, { email, password });
      
      if (response && response.token) {
        // Store the token in localStorage
        localStorage.setItem('access_token', response.token);
        
        // Set authentication state
        setIsAuthenticated(true);
        setIsConnected(true);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
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
        // Clear the input field on error
        setInput('');
        finalTranscript = '';
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

          // Create a placeholder message for the assistant's response
          const assistantMessage: Message = {
            role: 'assistant',
            content: '',
            timestamp: new Date()
          };
          
          // Add the assistant message to the messages array
          setMessages(prev => [...prev, assistantMessage]);
          
          let accumulatedContent = '';

          // Use the streaming API instead of post
          stream(API.chat, {
            message: {
              content: userMessage.content,
              role: userMessage.role,
              timestamp: userMessage.timestamp
            }
          })
          .then(responseStream => {
            // Create a reader for the stream
            const reader = responseStream.getReader();

            // Process the stream
            const processStream = async () => {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  
                  if (done) {
                    break;
                  }
                  
                  // Convert the chunk to text
                  const chunk = new TextDecoder().decode(value);
                  console.log('Received chunk (voice):', chunk); // Debug log
                  
                  // Process Server-Sent Events (SSE)
                  const lines = chunk.split('\n');
                  for (const line of lines) {
                    if (line.startsWith('data: ')) {
                      try {
                        // Parse the SSE data
                        const data = parseSSEData(line);
                        console.log('Parsed data (voice):', data); // Debug log
                        
                        // Add the data to the accumulated content
                        accumulatedContent += data;
                        
                        // Update the assistant's message with the accumulated content
                        setMessages(prev => {
                          const newMessages = [...prev];
                          // Use the last message as the assistant's message
                          const lastIndex = newMessages.length - 1;
                          if (lastIndex >= 0) {
                            newMessages[lastIndex] = {
                              ...newMessages[lastIndex],
                              content: accumulatedContent
                            };
                          }
                          return newMessages;
                        });
                      } catch (parseError) {
                        console.error('Error parsing SSE data:', parseError);
                        // Continue processing other lines even if one fails
                      }
                    }
                  }
                }

                setAssistantEmotion('happy');
              } catch (error: any) {
                console.error('Error details:', error);
                setError(error.message || 'Failed to get response from assistant');
                
                // Update the assistant's message with the error
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  if (lastIndex >= 0) {
                    newMessages[lastIndex] = {
                      ...newMessages[lastIndex],
                      content: error.message || 'Failed to get response from assistant'
                    };
                  }
                  return newMessages;
                });
                
                setAssistantEmotion('neutral');
              } finally {
                setIsTyping(false);
                setTimeout(() => setAssistantEmotion('neutral'), 2000);
                // Clear the final transcript after processing
                finalTranscript = '';
              }
            };

            processStream();
          })
          .catch(error => {
            console.error('Error details:', error);
            setError(error.message || 'Failed to get response from assistant');
            setAssistantEmotion('neutral');
            setIsTyping(false);
            setTimeout(() => setAssistantEmotion('neutral'), 2000);
            // Clear the final transcript on error
            finalTranscript = '';
          });
        } else {
          // Clear the input field if no final transcript
          setInput('');
          finalTranscript = '';
        }
      };
    }
  }, [selectedLanguage]);

  const startRecording = () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      // Clear the input field before starting a new recording
      setInput('');
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

  // Add this function to properly parse SSE data
  const parseSSEData = (line: string): string => {
    // Remove the 'data: ' prefix
    if (line.startsWith('data: ')) {
      const data = line.substring(6);
      // Check if the data is JSON
      try {
        // If it's JSON, parse it and return the message property
        const jsonData = JSON.parse(data);
        return jsonData.message || jsonData.content || data;
      } catch (e) {
        // If it's not JSON, return the raw data
        return data;
      }
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const token = getAuthToken();
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

    // Create a placeholder message for the assistant's response
    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date()
    };
    
    // Add the assistant message to the messages array and get the current length
    let assistantMessageIndex: number;
    setMessages(prev => {
      assistantMessageIndex = prev.length; // This is the index of the new message
      return [...prev, assistantMessage];
    });
    
    let accumulatedContent = '';

    try {
      // Use the streaming API
      const responseStream = await stream(API.chat, {
        message: {
          content: userMessage.content,
          role: userMessage.role,
          timestamp: userMessage.timestamp
        }
      });

      // Create a reader for the stream
      const reader = responseStream.getReader();

      // Process the stream
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        // Convert the chunk to text
        const chunk = new TextDecoder().decode(value);
        console.log('Received chunk:', chunk); // Debug log
        
        // Process Server-Sent Events (SSE)
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              // Parse the SSE data
              const data = parseSSEData(line);
              console.log('Parsed data:', data); // Debug log
              
              // Add the data to the accumulated content
              accumulatedContent += data;
              
              // Update the assistant's message with the accumulated content
              setMessages(prev => {
                const newMessages = [...prev];
                // Use the last message as the assistant's message
                const lastIndex = newMessages.length - 1;
                if (lastIndex >= 0) {
                  newMessages[lastIndex] = {
                    ...newMessages[lastIndex],
                    content: accumulatedContent
                  };
                }
                return newMessages;
              });
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
              // Continue processing other lines even if one fails
            }
          }
        }
      }

      setAssistantEmotion('happy');
    } catch (error: any) {
      console.error('Error details:', error);
      setError(error.message || 'Failed to get response from assistant');
      
      // Update the assistant's message with the error
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        if (lastIndex >= 0) {
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content: error.message || 'Failed to get response from assistant'
          };
        }
        return newMessages;
      });
      
      setAssistantEmotion('neutral');
    } finally {
      setIsTyping(false);
      setTimeout(() => setAssistantEmotion('neutral'), 2000);
    }
  };

  // Add this component for rendering code blocks
  const CodeBlock = ({ language, value }: { language: string; value: string }) => {
    return (
      <div className="my-2 rounded-md overflow-hidden">
        <SyntaxHighlighter
          language={language || 'text'}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

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
                      {message.role === 'user' ? (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      ) : (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code: ({ node, inline, className, children, ...props }: any) => {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline && match ? (
                                  <CodeBlock
                                    language={match[1]}
                                    value={String(children).replace(/\n$/, '')}
                                  />
                                ) : (
                                  <code className="bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5 text-sm" {...props}>
                                    {children}
                                  </code>
                                );
                              },
                              p: ({ children }) => <p className="text-sm whitespace-pre-wrap">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc pl-4 my-1">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal pl-4 my-1">{children}</ol>,
                              li: ({ children }) => <li className="my-0.5">{children}</li>,
                              h1: ({ children }) => <h1 className="text-xl font-bold my-2">{children}</h1>,
                              h2: ({ children }) => <h2 className="text-lg font-bold my-1.5">{children}</h2>,
                              h3: ({ children }) => <h3 className="text-base font-bold my-1">{children}</h3>,
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2">
                                  {children}
                                </blockquote>
                              ),
                              a: ({ href, children }) => (
                                <a 
                                  href={href} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:underline"
                                >
                                  {children}
                                </a>
                              ),
                              table: ({ children }) => (
                                <div className="overflow-x-auto my-2">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    {children}
                                  </table>
                                </div>
                              ),
                              th: ({ children }) => (
                                <th className="px-3 py-2 bg-gray-100 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {children}
                                </th>
                              ),
                              td: ({ children }) => (
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {children}
                                </td>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}
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