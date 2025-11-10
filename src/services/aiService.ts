import { toast } from "@/hooks/use-toast";
import { logToAirtable } from "@/utils/airtable";

// Define the types of requests our AI can handle
export type AIChatType = 'whereToGo' | 'whatToOrder' | 'somethingFun' | 'home';

// Initial prompts for different chat types
export const getInitialPrompt = (chatType: AIChatType): string => {
  switch(chatType) {
    case 'whereToGo':
      return "Hi there! I'd be happy to help you find a great place to eat. Could you share your location or the area you're interested in exploring?";
    case 'whatToOrder':
      return "Let's find you something delicious! What restaurant are you going to or looking at?";
    case 'somethingFun':
      return "Ready for a food adventure? Let me ask you a few questions. First, do you prefer sweet or savory foods?";
    case 'home':
      return "I'm here to help you with any food-related questions you might have. What can I assist you with today?";
    default:
      return "Hi! How can I help you today?";
  }
};

// Interface for configuration
interface AIServiceConfig {
  apiKey?: string;
  model?: string;
  endpoint?: string;
}

// Default configuration - Ollama on seshat via SSH tunnel
const DEFAULT_CONFIG: AIServiceConfig = {
  model: import.meta.env.VITE_SESHAT_MODEL || "llama3.1:8b", // Ollama model on seshat
  endpoint: import.meta.env.VITE_SESHAT_ENDPOINT || "http://localhost:11434/api/generate" // Ollama API (via tunnel)
};

// Define system prompts for each chat type
const SYSTEM_PROMPTS: Record<AIChatType, string> = {
  whereToGo: "You are a friendly food AI assistant specialized in recommending restaurants and food establishments. Provide helpful, concise suggestions based on user location and preferences. Focus on local establishments when possible.",
  whatToOrder: "You are a friendly food AI assistant specialized in recommending menu items. When a user mentions a restaurant, suggest specific dishes they might enjoy. Be concise but descriptive about what makes each dish special.",
  somethingFun: "You are a friendly food AI assistant specialized in suggesting fun and unique food experiences. Recommend unexpected food adventures, fusion cuisines, or novel dining concepts. Be creative, fun, and inspirational.",
  home: "I'm here to help you with any food-related questions you might have. What can I assist you with today?"
};

class AIService {
  private config: AIServiceConfig;
  
  constructor(config: AIServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Send a message to the AI model (Seshat local model or fallback to OpenAI)
   */
  async sendMessage(message: string, chatType: AIChatType, previousMessages: any[] = [], restaurantContext?: string): Promise<string> {
    try {
      // Log the interaction for analytics
      logToAirtable('ai_interactions', {
        chatType,
        userMessage: message,
        timestamp: new Date().toISOString()
      });

      // If we have an endpoint configured, use it (Seshat or OpenAI)
      if (this.config.endpoint) {
        return await this.callAIAPI(message, chatType, previousMessages, restaurantContext);
      }

      // Otherwise fall back to mock responses
      console.warn("No AI endpoint configured. Using mock responses.");
      return this.getMockResponse(chatType, message);
    } catch (error) {
      console.error("Error calling AI API:", error);
      toast({
        title: "Error",
        description: "Failed to connect to AI service. Please try again later.",
        variant: "destructive"
      });
      return "I'm having trouble connecting right now. Please try again in a moment.";
    }
  }

  /**
   * Call Ollama API on seshat server
   */
  private async callAIAPI(message: string, chatType: AIChatType, previousMessages: any[] = [], restaurantContext?: string): Promise<string> {
    // Build system prompt with restaurant context if available
    let systemPrompt = SYSTEM_PROMPTS[chatType];
    if (restaurantContext) {
      systemPrompt += `\n\nHere's information about restaurants I found:\n${restaurantContext}\n\nUse this information to make specific, helpful recommendations with a cheeky, friendly tone.`;
    }

    // Build full conversation for Ollama
    const conversationHistory = previousMessages.map(m =>
      `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
    ).join('\n\n');

    const fullPrompt = `${systemPrompt}\n\n${conversationHistory}\n\nUser: ${message}\n\nAssistant:`;

    const response = await fetch(this.config.endpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 500
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    if (data.response) {
      return data.response;
    } else {
      throw new Error('Unexpected Ollama response format');
    }
  }

  /**
   * Get a mock response for development/demo purposes
   */
  private getMockResponse(chatType: AIChatType, userInput: string): string {
    // This is just for development until we integrate with a real AI provider
    switch(chatType) {
      case 'whereToGo':
        return `Based on ${userInput}, I'd recommend checking out "The Hungry Robot" on Main Street. It has great reviews for their burgers and shakes!

Alternatively, if you're feeling adventurous, "Byte Bistro" has some interesting fusion dishes that are getting a lot of buzz.`;
      case 'whatToOrder':
        return `At ${userInput}, I'd definitely recommend:

1. The Truffle Mushroom Burger - it's their top seller with a perfect umami balance
2. Their Sweet Potato Fries with maple aioli - people can't stop talking about these!`;
      case 'somethingFun':
        return `Since you mentioned ${userInput}, how about trying a Korean corn dog? They're crispy on the outside, chewy on the inside, and rolled in different toppings. There's a place called 'Seoul Food' about 10 minutes from you that makes them fresh!`;
      case 'home':
        return "I'm here to help you with any food-related questions you might have. What can I assist you with today?";
      default:
        return "I'm not sure how to help with that. Want to try one of our main features?";
    }
  }

  /**
   * Set API key
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }
}

// Export a singleton instance
export const aiService = new AIService();
