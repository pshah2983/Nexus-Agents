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
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    case AgentRole.ANALYST:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
    case AgentRole.WRITER:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
  const isStreaming = isWorking && agent.output !== null;

  return (
    <div className={`relative flex flex-col rounded-xl border transition-all duration-500 ${
      isWorking
        ? 'border-cyan-500/70 bg-slate-900 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
        : isCompleted
          ? 'border-green-500/40 bg-slate-900/70'
          : isFailed
            ? 'border-red-500/40 bg-slate-900/50'
            : 'border-slate-800 bg-slate-900/20 opacity-60'
    }`}>

      {/* Top accent line */}
      <div className="absolute top-0 left-0 w-full h-0.5 rounded-t-xl overflow-hidden">
        {isWorking && <div className="w-full h-full bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse" />}
        {isCompleted && <div className="w-full h-full bg-gradient-to-r from-green-400 to-emerald-500" />}
        {isFailed && <div className="w-full h-full bg-red-500" />}
        {isWaiting && <div className="w-full h-full bg-slate-800" />}
      </div>

      <div className="p-5 flex flex-col h-full">
        {/* Header row */}
        <div className="flex items-center space-x-3 mb-3">
          <div className={`p-2 rounded-lg transition-colors ${
            isWorking ? 'bg-cyan-900/50 text-cyan-300' :
            isCompleted ? 'bg-green-900/30 text-green-400' :
            isFailed ? 'bg-red-900/30 text-red-400' :
            'bg-slate-800 text-slate-500'
          }`}>
            {getRoleIcon(agent.role)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold text-sm tracking-wide uppercase truncate ${
              isWorking ? 'text-cyan-300' : isCompleted ? 'text-slate-100' : 'text-slate-400'
            }`}>
              {agent.name}
            </h3>
            <p className="text-xs text-slate-600">{agent.role}</p>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Cache badge */}
            {isCompleted && agent.fromCache && (
              <span className="inline-flex items-center space-x-1 bg-emerald-900/40 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>CACHED</span>
              </span>
            )}
            {isWorking && (
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
            )}
            {isCompleted && !agent.fromCache && (
              <span className="text-green-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">{agent.description}</p>

        {/* Output Area */}
        <div className="flex-1 bg-slate-950/80 rounded-lg border border-slate-800/80 p-3 flex flex-col min-h-[180px]">
          <div className="text-[10px] font-semibold text-slate-600 mb-2 uppercase tracking-widest flex items-center justify-between">
            <span>Output</span>
            {isStreaming && (
              <span className="text-cyan-600 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                <span>Streaming</span>
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar text-xs text-slate-300 font-mono leading-relaxed">
            {agent.output ? (
              <div>
                <ReactMarkdown
                  components={{
                    h1: ({node, ...props}) => <h1 className="font-bold text-cyan-200 mb-2 mt-3 text-xs border-b border-slate-800 pb-1" {...props} />,
                    h2: ({node, ...props}) => <h2 className="font-bold text-cyan-200/90 mb-1 mt-2 text-xs" {...props} />,
                    h3: ({node, ...props}) => <h3 className="font-semibold text-cyan-200/80 mb-1 mt-1 text-xs" {...props} />,
                    p: ({node, ...props}) => <p className="mb-2" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2 space-y-0.5" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2 space-y-0.5" {...props} />,
                    li: ({node, ...props}) => <li className="ml-1" {...props} />,
                    a: ({node, ...props}) => <a className="text-cyan-500 underline" target="_blank" rel="noopener noreferrer" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-slate-200" {...props} />,
                    blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-slate-700 pl-2 italic text-slate-500 my-1" {...props} />,
                  }}
                >
                  {agent.output.text}
                </ReactMarkdown>
                {/* Streaming cursor */}
                {isStreaming && (
                  <span className="inline-block w-1.5 h-3.5 bg-cyan-400 animate-pulse ml-0.5 align-middle rounded-sm" />
                )}
              </div>
            ) : (
              <span className="italic text-slate-700 text-xs">
                {isWorking ? 'Initializing...' : isWaiting ? 'Waiting for previous agent...' : 'No output yet.'}
              </span>
            )}
          </div>

          {/* Sources — Researcher only */}
          {agent.role === AgentRole.RESEARCHER && agent.output?.sources && agent.output.sources.length > 0 && (
            <div className="mt-3 pt-2 border-t border-slate-800">
              <div className="text-[10px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Sources</div>
              <div className="flex flex-wrap gap-1.5">
                {agent.output.sources.slice(0, 4).map((source, idx) => (
                  <a
                    key={idx}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-cyan-600 hover:text-cyan-400 hover:underline truncate max-w-[130px] bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5"
                  >
                    {source.title}
                  </a>
                ))}
                {agent.output.sources.length > 4 && (
                  <span className="text-[10px] text-slate-600 px-1.5 py-0.5">+{agent.output.sources.length - 4} more</span>
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
