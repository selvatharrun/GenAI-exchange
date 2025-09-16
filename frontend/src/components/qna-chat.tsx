"use client";

//if u are planning to use the flask app, change all routing url to 
//"http://localhost:5000/check the function in app.py"

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Send, Copy, RefreshCw, MessageSquare, FileText, Bot, User, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [input]);

  // Check backend connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch("http://localhost:8080/health", { method: "GET" });
        setConnectionStatus(res.ok ? 'connected' : 'error');
      } catch {
        setConnectionStatus('error');
      }
    };
    
    checkConnection();
  }, []);

  // Generate unique message ID
  const generateMessageId = () => Math.random().toString(36).substring(2, 15);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const retryMessage = useCallback(async (messageText: string) => {
    setIsLoading(true);
    
    try {
      const res = await fetch("http://localhost:8080/query-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: messageText,
          gsUri,
        }),
      });

      const data = await res.json();
      const aiMessage: Message = { 
        id: generateMessageId(),
        sender: "ai", 
        text: data.answer || "No response received.", 
        timestamp: new Date(),
        isError: !data.answer
      };

      setMessages(prev => [...prev, aiMessage]);
      setConnectionStatus('connected');
    } catch (error) {
      const errorMessage: Message = {
        id: generateMessageId(),
        sender: "ai",
        text: "⚠️ Failed to fetch response. Please check if the backend is running.",
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
      setConnectionStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [gsUri]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

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
      const res = await fetch("http://localhost:8080/query_pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: messageText,
          gsUri,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      const aiMessage: Message = { 
        id: generateMessageId(),
        sender: "ai", 
        text: data.answer || "No response received.", 
        timestamp: new Date(),
        isError: !data.answer
      };

      setMessages(prev => [...prev, aiMessage]);
      setConnectionStatus('connected');
    } catch (error) {
      const errorMessage: Message = {
        id: generateMessageId(),
        sender: "ai",
        text: "⚠️ Failed to fetch response. Please check if the backend is running.",
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
                      Powered by AI
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
              {connectionStatus === 'connected' ? 'Connected' : 
               connectionStatus === 'error' ? 'Disconnected' : 'Checking...'}
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

      {/* Chat Messages - fill available space */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <MessageSquare className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Ready to answer your questions
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Ask me anything about your PDF document. I'll analyze the content and provide detailed answers.
            </p>
            {!gsUri && (
              <p className="text-amber-600 dark:text-amber-400 text-sm mt-4">
                ⚠️ No PDF loaded. Please upload a document first.
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
                    <span className="text-sm">Thinking...</span>
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
                disabled={!gsUri || isLoading}
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
              disabled={!input.trim() || isLoading || !gsUri}
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
              <span>⚠️ Backend connection error. Please ensure your server is running on port 5000.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}