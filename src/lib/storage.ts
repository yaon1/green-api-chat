import type { Credentials } from '../api/greenApi';
import type { ChatsState } from './chats';

const CREDS_KEY = 'green-api-chat:credentials';
const chatsKey = (idInstance: string) => `green-api-chat:chats:${idInstance}`;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable (private mode); the app still works in memory.
  }
}

export const loadCredentials = () => read<Credentials>(CREDS_KEY);
export const saveCredentials = (creds: Credentials) => write(CREDS_KEY, creds);
export const clearCredentials = () => {
  try {
    localStorage.removeItem(CREDS_KEY);
  } catch {
    /* ignore */
  }
};

export const loadChats = (idInstance: string) => read<ChatsState>(chatsKey(idInstance)) ?? {};
export const saveChats = (idInstance: string, chats: ChatsState) => write(chatsKey(idInstance), chats);
