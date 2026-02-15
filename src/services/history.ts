import type { UserPreferences } from '@/services/api';

export type StoredRecommendation = {
  restaurant: {
    name: string;
    address?: string;
    priceRange?: string;
    rating?: number;
  };
  dishes?: { name: string; description?: string }[];
  story?: string;
};

export type StoredSource = {
  title: string;
  url: string;
  engine?: string;
};

export type HistoryFeedback = {
  rating?: number;
  went?: boolean;
  comment?: string;
};

export type HistoryEntry = {
  id: string; // sessionId
  createdAt: string;
  preferences: UserPreferences;
  recommendations: StoredRecommendation[];
  sources?: StoredSource[];
  feedback?: HistoryFeedback;
};

const STORAGE_KEY = 'fud_history_v1';

function _load(): HistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as HistoryEntry[];
  } catch {
    return [];
  }
}

function _save(entries: HistoryEntry[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function listHistory(): HistoryEntry[] {
  const entries = _load();
  return entries.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getHistoryEntry(id: string): HistoryEntry | null {
  const entries = _load();
  return entries.find((e) => e.id === id) || null;
}

export function upsertHistoryEntry(entry: HistoryEntry): void {
  const entries = _load();
  const idx = entries.findIndex((e) => e.id === entry.id);
  if (idx >= 0) {
    // Preserve original createdAt so edits/feedback don't reorder everything.
    entries[idx] = { ...entry, createdAt: entries[idx].createdAt };
  } else {
    entries.push(entry);
  }
  _save(entries);
}

export function updateHistoryFeedback(id: string, feedback: HistoryFeedback): void {
  const existing = getHistoryEntry(id);
  if (!existing) return;
  upsertHistoryEntry({ ...existing, feedback: { ...(existing.feedback || {}), ...feedback } });
}

export function removeHistoryEntry(id: string): void {
  const entries = _load().filter((e) => e.id !== id);
  _save(entries);
}

export function clearHistory(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
