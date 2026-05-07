import React, { useState, useCallback, useEffect, useRef } from 'react';
import AgentCard from './components/AgentCard';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import ShareButtons from './components/ShareButtons';
import ChatInterface from './components/ChatInterface';
import { AgentState, AgentRole, AgentStatus, AgentOutput, HistoryItem, User } from './types';
import { runResearcherAgent, runAnalystAgent, runWriterAgent } from './services/geminiService';
import { authService, historyService } from './services/storageService';
import ReactMarkdown from 'react-markdown';

const INITIAL_AGENTS: AgentState[] = [
  {
    id: '1',
    role: AgentRole.RESEARCHER,
    name: 'Nexus Search',
    description: 'Scours the web for real-time data and historical facts using Google Search grounding.',
    status: AgentStatus.WAITING,
    output: null,
  },
  {
    id: '2',
    role: AgentRole.ANALYST,
    name: 'Logic Core',
    description: 'Synthesizes raw search data into structured insights and a strategic writer\'s brief.',
    status: AgentStatus.WAITING,
    output: null,
  },
  {
    id: '3',
    role: AgentRole.WRITER,
    name: 'Creative Engine',
    description: 'Transforms analytical briefs into engaging, publication-ready blog posts.',
    status: AgentStatus.WAITING,
    output: null,
  }
];

const SUGGESTED_TOPICS = [
  'The future of artificial intelligence',
  'Climate change: 2025 developments',
  'Quantum computing explained',
  'The rise of autonomous vehicles',
];

const PIPELINE_STEPS = ['Research', 'Analysis', 'Writing'];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [topic, setTopic] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [agents, setAgents] = useState<AgentState[]>(INITIAL_AGENTS);
  const [finalBlog, setFinalBlog] = useState<string | null>(null);
  const [isBlogCopied, setIsBlogCopied] = useState(false);
  const [researchDataForChat, setResearchDataForChat] = useState('');
  const [refreshHistory, setRefreshHistory] = useState(0);
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [cacheUsed, setCacheUsed] = useState(false);
  const [debugLogs, setDebugLogs] = useState<{ ts: string; level: 'info' | 'success' | 'error' | 'warn'; msg: string }[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debugEndRef = useRef<HTMLDivElement>(null);

  const addLog = (level: 'info' | 'success' | 'error' | 'warn', msg: string) => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setDebugLogs(prev => [...prev, { ts, level, msg }]);
    console.log(`[${level.toUpperCase()}] ${msg}`);
  };

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setCheckingAuth(false);
  }, []);

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  const updateAgentStatus = (
    id: string,
    status: AgentStatus,
    output?: AgentOutput,
    error?: string,
    fromCache?: boolean
  ) => {
    setAgents(prev => prev.map(agent => {
      if (agent.id === id) {
        return { ...agent, status, output: output ?? agent.output, error, fromCache };
      }
      return agent;
    }));
  };

  const startResearch = useCallback(async () => {
    if (!topic.trim()) return;

    setAgents(INITIAL_AGENTS);
    setFinalBlog(null);
    setResearchDataForChat('');
    setIsProcessing(true);
    setIsBlogCopied(false);
    setActiveStep(0);
    setCacheUsed(false);
    setDebugLogs([]);
    setShowDebug(true);

    // API key check
    const apiKey = (window as any).__VITE_API_KEY__ ?? (import.meta as any).env?.VITE_API_KEY ?? process.env.API_KEY;
    addLog('info', `Pipeline started — topic: "${topic}"`);
    addLog(apiKey ? 'success' : 'error',
      apiKey
        ? `API key detected (${String(apiKey).slice(0, 8)}...${String(apiKey).slice(-4)})`
        : 'API key is MISSING or undefined — check your .env file and restart the server'
    );

    try {
      // --- Step 1: Researcher ---
      addLog('info', '[Agent 1] Nexus Search — starting research...');
      updateAgentStatus('1', AgentStatus.WORKING);
      let agent1Text = '';
      const researchResult = await runResearcherAgent(topic, (chunk) => {
        agent1Text += chunk;
        setAgents(prev => prev.map(a =>
          a.id === '1' ? { ...a, output: { text: agent1Text, sources: [] } } : a
        ));
      });
      addLog('success', `[Agent 1] Done — ${researchResult.text.length} chars, ${researchResult.sources.length} sources${researchResult.fromCache ? ' (from cache)' : ''}`);
      updateAgentStatus('1', AgentStatus.COMPLETED, {
        text: researchResult.text,
        sources: researchResult.sources,
      }, undefined, researchResult.fromCache);
      if (researchResult.fromCache) setCacheUsed(true);

      // --- Step 2: Analyst ---
      setActiveStep(1);
      addLog('info', '[Agent 2] Logic Core — analyzing research...');
      updateAgentStatus('2', AgentStatus.WORKING);
      let agent2Text = '';
      const analysisResult = await runAnalystAgent(researchResult.text, (chunk) => {
        agent2Text += chunk;
        setAgents(prev => prev.map(a =>
          a.id === '2' ? { ...a, output: { text: agent2Text, sources: [] } } : a
        ));
      });
      addLog('success', `[Agent 2] Done — ${analysisResult.length} chars`);
      updateAgentStatus('2', AgentStatus.COMPLETED, { text: analysisResult });

      // --- Step 3: Writer ---
      setActiveStep(2);
      addLog('info', '[Agent 3] Creative Engine — writing blog post...');
      updateAgentStatus('3', AgentStatus.WORKING);
      let agent3Text = '';
      const blogResult = await runWriterAgent(analysisResult, topic, (chunk) => {
        agent3Text += chunk;
        setAgents(prev => prev.map(a =>
          a.id === '3' ? { ...a, output: { text: agent3Text, sources: [] } } : a
        ));
      });
      addLog('success', `[Agent 3] Done — ${blogResult.length} chars`);
      updateAgentStatus('3', AgentStatus.COMPLETED, { text: blogResult });

      setFinalBlog(blogResult);
      setResearchDataForChat(researchResult.text);
      setActiveStep(3);
      addLog('success', '✅ Pipeline complete!');

      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        topic,
        blogContent: blogResult,
        agentOutputs: {
          research: { text: researchResult.text, sources: researchResult.sources },
          analysis: analysisResult,
        },
      };
      await historyService.saveItem(historyItem);
      setRefreshHistory(prev => prev + 1);

    } catch (error: any) {
      const msg = error?.message || String(error);
      const status = error?.status ?? error?.code ?? '';
      addLog('error', `❌ PIPELINE FAILED`);
      addLog('error', `Error message: ${msg}`);
      if (status) addLog('error', `HTTP Status / Code: ${status}`);
      if (error?.stack) addLog('warn', `Stack: ${String(error.stack).split('\n').slice(0,3).join(' | ')}`);
      console.error("Workflow failed", error);
      setAgents(prev => prev.map(agent =>
        agent.status === AgentStatus.WORKING
          ? { ...agent, status: AgentStatus.FAILED, error: msg }
          : agent
      ));
      setActiveStep(-1);
    } finally {
      setIsProcessing(false);
    }
  }, [topic]);

  const loadHistoryItem = (item: HistoryItem) => {
    setTopic(item.topic);
    setFinalBlog(item.blogContent);
    setResearchDataForChat(item.agentOutputs.research.text);
    setIsBlogCopied(false);
    setCacheUsed(false);
    setActiveStep(3);
    const restoredAgents = [...INITIAL_AGENTS];
    restoredAgents[0] = { ...restoredAgents[0], status: AgentStatus.COMPLETED, output: item.agentOutputs.research };
    restoredAgents[1] = { ...restoredAgents[1], status: AgentStatus.COMPLETED, output: { text: item.agentOutputs.analysis } };
    restoredAgents[2] = { ...restoredAgents[2], status: AgentStatus.COMPLETED, output: { text: item.blogContent } };
    setAgents(restoredAgents);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewChat = () => {
    setTopic('');
    setFinalBlog(null);
    setAgents(INITIAL_AGENTS);
    setResearchDataForChat('');
    setIsBlogCopied(false);
    setActiveStep(-1);
    setCacheUsed(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleCopyBlog = () => {
    if (finalBlog) {
      navigator.clipboard.writeText(finalBlog);
      setIsBlogCopied(true);
      setTimeout(() => setIsBlogCopied(false), 2000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isProcessing) startResearch();
  };

  const completedSteps = agents.filter(a => a.status === AgentStatus.COMPLETED).length;

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center space-x-3 text-slate-400">
          <svg className="animate-spin h-5 w-5 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm">Initializing system...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onLoginSuccess={() => setUser(authService.getCurrentUser())} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      <Sidebar
        onSelectHistory={loadHistoryItem}
        onNewChat={handleNewChat}
        onLogout={handleLogout}
        refreshTrigger={refreshHistory}
      />

      <div className="flex-1 md:ml-64 p-4 md:p-8 flex flex-col items-center w-full">

        {/* Header */}
        <div className="w-full max-w-6xl mb-8 text-center mt-10 md:mt-0">
          <div className="inline-flex items-center space-x-2 bg-slate-900/60 border border-slate-800 rounded-full px-4 py-1.5 mb-4">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">Multi-Agent System Online</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent mb-3 tracking-tight">
            Nexus Agents
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Three specialized AI agents research, analyze, and write — so you don't have to.
          </p>
        </div>

        {/* Search Input */}
        <div className="w-full max-w-2xl relative mb-4 group z-10">
          <div className={`absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl blur opacity-30 transition duration-500 ${isProcessing ? 'opacity-75 animate-pulse' : 'group-hover:opacity-60'}`}></div>
          <div className="relative flex bg-slate-900 rounded-xl items-center p-2 border border-slate-800/80 shadow-xl">
            <div className="pl-3 pr-1 text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter a research topic..."
              className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 px-3 py-3 focus:outline-none text-lg"
              disabled={isProcessing}
            />
            <button
              onClick={startResearch}
              disabled={isProcessing || !topic.trim()}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2 text-sm
                ${isProcessing || !topic.trim()
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 active:scale-95'
                }`}
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Running</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Deploy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Suggested Topics — shown only when idle and no blog */}
        {!isProcessing && !finalBlog && (
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {SUGGESTED_TOPICS.map((t) => (
              <button
                key={t}
                onClick={() => { setTopic(t); inputRef.current?.focus(); }}
                className="text-xs text-slate-400 border border-slate-800 hover:border-cyan-500/50 hover:text-cyan-400 bg-slate-900/50 hover:bg-slate-900 px-3 py-1.5 rounded-full transition-all duration-200"
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Pipeline Progress Bar */}
        {(isProcessing || activeStep >= 0) && (
          <div className="w-full max-w-2xl mb-8">
            {/* Cache notification */}
            {cacheUsed && (
              <div className="flex items-center justify-center space-x-2 mb-3">
                <span className="inline-flex items-center space-x-1.5 bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 text-xs font-medium px-3 py-1 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Research loaded from cache — 1 API call saved</span>
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              {PIPELINE_STEPS.map((step, idx) => {
                const isDone = completedSteps > idx;
                const isActive = activeStep === idx && isProcessing;
                return (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                        isDone
                          ? 'bg-green-500/20 border-green-500 text-green-400'
                          : isActive
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400 animate-pulse'
                            : 'bg-slate-900 border-slate-700 text-slate-600'
                      }`}>
                        {isDone ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-xs font-bold">{idx + 1}</span>
                        )}
                      </div>
                      <span className={`text-xs mt-1.5 font-medium transition-colors ${isDone ? 'text-green-400' : isActive ? 'text-cyan-400' : 'text-slate-600'}`}>
                        {step}
                      </span>
                    </div>
                    {idx < PIPELINE_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all duration-700 ${
                        completedSteps > idx + 1 || (completedSteps === idx + 1 && idx + 1 < 3)
                          ? 'bg-green-500/50'
                          : completedSteps === idx + 1 && isProcessing
                            ? 'bg-gradient-to-r from-green-500/50 to-cyan-500/20'
                            : 'bg-slate-800'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Debug Console */}
        {debugLogs.length > 0 && (
          <div className="w-full max-w-6xl mb-8">
            <button
              onClick={() => setShowDebug(v => !v)}
              className="flex items-center space-x-2 text-xs font-mono font-semibold px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all mb-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 transition-transform ${showDebug ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span>Debug Console</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                debugLogs.some(l => l.level === 'error') ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-500'
              }`}>{debugLogs.length} entries</span>
              {debugLogs.some(l => l.level === 'error') && (
                <span className="text-red-400 text-[10px] font-bold animate-pulse">● ERROR</span>
              )}
            </button>
            {showDebug && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
                  <div className="flex space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/70"></span>
                    <span className="w-3 h-3 rounded-full bg-yellow-500/70"></span>
                    <span className="w-3 h-3 rounded-full bg-green-500/70"></span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">nexus — debug console</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(debugLogs.map(l => `[${l.ts}] [${l.level.toUpperCase()}] ${l.msg}`).join('\n')); }}
                    className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded border border-slate-800 hover:border-slate-600"
                  >Copy All</button>
                </div>
                <div className="p-4 max-h-72 overflow-y-auto custom-scrollbar font-mono text-xs space-y-1">
                  {debugLogs.map((log, i) => (
                    <div key={i} className="flex items-start space-x-3">
                      <span className="text-slate-600 shrink-0 select-none">{log.ts}</span>
                      <span className={`shrink-0 font-bold w-14 text-right ${
                        log.level === 'error' ? 'text-red-400' :
                        log.level === 'success' ? 'text-green-400' :
                        log.level === 'warn' ? 'text-yellow-400' :
                        'text-cyan-400'
                      }`}>[{log.level.toUpperCase()}]</span>
                      <span className={`break-all ${
                        log.level === 'error' ? 'text-red-300' :
                        log.level === 'success' ? 'text-green-300' :
                        log.level === 'warn' ? 'text-yellow-300' :
                        'text-slate-300'
                      }`}>{log.msg}</span>
                    </div>
                  ))}
                  <div ref={debugEndRef} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Agents Grid */}
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-5 mb-12 min-h-[420px]">
          {agents.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>

        {/* Final Output Section */}
        {finalBlog && (
          <div className="w-full max-w-4xl mb-20">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/40 to-pink-600/40 rounded-2xl blur-xl opacity-30"></div>
              <div className="relative bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">

                {/* Blog Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-slate-800 bg-slate-950/60">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-900/40 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Generated Blog Post</h2>
                      <p className="text-xs text-slate-500">{topic}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleCopyBlog}
                    className={`flex items-center space-x-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-200 border ${
                      isBlogCopied
                        ? 'bg-green-500/10 border-green-500/50 text-green-400'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    {isBlogCopied ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Blog Content */}
                <article className="px-8 md:px-12 py-10 min-h-[200px]">
                  <ReactMarkdown
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-6 mt-8 pb-3 border-b border-slate-800/80" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-cyan-100 mb-4 mt-10" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-slate-200 mb-3 mt-6" {...props} />,
                      p: ({node, ...props}) => <p className="text-slate-300 leading-7 mb-5 text-base" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc list-outside ml-6 mb-6 text-slate-300 space-y-2" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-6 mb-6 text-slate-300 space-y-2" {...props} />,
                      li: ({node, ...props}) => <li className="pl-1 leading-7" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                      em: ({node, ...props}) => <em className="italic text-slate-200" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-purple-500/60 bg-purple-950/20 p-4 italic text-slate-300 my-6 rounded-r-xl" {...props} />,
                      code: ({node, ...props}) => <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono text-cyan-300" {...props} />,
                      a: ({node, ...props}) => <a className="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-500/30 underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
                      hr: ({node, ...props}) => <hr className="border-slate-800 my-8" {...props} />,
                    }}
                  >
                    {finalBlog}
                  </ReactMarkdown>
                </article>

                <div className="px-8 md:px-12 pb-8">
                  <ShareButtons text={finalBlog} topic={topic} />
                  <ChatInterface
                    topic={topic}
                    blogContent={finalBlog}
                    researchNotes={researchDataForChat}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
