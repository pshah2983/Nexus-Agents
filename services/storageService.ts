
import { User, HistoryItem } from '../types';

const USERS_KEY = 'nexus_users';
const CURRENT_USER_KEY = 'nexus_current_user';
const HISTORY_KEY = 'nexus_history';

// Mock Auth Service
export const authService = {
  login: async (email: string): Promise<User> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
    const user = users[email];
    
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      return user;
    }
    throw new Error("User not found");
  },

  register: async (email: string, name: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
    
    if (users[email]) {
      throw new Error("User already exists");
    }

    // Create unverified user
    users[email] = { email, name, isVerified: false };
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  verifyEmail: async (email: string, code: string): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    if (code !== '1234') throw new Error("Invalid verification code");

    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
    if (!users[email]) throw new Error("User not found");

    users[email].isVerified = true;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(users[email]));
    return users[email];
  },

  logout: () => {
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  }
};

// History Service
export const historyService = {
  saveItem: (item: HistoryItem) => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return;

    const allHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    const userHistory = allHistory[currentUser.email] || [];
    
    userHistory.unshift(item); // Add to top
    allHistory[currentUser.email] = userHistory;
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(allHistory));
  },

  getHistory: (): HistoryItem[] => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return [];

    const allHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}');
    return allHistory[currentUser.email] || [];
  }
};
