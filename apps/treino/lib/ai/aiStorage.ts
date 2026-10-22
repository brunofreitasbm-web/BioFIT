export interface SavedMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const KEY_API_KEY = "biofit:ai:deepseek_key";
const KEY_HISTORY = "biofit:ai:chat_history";

export function getLocalDeepSeekKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(KEY_API_KEY) || "";
  } catch {
    return "";
  }
}

export function setLocalDeepSeekKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    if (!key.trim()) {
      window.localStorage.removeItem(KEY_API_KEY);
    } else {
      window.localStorage.setItem(KEY_API_KEY, key.trim());
    }
  } catch {
    // ignorar erro em storage restrito
  }
}

export function getSavedChatHistory(): SavedMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY_HISTORY);
    return raw ? (JSON.parse(raw) as SavedMessage[]) : [];
  } catch {
    return [];
  }
}

export function saveChatHistory(history: SavedMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    // Guarda até as últimas 30 mensagens para preservar armazenamento local
    const trimmed = history.slice(-30);
    window.localStorage.setItem(KEY_HISTORY, JSON.stringify(trimmed));
  } catch {
    // ignorar erro
  }
}

export function clearSavedChatHistory(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY_HISTORY);
  } catch {
    // ignorar
  }
}
