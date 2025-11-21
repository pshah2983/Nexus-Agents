
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

  useEffect(() => {
    setHistory(historyService.getHistory());
    setUser(authService.getCurrentUser());
  }, [refreshTrigger]);

  return (
    <div className="w-full md:w-64 bg-slate-950 border-r border-slate-800 h-screen flex flex-col md:fixed left-0 top-0 z-50">
      <div className="p-4 border-b border-slate-800 flex items-center space-x-2">
         <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
           <span className="text-white font-bold text-lg">N</span>
         </div>
         <h1 className="text-xl font-bold text-slate-100 tracking-tight">Nexus</h1>
      </div>

      <div className="p-4">
        <button 
          onClick={onNewChat}
          className="w-full flex items-center justify-center space-x-2 bg-cyan-600 hover:bg-cyan-500 text-white py-2 px-4 rounded-lg transition-all shadow-lg shadow-cyan-900/20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Research</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
        <h3 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-2">History</h3>
        <div className="space-y-1">
          {history.length === 0 ? (
            <div className="px-4 py-4 text-sm text-slate-600 text-center italic">
              No research history yet.
            </div>
          ) : (
            history.map(item => (
              <button 
                key={item.id}
                onClick={() => onSelectHistory(item)}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-900 transition-colors group"
              >
                <div className="text-sm font-medium text-slate-300 truncate group-hover:text-cyan-300">
                  {item.topic}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  {new Date(item.timestamp).toLocaleDateString()}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center mb-3">
          <div className="w-8 h-8 rounded-full bg-purple-900/50 text-purple-300 flex items-center justify-center text-sm font-bold border border-purple-500/30">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="ml-3 overflow-hidden">
            <div className="text-sm font-medium text-slate-200 truncate">{user?.name}</div>
            <div className="text-xs text-slate-500 truncate">{user?.email}</div>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-red-900/30 hover:text-red-400 text-slate-400 py-2 px-4 rounded-lg transition-all text-xs"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
