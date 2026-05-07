import { GroundingSource, HistoryItem } from '../types';

const DB_NAME = 'nexus_db';
const DB_VERSION = 1;
const HISTORY_STORE = 'history';
const CACHE_STORE = 'research_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(HISTORY_STORE)) {
          const s = db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
          s.createIndex('byUser', 'userEmail');
        }
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function topicKey(topic: string): string {
  const s = topic.toLowerCase().trim().replace(/\s+/g, ' ');
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return `rc_${Math.abs(h).toString(36)}`;
}

export interface CachedResearch {
  text: string;
  sources: GroundingSource[];
}

export const researchCache = {
  async get(topic: string): Promise<CachedResearch | null> {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(CACHE_STORE, 'readonly');
        const req = tx.objectStore(CACHE_STORE).get(topicKey(topic));
        req.onsuccess = () => {
          const r = req.result;
          if (r && Date.now() - r.ts < CACHE_TTL_MS) {
            resolve({ text: r.text, sources: r.sources });
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  async set(topic: string, data: CachedResearch): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(CACHE_STORE, 'readwrite');
        tx.objectStore(CACHE_STORE).put({ key: topicKey(topic), ...data, ts: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // silently fail — cache is best-effort
    }
  },
};

export const idbHistory = {
  async save(userEmail: string, item: HistoryItem): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(HISTORY_STORE, 'readwrite');
        tx.objectStore(HISTORY_STORE).put({ ...item, userEmail });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      // silently fail
    }
  },

  async getAll(userEmail: string): Promise<HistoryItem[]> {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(HISTORY_STORE, 'readonly');
        const req = tx.objectStore(HISTORY_STORE).index('byUser').getAll(userEmail);
        req.onsuccess = () => {
          const items: HistoryItem[] = (req.result || [])
            .sort((a: HistoryItem, b: HistoryItem) => b.timestamp - a.timestamp);
          resolve(items);
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  },
};
