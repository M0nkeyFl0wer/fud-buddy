
import { toast } from "@/hooks/use-toast";
import { logToAirtable } from "@/utils/airtable";

// Define the types of requests our AI can handle
export type AIChatType = 'whereToGo' | 'whatToOrder' | 'somethingFun';

// Initial prompts for different chat types
export const getInitialPrompt = (chatType: AIChatType): string => {
  switch(chatType) {
    case 'whereToGo':
      return "Hi there! I'd be happy to help you find a great place to eat. Could you share your location or the area you're interested in exploring?";
    case 'whatToOrder':
      return "Let's find you something delicious! What restaurant are you going to or looking at?";
    case 'somethingFun':
      return "Ready for a food adventure? Let me ask you a few questions. First, do you prefer sweet or savory foods?";
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

// Default configuration - this would typically come from environment variables
const DEFAULT_CONFIG: AIServiceConfig = {
  model: "gpt-3.5-turbo", // Default model
  endpoint: "https://api.openai.com/v1/chat/completions"
};

// Define system prompts for each chat type
const SYSTEM_PROMPTS: Record<AIChatType, string> = {
  whereToGo: "You are a friendly food AI assistant specialized in recommending restaurants and food establishments. Provide helpful, concise suggestions based on user location and preferences. Focus on local establishments when possible.",
  whatToOrder: "You are a friendly food AI assistant specialized in recommending menu items. When a user mentions a restaurant, suggest specific dishes they might enjoy. Be concise but descriptive about what makes each dish special.",
  somethingFun: "You are a friendly food AI assistant specialized in suggesting fun and unique food experiences. Recommend unexpected food adventures, fusion cuisines, or novel dining concepts. Be creative, fun, and inspirational."
};

class AIService {
  private config: AIServiceConfig;
  
  constructor(config: AIServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Send a message to the AI model
   */
  async sendMessage(message: string, chatType: AIChatType, previousMessages: any[] = []): Promise<string> {
    // Check if API key is configured
    if (!this.config.apiKey) {
      console.warn("AI API key not configured. Using mock responses.");
      return this.getMockResponse(chatType, message);
    }

    try {
      // Log the interaction to Airtable for analytics
      logToAirtable('ai_interactions', {
        chatType,
        userMessage: message,
        timestamp: new Date().toISOString()
      });

      // In a real implementation, this would make an API call to the AI service
      // For now, we're using mock responses
      return this.getMockResponse(chatType, message);
      
      /* 
      // This is how a real implementation would look:
      const response = await fetch(this.config.endpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPTS[chatType] },
            ...previousMessages,
            { role: 'user', content: message }
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
      */
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
