
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
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize chat session when component mounts
    chatSessionRef.current = createFollowUpChat(topic, blogContent, researchNotes);
  }, [topic, blogContent, researchNotes]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !chatSessionRef.current) return;

    const userMsg: ChatMessage = {
      role: 'user',
      text: inputValue,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await chatSessionRef.current.sendMessage({ message: userMsg.text });
      const modelMsg: ChatMessage = {
        role: 'model',
        text: response.text || "I couldn't generate a response.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      console.error("Chat error", error);
      const errorMsg: ChatMessage = {
        role: 'model',
        text: "Sorry, I encountered an error answering that.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-8 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col h-[500px] shadow-xl">
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <h3 className="font-bold text-cyan-100 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Ask Follow-up Questions
        </h3>
        <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded">Gemini 2.5 Flash</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-900/50">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 mt-10 text-sm">
            <p>Ask me anything about the research results.</p>
            <p className="text-xs mt-2 opacity-70">e.g., "Can you expand on the second point?" or "Who was the key figure mentioned?"</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
              msg.role === 'user' 
                ? 'bg-cyan-700 text-white rounded-br-none' 
                : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
            }`}>
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
           <div className="flex justify-start">
             <div className="bg-slate-800 rounded-lg p-3 rounded-bl-none border border-slate-700">
               <div className="flex space-x-1">
                 <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                 <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                 <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
               </div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-slate-950 border-t border-slate-800 flex gap-2">
        <input 
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your question here..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
          disabled={isLoading}
        />
        <button 
          type="submit" 
          disabled={isLoading || !inputValue.trim()}
          className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;
