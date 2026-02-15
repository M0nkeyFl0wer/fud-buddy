const DEFAULT_API_BASE_URL = (() => {
  // If no env is set, assume API is on same host:8000
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:8000`;
  }
  return 'http://localhost:8000';
})();

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
const API_KEY = import.meta.env.VITE_API_KEY || '';

class ApiClient {
  private baseUrl: string;
  private apiKey: string;
  private llmModel: string;

  constructor() {
    const storedBaseUrl =
      typeof window !== 'undefined' ? window.localStorage.getItem('fud_api_base_url') : null;
    const storedApiKey =
      typeof window !== 'undefined' ? window.localStorage.getItem('fud_api_key') : null;
    const storedLlmModel =
      typeof window !== 'undefined' ? window.localStorage.getItem('fud_llm_model') : null;

    this.baseUrl = storedBaseUrl || API_BASE_URL;
    this.apiKey = storedApiKey || API_KEY;
    this.llmModel = storedLlmModel || '';
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    if (this.llmModel) {
      headers['X-FUD-LLM-Model'] = this.llmModel;
    }
    return headers;
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
  }

  async streamChat(
    messages: Message[],
    preferences: UserPreferences,
    onEvent: (event: StreamEvent) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/stream`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ messages, preferences }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            try {
              const parsed: unknown = JSON.parse(data);
              if (typeof parsed === 'object' && parsed !== null) {
                onEvent(parsed as StreamEvent);
              } else {
                onEvent({ type: 'raw', content: parsed });
              }
              if (
                typeof parsed === 'object' &&
                parsed !== null &&
                'type' in parsed &&
                (parsed as { type?: unknown }).type === 'done'
              ) {
                onComplete();
                return;
              }
            } catch {
              onEvent({ type: 'raw', content: data });
            }
          }
        }
      }
      onComplete();
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fud_api_base_url', url);
    }
  }

  setApiKey(key: string): void {
    this.apiKey = key;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fud_api_key', key);
    }
  }

  setLlmModel(model: string): void {
    this.llmModel = model;
    if (typeof window !== 'undefined') {
      if (model) {
        window.localStorage.setItem('fud_llm_model', model);
      } else {
        window.localStorage.removeItem('fud_llm_model');
      }
    }
  }
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: Message[];
  preferences?: UserPreferences;
}

export interface UserPreferences {
  location?: string;
  cuisine?: string[];
  dietary?: string[];
  priceRange?: string;
  vibe?: string[];
}

export type StreamEvent = Record<string, unknown> & {
  type?: string;
};

export interface FeedbackRequest {
  session_id: string;
  rating?: number;
  went?: boolean;
  comment?: string;
  contact?: string;
  consent_contact?: boolean;
  consent_public?: boolean;
}

export interface Recommendation {
  restaurant: {
    name: string;
    address: string;
    rating: number;
    priceRange: string;
    cuisine: string[];
  };
  dishes: {
    name: string;
    description: string;
    price: string;
  }[];
  story: string;
  osintSummary?: string;
}

export const apiClient = new ApiClient();
