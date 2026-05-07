import React, { useEffect, useState } from 'react';
import { HistoryItem, User } from '../types';
import { historyService, authService } from '../services/storageService';

interface SidebarProps {
  onSelectHistory: (item: HistoryItem) => void;
  onNewChat: () => void;
  onLogout: () => void;
  refreshTrigger: number;
}

const Sidebar: React.FC<SidebarProps> = ({ onSelectHistory, onNewChat, onLogout, refreshTrigger }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setUser(authService.getCurrentUser());
    historyService.getHistory().then(setHistory);
  }, [refreshTrigger]);

  const sidebarContent = (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="text-white font-black text-sm">N</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-tight leading-none">Nexus</h1>
            <p className="text-[10px] text-slate-600 mt-0.5">Multi-Agent Research</p>
          </div>
        </div>
        {/* Mobile close button */}
        <button onClick={() => setIsOpen(false)} className="md:hidden text-slate-500 hover:text-slate-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* New Research */}
      <div className="p-4">
        <button
          onClick={() => { onNewChat(); setIsOpen(false); }}
          className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-2.5 px-4 rounded-xl transition-all text-sm font-semibold shadow-lg shadow-cyan-500/15 active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Research</span>
        </button>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3">
        <div className="flex items-center justify-between px-2 mb-2">
          <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">History</h3>
          {history.length > 0 && (
            <span className="text-[10px] text-slate-700 bg-slate-900 rounded-full px-1.5 py-0.5">{history.length}</span>
          )}
        </div>
        <div className="space-y-0.5">
          {history.length === 0 ? (
            <div className="px-2 py-6 text-center">
              <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs text-slate-600 italic">No research history yet</p>
            </div>
          ) : (
            history.map(item => (
              <button
                key={item.id}
                onClick={() => { onSelectHistory(item); setIsOpen(false); }}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-800/80 transition-colors group"
              >
                <div className="text-xs font-medium text-slate-400 truncate group-hover:text-cyan-300 transition-colors">
                  {item.topic}
                </div>
                <div className="text-[10px] text-slate-700 mt-0.5">
                  {new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="flex items-center mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white flex items-center justify-center text-sm font-bold shadow">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-200 truncate">{user?.name}</div>
            <div className="text-[10px] text-slate-600 truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-red-950/40 hover:border-red-500/30 hover:text-red-400 text-slate-500 border border-slate-800 py-2 px-3 rounded-lg transition-all text-xs font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 w-9 h-9 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 shadow-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <div className={`
        fixed left-0 top-0 h-screen w-64 bg-slate-950 border-r border-slate-800/80 z-50
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        {sidebarContent}
      </div>
    </>
  );
};

export default Sidebar;
