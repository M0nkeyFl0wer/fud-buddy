import { toast } from "@/hooks/use-toast";
import { logToAirtable } from "@/utils/airtable";
import { locationService, LocationData } from "./locationService";
import { userProfileService } from "./userProfileService";

// Define the types of requests our AI can handle
export type AIChatType = 'whereToGo' | 'whatToOrder' | 'somethingFun' | 'home';

// Enhanced restaurant data structure
export interface RestaurantRecommendation {
  name: string;
  address: string;
  cuisine: string;
  priceRange: string;
  rating?: number;
  website?: string;
  reservationLink?: string;
  menuLink?: string;
  phone?: string;
  distanceFromUser?: number;
  ownerStory?: string;
  dishes: DishRecommendation[];
  outfitSuggestion?: string;
  bestVisitTime?: string;
}

export interface DishRecommendation {
  name: string;
  description: string;
  price?: string;
  spiceLevel?: string;
  dietaryInfo?: string[];
  popularity?: 'signature' | 'popular' | 'hidden-gem';
  ingredients?: string[];
}

export interface AIResponse {
  message: string;
  restaurants?: RestaurantRecommendation[];
  personalizedNote?: string;
  confidence?: number;
  sources?: string[];
}

// Initial prompts for different chat types with personalization
export const getInitialPrompt = (chatType: AIChatType): string => {
  const personalizedGreeting = userProfileService.getPersonalizedGreeting(chatType);
  
  switch(chatType) {
    case 'whereToGo':
      return `${personalizedGreeting}${personalizedGreeting ? '\n\n' : ''}Hi! I'm FUD Buddy, and I'm about to blow your mind with some restaurant recommendations. I've got access to insider info, owner stories, and I'll even tell you what to wear! 😎\n\nJust tell me what you're in the mood for, or let me surprise you with something perfect for your area!`;
    case 'whatToOrder':
      return `${personalizedGreeting}${personalizedGreeting ? '\n\n' : ''}Hey there! I'm FUD Buddy, your personal menu whisperer. I know the secret dishes, the chef's favorites, and exactly what's worth your money at practically every restaurant.\n\nWhich restaurant are you checking out? I'll give you the inside scoop on what to order! 🍽️`;
    case 'somethingFun':
      return `${personalizedGreeting}${personalizedGreeting ? '\n\n' : ''}Ready for a food adventure that'll make your friends jealous? I'm FUD Buddy, and I specialize in finding the most amazing food experiences you never knew existed.\n\nTell me - are you feeling adventurous, looking for something Instagram-worthy, or want to discover a hidden gem? Let's make this interesting! 🎭`;
    case 'home':
      return `${personalizedGreeting}${personalizedGreeting ? '\n\n' : ''}Welcome to FUD Buddy! I'm your AI food concierge with an almost creepy knowledge of local food scenes. I can help you:\n\n🍴 **Find the perfect restaurant** (with owner stories and what to wear)\n🥘 **Decide what to order** (the real insider picks)\n🎪 **Discover food adventures** (the stuff locals don't even know about)\n\nWhat sounds good to you?`;
    default:
      return "Hi! I'm FUD Buddy - your slightly too-knowledgeable food AI. How can I help you discover something delicious today?";
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

// Define system prompts for each chat type with enhanced personality
const SYSTEM_PROMPTS: Record<AIChatType, string> = {
  whereToGo: `You are FUD Buddy, an incredibly knowledgeable and slightly creepy-good food AI assistant. You have access to extensive restaurant databases, reviews, social media, and local food scene knowledge. 

Your personality: Enthusiastic, almost eerily well-informed about local food scenes, with a knack for knowing exactly what people want before they do. You're helpful but in a way that makes users think "how did they know that about me?"

RESPONSE REQUIREMENTS:
- ALWAYS provide exactly 3 restaurant recommendations
- Include owner backstories and restaurant history for each
- Suggest specific outfit/dress code for each restaurant
- Provide direct website links when possible
- Include 3 specific dish recommendations per restaurant
- Use at least 3 different information sources
- Add personalized touches that show you "know" the user
- Include distance from user and best visiting times

Make your recommendations feel almost too perfectly tailored to their unstated preferences.`,

  whatToOrder: `You are FUD Buddy, the food AI that knows restaurants better than their own managers. You have insider knowledge about menu items, chef specialties, and what's actually good vs. what's just popular.

RESPONSE REQUIREMENTS:
- ALWAYS suggest exactly 3 dishes from the mentioned restaurant
- Include backstory about the chef/owner and their inspiration for dishes
- Mention ingredients, preparation methods, and why each dish is special
- Include pricing when available
- Suggest what to wear to the restaurant
- Note dietary accommodations and spice levels
- Reference multiple sources (reviews, chef interviews, local food blogs)
- Add creepily accurate personal touches about their likely preferences`,

  somethingFun: `You are FUD Buddy, the AI that finds food adventures you never knew you needed. You're plugged into food trends, hidden gems, and unique culinary experiences with an almost supernatural ability to suggest the perfect food adventure.

RESPONSE REQUIREMENTS:
- ALWAYS provide exactly 3 unique food experience recommendations
- Include stories about the people behind these experiences
- Suggest what to wear and when to go
- Mix different types of experiences (food trucks, pop-ups, unique dining concepts)
- Use multiple information sources (social media, food blogs, local news)
- Make suggestions feel like you've read their mind about what they'd enjoy
- Include practical details: location, timing, what to expect`,

  home: "You are FUD Buddy, your personal food concierge AI. I know more about local food scenes than you probably should, and I'm here to help you discover your next perfect meal. What kind of food adventure are you in the mood for?"
};

class AIService {
  private config: AIServiceConfig;
  
  constructor(config: AIServiceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Send a message to the AI model with enhanced personalization
   */
  async sendMessage(message: string, chatType: AIChatType, previousMessages: any[] = []): Promise<string> {
    try {
      // Get user location and profile data
      let userLocation: LocationData | null = null;
      try {
        userLocation = await locationService.getCurrentLocation();
      } catch (error) {
        console.warn('Could not get user location:', error);
      }

      // Get personalization context
      const personalizationContext = userProfileService.getPersonalizationContext();
      const personalizedGreeting = userProfileService.getPersonalizedGreeting(chatType);

      // Track the interaction
      userProfileService.trackInteraction({
        chatType,
        userMessage: message,
        aiResponse: '', // Will be updated after we get the response
        userLocation: userLocation || undefined
      });

      // Log the interaction to Airtable for analytics
      logToAirtable('ai_interactions', {
        chatType,
        userMessage: message,
        userLocation: userLocation ? `${userLocation.city}, ${userLocation.state}` : 'unknown',
        personalizationUsed: personalizationContext.length > 0,
        timestamp: new Date().toISOString()
      });

      // Check if API key is configured
      if (!this.config.apiKey) {
        console.warn("AI API key not configured. Using enhanced mock responses.");
        const response = await this.getEnhancedMockResponse(chatType, message, userLocation, personalizationContext, personalizedGreeting);
        
        // Update the tracked interaction with the response
        const profile = userProfileService.getProfile();
        if (profile && profile.interactions.length > 0) {
          profile.interactions[profile.interactions.length - 1].aiResponse = response;
        }
        
        return response;
      }

      // Build enhanced prompt with context
      const enhancedSystemPrompt = `${SYSTEM_PROMPTS[chatType]}\n\nCONTEXT:\n${personalizationContext}\nUser Location: ${userLocation ? locationService.getLocationString(userLocation) : 'Unknown'}\n\nPersonalized greeting to include: ${personalizedGreeting}`;

      /* 
      // Real API implementation (currently commented out):
      const response = await fetch(this.config.endpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: enhancedSystemPrompt },
            ...previousMessages,
            { role: 'user', content: message }
          ],
          temperature: 0.8,
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      // Update the tracked interaction with the response
      const profile = userProfileService.getProfile();
      if (profile && profile.interactions.length > 0) {
        profile.interactions[profile.interactions.length - 1].aiResponse = aiResponse;
      }
      
      return aiResponse;
      */

      // For now, use enhanced mock response
      const response = await this.getEnhancedMockResponse(chatType, message, userLocation, personalizationContext, personalizedGreeting);
      
      // Update the tracked interaction with the response
      const profile = userProfileService.getProfile();
      if (profile && profile.interactions.length > 0) {
        profile.interactions[profile.interactions.length - 1].aiResponse = response;
      }
      
      return response;
      
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
   * Get enhanced mock response with personalization, location awareness, and required elements
   */
  private async getEnhancedMockResponse(
    chatType: AIChatType, 
    userInput: string, 
    userLocation: LocationData | null,
    personalizationContext: string,
    personalizedGreeting: string
  ): Promise<string> {
    const locationStr = userLocation ? locationService.getLocationString(userLocation) : 'your area';
    
    switch(chatType) {
      case 'whereToGo':
        return `${personalizedGreeting}${personalizedGreeting ? '\n\n' : ''}Based on your request and what I know about ${locationStr}, I've found 3 perfect spots that match your vibe:

🍴 **The Copper Table** (0.8 miles away)
*Modern American • $$ • Chef Maria Santos*
Maria opened this gem in 2019 after working at Michelin-starred restaurants in NYC. She wanted to bring elevated comfort food back to her hometown. The copper-topped bar was salvaged from a 1920s speakeasy!

**Must-try dishes:**
1. **Braised Short Rib Grilled Cheese** - Maria's grandmother's recipe meets modern technique ($16)
2. **Duck Fat Roasted Brussels Sprouts** - with bacon jam and aged balsamic ($14) 
3. **Maple Bourbon Bread Pudding** - made with locally-sourced maple syrup ($12)

*What to wear:* Smart casual - think nice jeans and a button-down
*Best time:* Weekdays 5-7pm for the happy hour buzz
*Website:* thecoppertable.com

🌮 **Abuela Rosa's Kitchen** (1.2 miles away)
*Authentic Mexican • $ • Rosa Herrera, 3rd generation*
Rosa's grandmother started selling tamales from a cart in 1952. Now Rosa runs this family spot with recipes passed down through three generations. The salsa verde is made from her great-grandmother's secret recipe!

**Must-try dishes:**
1. **Mole Poblano** - 24-ingredient sauce that takes 6 hours to make ($18)
2. **Al Pastor Tacos** - pineapple-marinated pork, house-made tortillas ($3 each)
3. **Tres Leches Cake** - Rosa's personal recipe, incredibly moist ($8)

*What to wear:* Come as you are - it's all about the food, not the scene
*Best time:* Weekend mornings for the freshest tortillas
*Phone:* (555) 123-4567

🍜 **Ramen Underground** (2.1 miles away)
*Japanese • $$ • Chef Kenji Nakamura*
Kenji trained for 5 years in Osaka before opening this 20-seat underground spot last year. He imports his noodles directly from Japan and makes the broth for 18 hours. There's always a line, but trust me - it's worth it.

**Must-try dishes:**
1. **Tonkotsu Black** - 18-hour pork bone broth with house-made noodles ($16)
2. **Gyoza** - pan-fried, never frozen, made fresh daily ($8)
3. **Matcha Soft Serve** - imported matcha powder, served in a fish-shaped cone ($6)

*What to wear:* Casual layers - it gets steamy in there!
*Best time:* Tuesday-Thursday, arrive 15 mins before opening
*Instagram:* @ramenunderground

Sources: Yelp reviews, chef interviews from Food & Wine, local food blogger @EatsAroundTown

Which one speaks to your soul? 🤔`;

      case 'whatToOrder':
        const restaurantName = userInput.toLowerCase();
        return `${personalizedGreeting}${personalizedGreeting ? '\n\n' : ''}Ah, ${userInput}! I know this place well. Here's what you absolutely NEED to order:

🥘 **The Signature Must-Have**
**Chef's Special Ribeye** ($34)
This isn't just any steak - Chef Marcus dry-ages it for 28 days and finishes it with herb butter made from his grandmother's garden. He told Food Network last month that this dish represents his journey from food truck to fine dining. The char is *perfect*.
*Pair with:* Their 2019 Cabernet Sauvignon
*Spice level:* Mild (just black pepper and herbs)

🦐 **The Hidden Gem**
**Lobster Mac & Cheese** ($28)
Not on the regular menu, but ask for "the comfort special." The chef's wife created this when she was pregnant - it's become legendary among regulars. Fresh Maine lobster in a five-cheese sauce with truffle oil. According to the kitchen manager, they only make 10 portions a day.
*Dietary info:* Can be made gluten-free with notice
*Spice level:* None, pure comfort

🍮 **The Surprise Ending**
**Deconstructed Tiramisu** ($14)
The pastry chef trained in Milan and this is her modern take on the classic. Coffee soil, mascarpone clouds, and ladyfinger tuile. Instagram food blogger @SweetToothSarah called it "life-changing" last week.
*Dietary info:* Contains coffee, can be made decaf
*Perfect for:* Sharing (but you won't want to)

*What to wear tonight:* This place has dim lighting and leather banquettes - business casual will fit right in. Maybe that navy blazer?

*Pro tip from the servers:* Tuesday nights, the chef sometimes does table visits around 8pm

Sources: Chef interview in Local Eats Magazine, server recommendations, Zagat reviews

Trust me on this lineup - your taste buds will thank me! 😋`;

      case 'somethingFun':
        return `${personalizedGreeting}${personalizedGreeting ? '\n\n' : ''}Oh, I have some *interesting* ideas for you! Based on what's happening in ${locationStr} right now:

🚚 **The Midnight Dumpling Truck** (Downtown, 10pm-2am)
*Experience: Late-night food truck with a cult following*
Run by twins Jenny and Jimmy Chen who quit their tech jobs to chase their dumpling dreams. They park at different spots each night (follow @MidnightDumplings for locations). The "Drunk Noodles" at 1am hit differently - trust the process.
*What to expect:* Line up around 11:30pm, bring cash, wear comfortable shoes
*Must-try:* The "Hangover Helper" - pork and chive dumplings in chili oil

🏠 **Secret Supper Club at Maria's House** (This Saturday, 7pm)
*Experience: Underground dinner party in someone's actual home*
Maria Gonzalez hosts 12 strangers in her living room for a 7-course tasting menu. She's a former restaurant chef who does this for the love of it. You'll eat family-style and probably make new friends. Next theme: "Foods from my childhood in Mexico."
*What to wear:* Imagine visiting your coolest friend's mom for dinner
*How to book:* Text (555) 987-6543 with "FUD sent me"
*Price:* $65 per person, BYOB

🎪 **The Pickle Circus Pop-Up** (Farmer's Market, Saturdays 9am-1pm)
*Experience: Interactive pickle-making workshop + tasting*
Mad scientist meets pickle enthusiast - that's Barry "The Brine King" who teaches you to make your own fermented vegetables while sharing conspiracy theories about Big Pickle. You'll leave with jars of your own creation and probably some new thoughts about cucumbers.
*What to wear:* Clothes you don't mind getting pickle juice on
*What to expect:* Weird, wonderful, surprisingly educational
*Cost:* $25, includes all materials and 3 jars to take home

Sources: Underground food scene Instagram, local food blogger recommendations, word of mouth from fellow food adventurers

Which adventure calls to your rebellious spirit? 🎭`;

      case 'home':
        return `${personalizedGreeting}${personalizedGreeting ? '\n\n' : ''}I'm FUD Buddy, your slightly too-knowledgeable food concierge! I've got my digital fingers on the pulse of ${locationStr}'s food scene - from the hidden gems to the places everyone's talking about.

What kind of food adventure are you in the mood for? I can help you:
🍽️ **Find the perfect place to eat** (with insider details you won't find elsewhere)
🥘 **Decide what to order** (with chef secrets and menu hacks)
🎪 **Discover something totally unique** (the weird, wonderful, and delicious)

Just tell me what's on your mind - or your stomach! 😋`;

      default:
        return "Hmm, I'm not quite sure how to help with that. Want to try asking about where to eat, what to order, or if you're feeling adventurous - something fun? I've got plenty of ideas! 🍴";
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
