import { User, HistoryItem } from '../types';
import { idbHistory } from './cacheService';

const USERS_KEY = 'nexus_users';
const CURRENT_USER_KEY = 'nexus_current_user';

// Auth stays in localStorage — it's small and needs synchronous access at startup
export const authService = {
  login: async (email: string): Promise<User> => {
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
    if (users[email]) throw new Error("User already exists");
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
  },
};

// History backed by IndexedDB — up to 250MB vs 5MB localStorage limit
export const historyService = {
  saveItem: async (item: HistoryItem): Promise<void> => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return;
    await idbHistory.save(currentUser.email, item);
  },

  getHistory: async (): Promise<HistoryItem[]> => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return [];
    return idbHistory.getAll(currentUser.email);
  },
};
