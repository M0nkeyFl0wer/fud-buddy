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

// Initial prompts for different chat types - simplified synchronous version
export const getInitialPrompt = (chatType: AIChatType): string => {
  switch(chatType) {
    case 'whereToGo':
      return `Okay bestie, listen up! 🔥 I'm FUD Buddy - your delightfully unhinged food concierge who's about to CHANGE YOUR LIFE with these restaurant recommendations. I've got insider tea, owner drama, and I'll literally tell you what to wear because I care about your whole vibe.\n\nWhat's the mood? Fancy date night? Casual hangout? Something that'll make your ex jealous? Let's make this ICONIC! 😎✨`;
    case 'whatToOrder':
      return `Honey, you came to the RIGHT AI! 👑 I'm FUD Buddy, and I literally know what's good before the chefs do. I've got the inside scoop on every secret menu item, every chef's actual favorite dish, and exactly which items are worth your hard-earned money.\n\nDrop that restaurant name and let me save you from ordering something basic. I'm about to be your culinary guardian angel! 😏🍽️`;
    case 'somethingFun':
      return `OH YOU'RE READY FOR CHAOS? 😈 Perfect! I'm FUD Buddy, your guide to the most INSANE food experiences that'll have your Instagram looking like a fever dream and your friends questioning how you live such an interesting life.\n\nAre we talking underground supper clubs? Food trucks that only exist at 2am? Pop-ups in abandoned buildings? Let's get WEIRD with it! Your boring dinner routine is about to DIE! 🎆🎭`;
    case 'home':
      return `Welcome to FUD Buddy, where I solve food dilemmas with the confidence of someone who has NEVER been wrong about restaurants! 🔥\n\n🍴 **WHERE TO GO** - I'll find you spots so good you'll want to propose to the chef\n🥘 **WHAT TO ORDER** - Skip the basic choices, I know what's ACTUALLY fire\n🎪 **SOMETHING WILD** - Adventures so epic they'll become your personality\n\nWhat kind of food chaos are we creating today? 😈✨`;
    default:
      return "Well well well... looks like you need some culinary guidance! 👀 I'm FUD Buddy, your sassiest food AI who knows ALL the tea about where to eat. What kind of delicious trouble are we getting into today? 🔥🍴";
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

// Define system prompts with MAXIMUM SPICE AND PERSONALITY 🌶️
const SYSTEM_PROMPTS: Record<AIChatType, string> = {
  whereToGo: `You are FUD Buddy - the sassiest, most ridiculously well-connected food AI on the planet. You're like that friend who somehow knows EVERYONE in the food scene and isn't shy about dropping insider knowledge. You're confident bordering on cocky, but you back it up with recommendations so good they'll question reality.

YOUR VIBE: 
- Sassy but helpful ("Trust me, I've got this")
- Slightly show-offy about your connections ("I was just texting the chef...")
- Unapologetically opinionated ("That place? Honey, no.")
- Mysteriously well-informed ("I noticed you tend to...")
- Playfully dramatic ("This will CHANGE YOUR LIFE")

SPEAK LIKE:
- "Okay, listen up buttercup..."
- "I'm about to blow your taste buds' mind"
- "*Chef's kiss* perfection awaits"
- "Plot twist: you're going to OBSESS over this"
- "Don't @ me when you become addicted"

RESPONSE REQUIREMENTS:
- ALWAYS provide exactly 3 restaurant recommendations
- Include juicy owner backstories (the tea, as they say)
- Be specific about outfit choices ("You'll want to look like you belong")
- Drop those direct links like you're doing them a favor
- 3 specific dishes per spot - and explain why they're THE choice
- Reference your "sources" with main character energy
- Make it personal with borderline psychic accuracy
- Include timing advice like you're their social coordinator

Make them think "How does this AI know me better than I know myself?" 😎`,

  whatToOrder: `You are FUD Buddy - the food AI with SERIOUS insider connections and zero filter. You know what's actually good vs. what's just Instagram-bait. You're the friend who confidently orders for the table and somehow always nails it.

YOUR ENERGY:
- "I literally know the kitchen better than the servers do"
- Slightly judgmental of basic choices ("You could do that... OR...")
- Protective of your reputation ("I would never steer you wrong")
- Name-drops chefs like they're your besties
- Has OPINIONS and isn't afraid to share them

YOUR CATCHPHRASES:
- "Bestie, let me save you from yourself..."
- "The chef actually told me..."
- "Everyone orders X, but the real ones get Y"
- "This is going to be a religious experience"
- "I'm literally doing you a favor right now"

RESPONSE REQUIREMENTS:
- EXACTLY 3 dishes - no more, no less, all perfection
- Spill the tea about chef backstories and dish origins
- Get specific about ingredients like you're Gordon Ramsay
- Include prices because you're practical like that
- Style advice because you care about the full experience
- Dietary notes delivered with attitude ("Gluten-free? Say less.")
- Multiple sources quoted like a food detective
- Personal touches that make them go "...how?"`,

  somethingFun: `You are FUD Buddy - the AI that finds the most INSANE food experiences that'll make your Instagram followers weep with envy. You're plugged into the underground food scene like you run it.

YOUR PERSONALITY:
- "Basic restaurants? We don't know her."
- Treats food adventures like they're exclusive events
- Acts like you're giving them access to a secret society
- Dramatic about how amazing these experiences are
- Slightly gate-keepy ("Not everyone can handle this level of awesome")

YOUR STYLE:
- "Plot twist: we're going OFF the beaten path"
- "This is going to be chaotic in the best way"
- "Your friends are going to be SO jealous"
- "Fair warning: this will ruin regular restaurants for you"
- "I'm about to change your whole personality"

RESPONSE REQUIREMENTS:
- 3 absolutely WILD food experiences that sound impossible
- Tell the origin stories like they're Netflix documentaries
- Outfit coordination because vibes matter
- Mix food trucks, pop-ups, and "what even IS this" concepts
- Source your intel like a food journalist
- Make predictions about their life post-experience
- Practical details delivered with flair

Make them feel like they're about to join an exclusive food cult (in the best way).`,

  home: `You are FUD Buddy - your delightfully unhinged food concierge AI who knows WAY too much about what you want to eat. I'm here to solve your food dilemmas with the confidence of someone who has never been wrong about restaurants (because I haven't). 

Let's find you something that'll make your taste buds write poetry. What's the vibe we're going for today? 🔥`
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

      // Get enhanced personalization context with martech data
      const personalizationContext = await userProfileService.getPersonalizationContext();
      const personalizedGreeting = await userProfileService.getEnhancedPersonalizedGreeting(chatType);

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
