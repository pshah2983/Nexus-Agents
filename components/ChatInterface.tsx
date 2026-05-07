import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { createFollowUpChat } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { Chat } from "@google/genai";

interface ChatInterfaceProps {
  topic: string;
  blogContent: string;
  researchNotes: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ topic, blogContent, researchNotes }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatSessionRef.current = createFollowUpChat(topic, blogContent, researchNotes);
    setMessages([]);
    setStreamingText('');
  }, [topic, blogContent, researchNotes]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !chatSessionRef.current) return;

    const userMsg: ChatMessage = {
      role: 'user',
      text: inputValue,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);
    setStreamingText('');

    try {
      // Attempt streaming response
      let fullResponse = '';

      if (typeof chatSessionRef.current.sendMessageStream === 'function') {
        const stream = await chatSessionRef.current.sendMessageStream({ message: userMsg.text });
        for await (const chunk of stream) {
          const t = chunk.text || '';
          fullResponse += t;
          setStreamingText(fullResponse);
        }
      } else {
        // Fallback to non-streaming
        const response = await chatSessionRef.current.sendMessage({ message: userMsg.text });
        fullResponse = response.text || "I couldn't generate a response.";
        setStreamingText(fullResponse);
      }

      const modelMsg: ChatMessage = {
        role: 'model',
        text: fullResponse || "I couldn't generate a response.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, modelMsg]);
      setStreamingText('');
    } catch (error) {
      console.error("Chat error", error);
      const errorMsg: ChatMessage = {
        role: 'model',
        text: "Sorry, I encountered an error. Please try again.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
      setStreamingText('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div className="mt-8 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col shadow-2xl">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-cyan-900/30 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="font-bold text-sm text-slate-200">Ask Follow-up Questions</h3>
        </div>
        <span className="text-[10px] text-slate-600 bg-slate-900 border border-slate-800 px-2 py-1 rounded-full font-mono">
          gemini-2.5-flash
        </span>
      </div>

      {/* Messages */}
      <div className="h-[420px] overflow-y-auto p-5 space-y-4 custom-scrollbar">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-sm text-slate-500 font-medium">Ask anything about this research</p>
            <p className="text-xs text-slate-600 mt-1 max-w-xs">
              e.g. "Can you expand on the second point?" or "What are the key takeaways?"
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
              <div className="w-6 h-6 rounded-full bg-cyan-900/40 border border-cyan-500/30 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                <span className="text-cyan-400 text-[10px] font-bold">N</span>
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-sm shadow-lg'
                : 'bg-slate-800/80 text-slate-200 rounded-bl-sm border border-slate-700/50'
            }`}>
              {msg.role === 'model' ? (
                <ReactMarkdown
                  components={{
                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-2 space-y-1" {...props} />,
                    code: ({node, ...props}) => <code className="bg-slate-900 px-1 rounded text-xs text-cyan-300 font-mono" {...props} />,
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}

        {/* Streaming in-progress message */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-cyan-900/40 border border-cyan-500/30 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
              <span className="text-cyan-400 text-[10px] font-bold">N</span>
            </div>
            <div className="max-w-[80%] bg-slate-800/80 rounded-2xl rounded-bl-sm border border-slate-700/50 px-4 py-3 text-sm text-slate-200 leading-relaxed">
              {streamingText ? (
                <div>
                  <ReactMarkdown
                    components={{
                      p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                    }}
                  >
                    {streamingText}
                  </ReactMarkdown>
                  <span className="inline-block w-1.5 h-3.5 bg-cyan-400 animate-pulse ml-0.5 align-middle rounded-sm" />
                </div>
              ) : (
                <div className="flex items-center space-x-1 py-0.5">
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-800 flex gap-2 bg-slate-900/50">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a follow-up question..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl px-4 py-2.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/10 active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;
