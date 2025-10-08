import { logToAirtable } from "@/utils/airtable";
import { LocationData } from "./locationService";
import { martechProfileService, EnrichedUserProfile } from "./martechProfileService";
import { pixelManagerService } from "./pixelManagerService";

export interface UserPreferences {
  dietaryRestrictions: string[];
  favoriteCuisines: string[];
  budgetRange: 'budget' | 'moderate' | 'upscale' | 'luxury';
  diningStyle: 'quick' | 'casual' | 'fine-dining' | 'takeout';
  spiceLevel: 'mild' | 'medium' | 'hot' | 'extra-hot';
  mealTimes: ('breakfast' | 'lunch' | 'dinner' | 'late-night')[];
  groupSize: 'solo' | 'couple' | 'small-group' | 'large-group';
}

export interface UserInteraction {
  timestamp: string;
  chatType: string;
  userMessage: string;
  aiResponse: string;
  userLocation?: LocationData;
  satisfaction?: 'thumbs-up' | 'thumbs-down';
  restaurantSelected?: string;
  dishSelected?: string;
}

export interface UserProfile {
  id: string;
  createdAt: string;
  lastActive: string;
  preferences: UserPreferences;
  interactions: UserInteraction[];
  inferredData: {
    personalityType?: 'adventurous' | 'conservative' | 'health-conscious' | 'indulgent';
    timePatterns: string[]; // When they typically ask for food recommendations
    locationPatterns: LocationData[]; // Their frequent locations
    cuisineAffinity: Record<string, number>; // Cuisine preferences with confidence scores
    pricePreferences: Record<string, number>; // Price range preferences
    socialPatterns: string[]; // Solo vs group dining patterns
  };
  deviceInfo: {
    userAgent?: string;
    screenSize?: string;
    timezone?: string;
    language?: string;
  };
  behaviorTracking: {
    sessionCount: number;
    avgSessionDuration: number;
    mostActiveHours: number[];
    frequentQueries: string[];
    abandonmentRate: number; // Percentage of conversations not completed
  };
}

class UserProfileService {
  private readonly STORAGE_KEY = 'fud-buddy-profile';
  private readonly ANONYMOUS_ID_KEY = 'fud-buddy-anonymous-id';
  private currentProfile: UserProfile | null = null;

  constructor() {
    this.initializeProfile();
  }

  /**
   * Initialize or load existing user profile
   */
  private initializeProfile(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.currentProfile = JSON.parse(stored);
        this.updateLastActive();
      } else {
        this.createNewProfile();
      }
    } catch (error) {
      console.warn('Failed to load user profile, creating new one:', error);
      this.createNewProfile();
    }
  }

  /**
   * Create a new anonymous user profile
   */
  private createNewProfile(): void {
    const anonymousId = this.getOrCreateAnonymousId();
    
    this.currentProfile = {
      id: anonymousId,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      preferences: {
        dietaryRestrictions: [],
        favoriteCuisines: [],
        budgetRange: 'moderate',
        diningStyle: 'casual',
        spiceLevel: 'medium',
        mealTimes: ['lunch', 'dinner'],
        groupSize: 'couple'
      },
      interactions: [],
      inferredData: {
        timePatterns: [],
        locationPatterns: [],
        cuisineAffinity: {},
        pricePreferences: {},
        socialPatterns: []
      },
      deviceInfo: this.collectDeviceInfo(),
      behaviorTracking: {
        sessionCount: 0,
        avgSessionDuration: 0,
        mostActiveHours: [],
        frequentQueries: [],
        abandonmentRate: 0
      }
    };

    this.saveProfile();
  }

  /**
   * Get or create anonymous user ID
   */
  private getOrCreateAnonymousId(): string {
    let anonymousId = localStorage.getItem(this.ANONYMOUS_ID_KEY);
    if (!anonymousId) {
      anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(this.ANONYMOUS_ID_KEY, anonymousId);
    }
    return anonymousId;
  }

  /**
   * Collect device and browser information
   */
  private collectDeviceInfo(): UserProfile['deviceInfo'] {
    return {
      userAgent: navigator.userAgent,
      screenSize: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language
    };
  }

  /**
   * Get current user profile
   */
  getProfile(): UserProfile | null {
    return this.currentProfile;
  }

  /**
   * Track a new user interaction
   */
  trackInteraction(interaction: Omit<UserInteraction, 'timestamp'>): void {
    if (!this.currentProfile) return;

    const fullInteraction: UserInteraction = {
      ...interaction,
      timestamp: new Date().toISOString()
    };

    this.currentProfile.interactions.push(fullInteraction);
    
    // Update behavior tracking
    this.updateBehaviorTracking();
    
    // Infer preferences from interactions
    this.inferPreferencesFromInteraction(fullInteraction);
    
    this.updateLastActive();
    this.saveProfile();

    // Log to analytics
    logToAirtable('user_interactions', {
      userId: this.currentProfile.id,
      ...fullInteraction
    });
  }

  /**
   * Update behavior tracking metrics
   */
  private updateBehaviorTracking(): void {
    if (!this.currentProfile) return;

    const interactions = this.currentProfile.interactions;
    const currentHour = new Date().getHours();
    
    // Update session count (simplified - count interactions in last 30 mins as same session)
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const recentInteractions = interactions.filter(i => i.timestamp > thirtyMinsAgo);
    
    if (recentInteractions.length === 1) {
      this.currentProfile.behaviorTracking.sessionCount += 1;
    }

    // Track active hours
    if (!this.currentProfile.behaviorTracking.mostActiveHours.includes(currentHour)) {
      this.currentProfile.behaviorTracking.mostActiveHours.push(currentHour);
    }

    // Track frequent queries
    const lastQuery = interactions[interactions.length - 1]?.userMessage.toLowerCase();
    if (lastQuery && lastQuery.length > 5) {
      this.currentProfile.behaviorTracking.frequentQueries.push(lastQuery);
      // Keep only last 50 queries to prevent memory bloat
      if (this.currentProfile.behaviorTracking.frequentQueries.length > 50) {
        this.currentProfile.behaviorTracking.frequentQueries = 
          this.currentProfile.behaviorTracking.frequentQueries.slice(-50);
      }
    }
  }

  /**
   * Infer user preferences from their interactions
   */
  private inferPreferencesFromInteraction(interaction: UserInteraction): void {
    if (!this.currentProfile) return;

    const message = interaction.userMessage.toLowerCase();
    
    // Infer dietary restrictions
    const dietaryKeywords = {
      'vegetarian': ['vegetarian', 'veggie', 'no meat'],
      'vegan': ['vegan', 'plant-based'],
      'gluten-free': ['gluten free', 'celiac', 'no gluten'],
      'dairy-free': ['dairy free', 'lactose intolerant', 'no dairy'],
      'keto': ['keto', 'ketogenic', 'low carb'],
      'halal': ['halal'],
      'kosher': ['kosher']
    };

    Object.entries(dietaryKeywords).forEach(([restriction, keywords]) => {
      if (keywords.some(keyword => message.includes(keyword))) {
        if (!this.currentProfile!.preferences.dietaryRestrictions.includes(restriction)) {
          this.currentProfile!.preferences.dietaryRestrictions.push(restriction);
        }
      }
    });

    // Infer cuisine preferences
    const cuisineKeywords = {
      'italian': ['italian', 'pasta', 'pizza', 'risotto'],
      'chinese': ['chinese', 'dim sum', 'fried rice', 'noodles'],
      'mexican': ['mexican', 'tacos', 'burrito', 'salsa'],
      'indian': ['indian', 'curry', 'biryani', 'naan'],
      'japanese': ['japanese', 'sushi', 'ramen', 'tempura'],
      'thai': ['thai', 'pad thai', 'tom yum', 'green curry'],
      'american': ['burger', 'bbq', 'steak', 'fries']
    };

    Object.entries(cuisineKeywords).forEach(([cuisine, keywords]) => {
      const matches = keywords.filter(keyword => message.includes(keyword)).length;
      if (matches > 0) {
        const current = this.currentProfile!.inferredData.cuisineAffinity[cuisine] || 0;
        this.currentProfile!.inferredData.cuisineAffinity[cuisine] = current + matches;
      }
    });

    // Infer budget preferences
    const budgetKeywords = {
      'budget': ['cheap', 'affordable', 'budget', 'under $15'],
      'moderate': ['reasonable', 'moderate', '$15-30'],
      'upscale': ['nice', 'upscale', 'fancy', '$30-50'],
      'luxury': ['expensive', 'luxury', 'fine dining', 'over $50']
    };

    Object.entries(budgetKeywords).forEach(([budget, keywords]) => {
      const matches = keywords.filter(keyword => message.includes(keyword)).length;
      if (matches > 0) {
        const current = this.currentProfile!.inferredData.pricePreferences[budget] || 0;
        this.currentProfile!.inferredData.pricePreferences[budget] = current + matches;
      }
    });

    // Infer spice preferences
    if (message.includes('spicy') || message.includes('hot')) {
      this.currentProfile.preferences.spiceLevel = 'hot';
    } else if (message.includes('mild') || message.includes('not spicy')) {
      this.currentProfile.preferences.spiceLevel = 'mild';
    }
  }

  /**
   * Get personalized greeting based on user profile
   */
  getPersonalizedGreeting(chatType: string): string {
    if (!this.currentProfile) return '';

    const profile = this.currentProfile;
    const hour = new Date().getHours();
    const isReturningUser = profile.interactions.length > 5;
    const favoriteTime = this.getMostCommonInteractionTime();
    const topCuisine = this.getTopCuisine();

    let greeting = '';

    if (isReturningUser) {
      if (hour !== favoriteTime && Math.abs(hour - favoriteTime) > 2) {
        greeting += `You're here earlier/later than usual (you typically ask around ${favoriteTime}:00). `;
      }
      
      if (topCuisine) {
        greeting += `I noticed you really seem to enjoy ${topCuisine} food. `;
      }

      if (profile.behaviorTracking.sessionCount > 10) {
        greeting += `Welcome back! This is your ${profile.behaviorTracking.sessionCount}th time using FUD Buddy. `;
      }
    }

    // Add location-based creepiness if we detect patterns
    if (profile.inferredData.locationPatterns.length > 0) {
      greeting += `I see you're in your usual area. `;
    }

    return greeting;
  }

  /**
   * Get most common interaction time
   */
  private getMostCommonInteractionTime(): number {
    if (!this.currentProfile) return new Date().getHours();

    const hours = this.currentProfile.interactions.map(i => 
      new Date(i.timestamp).getHours()
    );

    const hourCounts = hours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return parseInt(Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || String(new Date().getHours()));
  }

  /**
   * Get top cuisine preference
   */
  private getTopCuisine(): string | null {
    if (!this.currentProfile) return null;

    const cuisines = this.currentProfile.inferredData.cuisineAffinity;
    const entries = Object.entries(cuisines);
    
    if (entries.length === 0) return null;
    
    return entries.sort(([,a], [,b]) => b - a)[0][0];
  }

  /**
   * Update preferences explicitly
   */
  updatePreferences(preferences: Partial<UserPreferences>): void {
    if (!this.currentProfile) return;

    this.currentProfile.preferences = {
      ...this.currentProfile.preferences,
      ...preferences
    };

    this.saveProfile();
  }

  /**
   * Track user satisfaction with recommendations
   */
  trackSatisfaction(interactionIndex: number, satisfaction: 'thumbs-up' | 'thumbs-down'): void {
    if (!this.currentProfile || !this.currentProfile.interactions[interactionIndex]) return;

    this.currentProfile.interactions[interactionIndex].satisfaction = satisfaction;
    this.saveProfile();

    // Log to analytics
    logToAirtable('satisfaction_feedback', {
      userId: this.currentProfile.id,
      interactionId: interactionIndex,
      satisfaction,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get personalization context for AI with martech enhancement
   */
  async getPersonalizationContext(): Promise<string> {
    if (!this.currentProfile) return '';

    const profile = this.currentProfile;
    const context = [];

    // Get enhanced martech profile data
    let martechContext = '';
    try {
      const fbp = this.getPixelId('facebook');
      if (fbp) {
        martechContext = martechProfileService.getEnhancedPersonalizationContext(fbp);
      }
    } catch (error) {
      console.warn('Failed to get martech context:', error);
    }

    // Add martech context first (higher priority)
    if (martechContext) {
      context.push(martechContext);
    }

    // Add dietary restrictions
    if (profile.preferences.dietaryRestrictions.length > 0) {
      context.push(`User has dietary restrictions: ${profile.preferences.dietaryRestrictions.join(', ')}`);
    }

    // Add cuisine preferences
    const topCuisines = Object.entries(profile.inferredData.cuisineAffinity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([cuisine]) => cuisine);
    
    if (topCuisines.length > 0) {
      context.push(`User seems to prefer: ${topCuisines.join(', ')} cuisine`);
    }

    // Add budget preferences
    const budgetPref = Object.entries(profile.inferredData.pricePreferences)
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    
    if (budgetPref) {
      context.push(`User typically prefers ${budgetPref} dining options`);
    }

    // Add behavioral insights
    if (profile.behaviorTracking.sessionCount > 5) {
      context.push(`This is a returning user (${profile.behaviorTracking.sessionCount} sessions)`);
    }

    const timePattern = this.getMostCommonInteractionTime();
    context.push(`User typically asks for food recommendations around ${timePattern}:00`);

    return context.join('. ') + '.';
  }

  /**
   * Get martech-enhanced personalized greeting
   */
  async getEnhancedPersonalizedGreeting(chatType: string): Promise<string> {
    const baseGreeting = this.getPersonalizedGreeting(chatType);
    
    try {
      const fbp = this.getPixelId('facebook');
      if (fbp) {
        const enrichedProfile = await martechProfileService.enrichUserProfile(fbp);
        if (enrichedProfile.confidence_score > 0.5) {
          return this.buildMartechGreeting(enrichedProfile, chatType, baseGreeting);
        }
      }
    } catch (error) {
      console.warn('Failed to get enhanced greeting:', error);
    }
    
    return baseGreeting;
  }

  /**
   * Build greeting using martech profile data
   */
  private buildMartechGreeting(profile: EnrichedUserProfile, chatType: string, fallback: string): string {
    const insights = profile.derived_insights;
    const segments = profile.personalization_segments;
    
    let greeting = '';
    
    // High-confidence personalization
    if (profile.confidence_score > 0.8) {
      if (insights.dining_personality === 'foodie' && segments.includes('high_value_customer')) {
        greeting = `I can tell you have excellent taste in food experiences. `;
      } else if (insights.dining_personality === 'adventurous') {
        greeting = `You strike me as someone who loves trying new culinary adventures. `;
      } else if (insights.price_sensitivity === 'high' && insights.dining_personality === 'budget_minded') {
        greeting = `I've noticed you appreciate great value in your dining choices. `;
      }
      
      // Social influence indicators
      if (insights.social_influence === 'high') {
        greeting += `Your friends probably ask you for restaurant recommendations. `;
      }
      
      // Timing patterns
      if (insights.optimal_engagement_times.length > 0) {
        const currentHour = new Date().getHours();
        const optimalHour = insights.optimal_engagement_times[0];
        if (Math.abs(currentHour - parseInt(optimalHour)) < 2) {
          greeting += `Perfect timing - you're usually most active around now. `;
        }
      }
    }
    
    return greeting || fallback;
  }

  /**
   * Get pixel ID for martech integration
   */
  private getPixelId(provider: 'facebook' | 'google'): string | null {
    try {
      if (provider === 'facebook') {
        const fbp = this.getCookie('_fbp');
        return fbp || null;
      } else if (provider === 'google') {
        const ga = this.getCookie('_ga');
        if (ga) {
          const parts = ga.split('.');
          return parts.length >= 4 ? `${parts[2]}.${parts[3]}` : null;
        }
      }
    } catch (error) {
      console.warn(`Failed to get ${provider} pixel ID:`, error);
    }
    return null;
  }

  /**
   * Get cookie value
   */
  private getCookie(name: string): string | undefined {
    if (typeof document === 'undefined') return undefined;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : undefined;
  }

  /**
   * Update last active timestamp
   */
  private updateLastActive(): void {
    if (this.currentProfile) {
      this.currentProfile.lastActive = new Date().toISOString();
    }
  }

  /**
   * Save profile to localStorage
   */
  private saveProfile(): void {
    if (this.currentProfile) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentProfile));
      } catch (error) {
        console.error('Failed to save user profile:', error);
      }
    }
  }

  /**
   * Clear user profile (for privacy/testing)
   */
  clearProfile(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.ANONYMOUS_ID_KEY);
    this.currentProfile = null;
    this.createNewProfile();
  }

  /**
   * Export user data (for GDPR compliance)
   */
  exportUserData(): UserProfile | null {
    return this.currentProfile ? JSON.parse(JSON.stringify(this.currentProfile)) : null;
  }
}

// Export singleton instance
export const userProfileService = new UserProfileService();