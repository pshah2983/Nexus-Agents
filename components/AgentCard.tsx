import React from 'react';
import ReactMarkdown from 'react-markdown';
import { AgentState, AgentStatus, AgentRole } from '../types';

interface AgentCardProps {
  agent: AgentState;
}

const getRoleIcon = (role: AgentRole) => {
  switch (role) {
    case AgentRole.RESEARCHER:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    case AgentRole.ANALYST:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case AgentRole.WRITER:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
    default:
      return null;
  }
};

const AgentCard: React.FC<AgentCardProps> = ({ agent }) => {
  const isWorking = agent.status === AgentStatus.WORKING;
  const isCompleted = agent.status === AgentStatus.COMPLETED;
  const isWaiting = agent.status === AgentStatus.WAITING;
  const isFailed = agent.status === AgentStatus.FAILED;

  return (
    <div className={`relative flex flex-col h-full rounded-xl border transition-all duration-300 ${
      isWorking 
        ? 'border-cyan-400 bg-slate-900/80 shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
        : isCompleted 
          ? 'border-green-500/50 bg-slate-900/50' 
          : isFailed 
            ? 'border-red-500/50 bg-slate-900/50'
            : 'border-slate-800 bg-slate-900/30 opacity-70'
    }`}>
      {/* Status Indicator Line */}
      <div className={`absolute top-0 left-0 w-full h-1 rounded-t-xl overflow-hidden`}>
        {isWorking && <div className="w-full h-full bg-cyan-400 animate-pulse-fast"></div>}
        {isCompleted && <div className="w-full h-full bg-green-500"></div>}
        {isFailed && <div className="w-full h-full bg-red-500"></div>}
        {isWaiting && <div className="w-full h-full bg-slate-700"></div>}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center space-x-3 mb-3">
          <div className={`p-2 rounded-lg ${
            isWorking ? 'bg-cyan-900/50 text-cyan-300' : 
            isCompleted ? 'bg-green-900/30 text-green-400' : 'bg-slate-800 text-slate-400'
          }`}>
            {getRoleIcon(agent.role)}
          </div>
          <div>
            <h3 className={`font-bold text-sm tracking-wide uppercase ${isWorking ? 'text-cyan-300' : 'text-slate-200'}`}>
              {agent.name}
            </h3>
            <p className="text-xs text-slate-500">{agent.role}</p>
          </div>
          <div className="ml-auto">
            {isWorking && (
               <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
            )}
            {isCompleted && <span className="text-green-500 text-xs font-bold">DONE</span>}
          </div>
        </div>

        <div className="text-sm text-slate-400 mb-4 min-h-[40px]">
          {agent.description}
        </div>
        
        {/* Output Area */}
        <div className="flex-1 mt-2 bg-slate-950 rounded-lg border border-slate-800 p-3 overflow-hidden flex flex-col">
          <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider flex justify-between items-center">
            <span>Agent Output</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {agent.output ? (
               <div className="text-xs text-slate-300 font-mono leading-relaxed">
                 <ReactMarkdown
                    components={{
                        h1: ({node, ...props}) => <div className="font-bold text-cyan-200 mb-2 mt-3 text-sm border-b border-slate-800 pb-1" {...props} />,
                        h2: ({node, ...props}) => <div className="font-bold text-cyan-200/90 mb-1 mt-2" {...props} />,
                        h3: ({node, ...props}) => <div className="font-bold text-cyan-200/80 mb-1 mt-1" {...props} />,
                        p: ({node, ...props}) => <p className="mb-2" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="ml-1 pl-1" {...props} />,
                        a: ({node, ...props}) => <span className="text-cyan-500 underline" {...props} />, 
                        strong: ({node, ...props}) => <span className="font-bold text-slate-200" {...props} />,
                        blockquote: ({node, ...props}) => <div className="border-l-2 border-slate-700 pl-2 italic text-slate-500 my-2" {...props} />,
                    }}
                 >
                   {agent.output.text}
                 </ReactMarkdown>
               </div>
            ) : (
              <span className="italic text-slate-600 text-xs">
                {isWorking ? "Generating content..." : isWaiting ? "Waiting for previous agent..." : "No output yet."}
              </span>
            )}
          </div>
          
          {/* Sources (only for Researcher) */}
          {agent.role === AgentRole.RESEARCHER && agent.output?.sources && agent.output.sources.length > 0 && (
             <div className="mt-3 pt-2 border-t border-slate-800">
                <div className="text-[10px] font-semibold text-slate-500 mb-1">SOURCES</div>
                <div className="flex flex-wrap gap-2">
                  {agent.output.sources.slice(0, 3).map((source, idx) => (
                    <a 
                      key={idx} 
                      href={source.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] text-cyan-500 hover:text-cyan-400 hover:underline truncate max-w-[150px]"
                    >
                      {source.title}
                    </a>
                  ))}
                  {agent.output.sources.length > 3 && (
                    <span className="text-[10px] text-slate-600">+{agent.output.sources.length - 3} more</span>
                  )}
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentCard;