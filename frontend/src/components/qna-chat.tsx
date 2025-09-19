"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Send, Copy, RefreshCw, MessageSquare, FileText, Bot, User, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MCPService, useMCPClient } from "@/lib/mcp-client";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
  isError?: boolean;
}

interface QnAChatProps {
  gsUri: string | null;
  pdfName?: string;
}

export default function QnAChat({ gsUri, pdfName }: QnAChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'error' | 'checking'>('checking');
  const [isMounted, setIsMounted] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mcpClient = useMCPClient();

  // Handle Next.js hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isMounted) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isMounted]);

  // Auto-resize textarea
  useEffect(() => {
    if (isMounted) {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
      }
    }
  }, [input, isMounted]);

  // Initialize MCP connection and check status
  useEffect(() => {
    if (!isMounted) return;

    const initializeConnection = async () => {
      setConnectionStatus('checking');
      
      try {
        const connected = await MCPService.connect();
        if (connected) {
          const isHealthy = await MCPService.checkHealth();
          setConnectionStatus(isHealthy ? 'connected' : 'error');
        } else {
          setConnectionStatus('error');
        }
      } catch (error) {
        console.error('Failed to initialize MCP connection:', error);
        setConnectionStatus('error');
      }
    };

    initializeConnection();

    // Set up periodic health checksmc
    const healthCheckInterval = setInterval(async () => {
      try {
        const isHealthy = await MCPService.checkHealth();
        setConnectionStatus(isHealthy ? 'connected' : 'error');
      } catch {
        setConnectionStatus('error');
      }
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(healthCheckInterval);
    };
  }, [isMounted]);

  // Generate unique message ID
  const generateMessageId = () => Math.random().toString(36).substring(2, 15);

  const copyToClipboard = useCallback(async (text: string) => {
    if (!isMounted) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, [isMounted]);

  const retryMessage = useCallback(async (messageText: string) => {
    if (!gsUri || !isMounted) return;
    
    setIsLoading(true);
    
    try {
      const result = await MCPService.askQuestion(messageText, gsUri);
      
      if (result.success) {
        const aiMessage: Message = { 
          id: generateMessageId(),
          sender: "ai", 
          text: result.answer || "No response received.", 
          timestamp: new Date(),
          isError: false
        };
        setMessages(prev => [...prev, aiMessage]);
        setConnectionStatus('connected');
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      const errorMessage: Message = {
        id: generateMessageId(),
        sender: "ai",
        text: `⚠️ Failed to fetch response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
      setConnectionStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [gsUri, isMounted]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !gsUri || !isMounted) return;

    const userMessage: Message = { 
      id: generateMessageId(),
      sender: "user", 
      text: input.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    const messageText = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      const result = await MCPService.askQuestion(messageText, gsUri);
      
      if (result.success) {
        const aiMessage: Message = { 
          id: generateMessageId(),
          sender: "ai", 
          text: result.answer || "No response received.", 
          timestamp: new Date(),
          isError: false
        };
        setMessages(prev => [...prev, aiMessage]);
        setConnectionStatus('connected');
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      const errorMessage: Message = {
        id: generateMessageId(),
        sender: "ai",
        text: `⚠️ Failed to fetch response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
      setConnectionStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Show loading state during Next.js hydration
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 border-b bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                 <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 top-0">
                  PDF Q&A Chat
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 text-xs">
                      AI Powered
                    </Badge>
                </h2> 
                {pdfName && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-48">
                    {pdfName}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
              connectionStatus === 'connected' 
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : connectionStatus === 'error'
                ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              {connectionStatus === 'connected' ? 'MCP Server Connected' : 
               connectionStatus === 'error' ? 'MCP Disconnected' : 'Connecting...'}
            </div>
            
            {messages.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearChat}
                className="text-gray-600 hover:text-gray-800"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <MessageSquare className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Ready to answer your questions
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Ask me anything about your PDF document. I'll analyze the content using MCP and provide detailed answers.
            </p>
            {!gsUri && (
              <p className="text-amber-600 dark:text-amber-400 text-sm mt-4">
                ⚠️ No PDF loaded. Please upload a document first.
              </p>
            )}
            {connectionStatus === 'error' && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-2">
                ⚠️ MCP connection error. Please ensure your MCP server is running.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  msg.sender === "user" 
                    ? "bg-blue-600" 
                    : msg.isError 
                    ? "bg-red-100 dark:bg-red-900"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}>
                  {msg.sender === "user" ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className={`h-4 w-4 ${msg.isError ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`} />
                  )}
                </div>

                {/* Message Content */}
                <div className={`flex-1 max-w-[75%] ${msg.sender === "user" ? "items-end" : ""}`}>
                  <div
                    className={`group relative px-4 py-3 rounded-2xl ${
                      msg.sender === "user"
                        ? "bg-blue-600 text-white rounded-br-md"
                        : msg.isError
                        ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-bl-md"
                        : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-bl-md shadow-sm"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                    
                    {/* Message Actions */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200/50 dark:border-gray-600/50">
                      <span className="text-xs opacity-70">
                        {formatTime(msg.timestamp)}
                      </span>
                      
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={() => copyToClipboard(msg.text)}
                          className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                          title="Copy message"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        
                        {msg.sender === "ai" && msg.isError && (
                          <button
                            onClick={() => retryMessage(messages[messages.indexOf(msg) - 1]?.text || "")}
                            className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                            title="Retry"
                            disabled={isLoading}
                          >
                            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm">Processing with MCP...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Sticky Input Area */}
      <div className="sticky bottom-0 z-10 border-t bg-white dark:bg-gray-800 shadow-lg">
        <div className="p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={gsUri ? "Ask a question about the PDF..." : "Please upload a PDF first..."}
                disabled={!gsUri || isLoading || connectionStatus !== 'connected'}
                rows={1}
                className="w-full resize-none rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
              
              {input.trim() && (
                <div className="absolute right-3 bottom-3 text-xs text-gray-400">
                  Press Enter to send
                </div>
              )}
            </div>
            
            <Button 
              type="button" 
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading || !gsUri || connectionStatus !== 'connected'}
              size="lg"
              className="h-12 w-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          
          {connectionStatus === 'error' && (
            <div className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <span>⚠️ MCP connection error. Please ensure your MCP server is running and accessible.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}