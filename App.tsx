
import React, { useState, useCallback, useEffect } from 'react';
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
    description: 'Synthesizes raw search data into structured insights and key narrative points.',
    status: AgentStatus.WAITING,
    output: null,
  },
  {
    id: '3',
    role: AgentRole.WRITER,
    name: 'Creative Engine',
    description: 'Transforms analytical briefs into engaging, high-quality blog posts.',
    status: AgentStatus.WAITING,
    output: null,
  }
];

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // App State
  const [topic, setTopic] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [agents, setAgents] = useState<AgentState[]>(INITIAL_AGENTS);
  const [finalBlog, setFinalBlog] = useState<string | null>(null);
  const [isBlogCopied, setIsBlogCopied] = useState(false);
  
  // Data Context for Chat
  const [researchDataForChat, setResearchDataForChat] = useState('');
  
  // Sidebar State
  const [refreshHistory, setRefreshHistory] = useState(0);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setCheckingAuth(false);
  }, []);

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  const updateAgentStatus = (id: string, status: AgentStatus, output?: AgentOutput, error?: string) => {
    setAgents(prev => prev.map(agent => {
      if (agent.id === id) {
        return { ...agent, status, output: output || agent.output, error };
      }
      return agent;
    }));
  };

  const startResearch = useCallback(async () => {
    if (!topic.trim()) return;

    // Reset state
    setAgents(INITIAL_AGENTS);
    setFinalBlog(null);
    setResearchDataForChat('');
    setIsProcessing(true);
    setIsBlogCopied(false);

    try {
      // --- Step 1: Researcher ---
      updateAgentStatus('1', AgentStatus.WORKING);
      const researchResult = await runResearcherAgent(topic);
      updateAgentStatus('1', AgentStatus.COMPLETED, { 
        text: researchResult.text, 
        sources: researchResult.sources 
      });

      // --- Step 2: Analyst ---
      updateAgentStatus('2', AgentStatus.WORKING);
      const analysisResult = await runAnalystAgent(researchResult.text);
      updateAgentStatus('2', AgentStatus.COMPLETED, { text: analysisResult });

      // --- Step 3: Writer ---
      updateAgentStatus('3', AgentStatus.WORKING);
      const blogResult = await runWriterAgent(analysisResult, topic);
      updateAgentStatus('3', AgentStatus.COMPLETED, { text: blogResult });
      
      setFinalBlog(blogResult);
      setResearchDataForChat(researchResult.text);

      // Save to History
      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        topic: topic,
        blogContent: blogResult,
        agentOutputs: {
          research: { text: researchResult.text, sources: researchResult.sources },
          analysis: analysisResult
        }
      };
      historyService.saveItem(historyItem);
      setRefreshHistory(prev => prev + 1);

    } catch (error) {
      console.error("Workflow failed", error);
      setAgents(prev => prev.map(agent => {
        if (agent.status === AgentStatus.WORKING) {
          return { ...agent, status: AgentStatus.FAILED, error: 'Operation failed. Please check API Key or Quota.' };
        }
        return agent;
      }));
    } finally {
      setIsProcessing(false);
    }
  }, [topic]);

  const loadHistoryItem = (item: HistoryItem) => {
    setTopic(item.topic);
    setFinalBlog(item.blogContent);
    setResearchDataForChat(item.agentOutputs.research.text);
    setIsBlogCopied(false);
    
    // Restore agent states
    const restoredAgents = [...INITIAL_AGENTS];
    restoredAgents[0] = { ...restoredAgents[0], status: AgentStatus.COMPLETED, output: item.agentOutputs.research };
    restoredAgents[1] = { ...restoredAgents[1], status: AgentStatus.COMPLETED, output: { text: item.agentOutputs.analysis } };
    restoredAgents[2] = { ...restoredAgents[2], status: AgentStatus.COMPLETED, output: { text: item.blogContent } };
    setAgents(restoredAgents);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNewChat = () => {
    setTopic('');
    setFinalBlog(null);
    setAgents(INITIAL_AGENTS);
    setResearchDataForChat('');
    setIsBlogCopied(false);
  };

  const handleCopyBlog = () => {
    if (finalBlog) {
      navigator.clipboard.writeText(finalBlog);
      setIsBlogCopied(true);
      setTimeout(() => setIsBlogCopied(false), 2000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isProcessing) {
      startResearch();
    }
  };

  if (checkingAuth) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading System...</div>;

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
        <div className="w-full max-w-6xl mb-10 text-center mt-10 md:mt-0">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent mb-4 tracking-tight">
            Nexus Agents
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            An autonomous multi-agent research team.
          </p>
        </div>

        {/* Search Input */}
        <div className="w-full max-w-2xl relative mb-12 group z-10">
          <div className={`absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg blur opacity-30 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 ${isProcessing ? 'animate-pulse' : ''}`}></div>
          <div className="relative flex bg-slate-900 rounded-lg items-center p-2 border border-slate-800">
            <input 
              type="text" 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter a research topic..." 
              className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 px-4 py-3 focus:outline-none text-lg"
              disabled={isProcessing}
            />
            <button 
              onClick={startResearch}
              disabled={isProcessing || !topic.trim()}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 flex items-center space-x-2
                ${isProcessing || !topic.trim()
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 active:scale-95'
                }`}
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing</span>
                </>
              ) : (
                <span>Deploy</span>
              )}
            </button>
          </div>
        </div>

        {/* Agents Grid */}
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12 min-h-[400px]">
          {agents.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>

        {/* Final Output Section */}
        {finalBlog && (
          <div className="w-full max-w-4xl animate-fade-in-up mb-20">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl blur opacity-20"></div>
              <div className="relative bg-slate-900 rounded-xl border border-slate-800 p-8 md:p-12 shadow-2xl">
                
                {/* Blog Header */}
                <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-900/30 rounded-lg text-purple-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white">Final Blog Post</h2>
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
                        <span>Copy Blog</span>
                      </>
                    )}
                  </button>
                </div>
                
                {/* Blog Content */}
                <article className="min-h-[200px]">
                   <ReactMarkdown
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-6 mt-8 pb-3 border-b border-slate-800" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-cyan-100 mb-4 mt-8" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-xl font-semibold text-cyan-200/80 mb-3 mt-6" {...props} />,
                        p: ({node, ...props}) => <p className="text-slate-300 leading-7 mb-4 text-base" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-outside ml-6 mb-6 text-slate-300 space-y-2" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-6 mb-6 text-slate-300 space-y-2" {...props} />,
                        li: ({node, ...props}) => <li className="pl-1" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-white" {...props} />,
                        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-purple-500/50 bg-slate-800/30 p-4 italic text-slate-300 my-6 rounded-r-lg" {...props} />,
                        code: ({node, ...props}) => <code className="bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono text-cyan-300" {...props} />,
                        a: ({node, ...props}) => <a className="text-cyan-400 hover:text-cyan-300 hover:underline decoration-cyan-500/30" target="_blank" rel="noopener noreferrer" {...props} />,
                      }}
                   >
                     {finalBlog}
                   </ReactMarkdown>
                </article>

                <ShareButtons text={finalBlog} topic={topic} />
                
                <ChatInterface 
                  topic={topic} 
                  blogContent={finalBlog} 
                  researchNotes={researchDataForChat} 
                />

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
