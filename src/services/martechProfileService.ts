import { logToAirtable } from "@/utils/airtable";
import { analyticsService } from "./analyticsService";
import { userProfileService } from "./userProfileService";

export interface FacebookPixelData {
  fbp?: string; // Facebook browser ID
  fbc?: string; // Facebook click ID
  demographics?: {
    age_range?: string;
    gender?: string;
    interests?: string[];
    behaviors?: string[];
    location?: {
      country?: string;
      region?: string;
      city?: string;
    };
  };
  customAudiences?: string[];
  lookalikeSources?: string[];
  recentPurchases?: PurchaseEvent[];
  websiteActivity?: FacebookEvent[];
}

export interface GoogleAnalyticsData {
  ga_client_id?: string;
  ga_session_id?: string;
  demographics?: {
    age?: string;
    gender?: string;
    interests?: string[];
    affinity_categories?: string[];
    in_market_segments?: string[];
  };
  behavior?: {
    sessions_count: number;
    avg_session_duration: number;
    bounce_rate: number;
    pages_per_session: number;
    returning_visitor: boolean;
  };
  acquisition?: {
    source?: string;
    medium?: string;
    campaign?: string;
    keywords?: string[];
  };
  ecommerce?: {
    transactions: number;
    revenue: number;
    avg_order_value: number;
    products_purchased: string[];
  };
}

export interface PurchaseEvent {
  timestamp: string;
  category: string;
  product_name?: string;
  value: number;
  currency: string;
}

export interface FacebookEvent {
  event_name: string;
  timestamp: string;
  parameters: Record<string, any>;
}

export interface ThirdPartyData {
  // Data enrichment services
  clearbit?: {
    company?: string;
    job_title?: string;
    industry?: string;
    company_size?: string;
    technology_stack?: string[];
  };
  
  // Email/Phone enrichment
  fullcontact?: {
    social_profiles?: SocialProfile[];
    demographics?: {
      age_range?: string;
      gender?: string;
      location?: string;
    };
    interests?: string[];
  };
  
  // Purchase intent data
  bombora?: {
    intent_topics?: IntentTopic[];
    company_surge_score?: number;
  };
  
  // Location intelligence
  foursquare?: {
    frequent_venues?: VenueVisit[];
    venue_preferences?: string[];
    mobility_patterns?: MobilityPattern[];
  };
}

export interface SocialProfile {
  network: string;
  url: string;
  followers?: number;
  following?: number;
  bio?: string;
}

export interface IntentTopic {
  topic: string;
  score: number;
  surge_days: number;
}

export interface VenueVisit {
  venue_name: string;
  category: string;
  frequency: number;
  last_visit: string;
  avg_spend?: number;
}

export interface MobilityPattern {
  pattern_type: 'work' | 'home' | 'leisure' | 'dining';
  locations: string[];
  times: string[];
  frequency: number;
}

export interface EnrichedUserProfile {
  pixel_id: string;
  enrichment_timestamp: string;
  facebook_data?: FacebookPixelData;
  google_data?: GoogleAnalyticsData;
  third_party_data?: ThirdPartyData;
  derived_insights: DerivedInsights;
  confidence_score: number; // 0-1 based on data quality
  personalization_segments: string[];
}

export interface DerivedInsights {
  // Food & dining insights
  dining_personality: 'foodie' | 'convenience' | 'health-conscious' | 'budget-minded' | 'adventurous';
  preferred_cuisines: CuisinePreference[];
  dining_occasions: DiningOccasion[];
  price_sensitivity: 'low' | 'medium' | 'high';
  
  // Lifestyle insights
  lifestyle_segments: string[];
  purchase_power: 'low' | 'medium' | 'high' | 'premium';
  social_influence: 'low' | 'medium' | 'high';
  tech_adoption: 'laggard' | 'majority' | 'early-adopter' | 'innovator';
  
  // Behavioral patterns
  decision_making_style: 'impulsive' | 'research-heavy' | 'social-influenced' | 'brand-loyal';
  content_preferences: string[];
  optimal_engagement_times: string[];
  
  // Predictive scores
  churn_risk: number; // 0-1
  lifetime_value_estimate: number;
  recommendation_acceptance_rate: number;
}

export interface CuisinePreference {
  cuisine: string;
  affinity_score: number; // 0-1
  confidence: number; // 0-1
  data_sources: string[];
}

export interface DiningOccasion {
  occasion: string;
  frequency: number;
  typical_spend: number;
  party_size: number;
}

class MarTechProfileService {
  private enrichedProfiles: Map<string, EnrichedUserProfile> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Enrich user profile using pixel data and martech tools
   */
  async enrichUserProfile(pixelId: string): Promise<EnrichedUserProfile> {
    try {
      // Check cache first
      const cached = this.enrichedProfiles.get(pixelId);
      if (cached && this.isCacheValid(cached)) {
        return cached;
      }

      console.log(`Enriching user profile for pixel ID: ${pixelId}`);

      // Collect data from various sources
      const facebookData = await this.collectFacebookPixelData(pixelId);
      const googleData = await this.collectGoogleAnalyticsData();
      const thirdPartyData = await this.collectThirdPartyData(pixelId);

      // Derive insights from collected data
      const derivedInsights = this.deriveInsights(facebookData, googleData, thirdPartyData);
      
      // Calculate confidence score
      const confidenceScore = this.calculateConfidenceScore(facebookData, googleData, thirdPartyData);
      
      // Generate personalization segments
      const segments = this.generatePersonalizationSegments(derivedInsights);

      const enrichedProfile: EnrichedUserProfile = {
        pixel_id: pixelId,
        enrichment_timestamp: new Date().toISOString(),
        facebook_data: facebookData,
        google_data: googleData,
        third_party_data: thirdPartyData,
        derived_insights: derivedInsights,
        confidence_score: confidenceScore,
        personalization_segments: segments
      };

      // Cache the enriched profile
      this.enrichedProfiles.set(pixelId, enrichedProfile);

      // Log enrichment event
      logToAirtable('profile_enrichment', {
        pixel_id: pixelId,
        confidence_score: confidenceScore,
        segments: segments,
        data_sources: this.getDataSources(facebookData, googleData, thirdPartyData),
        timestamp: new Date().toISOString()
      });

      return enrichedProfile;

    } catch (error) {
      console.error('Profile enrichment failed:', error);
      return this.createBasicProfile(pixelId);
    }
  }

  /**
   * Collect Facebook Pixel data
   */
  private async collectFacebookPixelData(pixelId: string): Promise<FacebookPixelData | undefined> {
    try {
      // In production, this would use Facebook's Conversions API or Graph API
      // For now, we'll extract available pixel data from the browser
      
      const fbp = this.extractFBP();
      const fbc = this.extractFBC();
      
      // Mock demographic data that would come from Facebook's API
      const mockDemographics = this.generateMockFacebookDemographics();
      
      // Collect recent Facebook events from dataLayer
      const websiteActivity = this.collectFacebookEvents();

      if (fbp || fbc || websiteActivity.length > 0) {
        return {
          fbp,
          fbc,
          demographics: mockDemographics,
          websiteActivity,
          // Mock data that would come from Facebook's API
          customAudiences: this.inferCustomAudiences(mockDemographics),
          lookalikeSources: ['food_enthusiasts', 'restaurant_goers'],
          recentPurchases: this.extractPurchaseEvents()
        };
      }
    } catch (error) {
      console.warn('Facebook pixel data collection failed:', error);
    }
    return undefined;
  }

  /**
   * Extract Facebook Browser ID (FBP) from cookies
   */
  private extractFBP(): string | undefined {
    if (typeof document === 'undefined') return undefined;
    
    const fbpMatch = document.cookie.match(/(?:^|; )_fbp=([^;]*)/);
    return fbpMatch ? decodeURIComponent(fbpMatch[1]) : undefined;
  }

  /**
   * Extract Facebook Click ID (FBC) from URL or cookies
   */
  private extractFBC(): string | undefined {
    if (typeof document === 'undefined') return undefined;
    
    // Check URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const fbclid = urlParams.get('fbclid');
    if (fbclid) {
      return `fb.1.${Date.now()}.${fbclid}`;
    }
    
    // Check cookies
    const fbcMatch = document.cookie.match(/(?:^|; )_fbc=([^;]*)/);
    return fbcMatch ? decodeURIComponent(fbcMatch[1]) : undefined;
  }

  /**
   * Generate mock Facebook demographics (in production, from API)
   */
  private generateMockFacebookDemographics(): FacebookPixelData['demographics'] {
    // This would come from Facebook's demographic APIs in production
    // For now, we'll use intelligent mocking based on available signals
    
    const timeOfDay = new Date().getHours();
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    
    return {
      age_range: this.inferAgeRange(timeOfDay, userAgent),
      interests: this.inferFacebookInterests(),
      behaviors: ['Food and dining', 'Frequent restaurant goers', 'Online food delivery users'],
      location: {
        country: 'US',
        region: this.inferRegionFromTimezone(),
        city: 'Unknown'
      }
    };
  }

  /**
   * Collect Google Analytics data
   */
  private async collectGoogleAnalyticsData(): Promise<GoogleAnalyticsData | undefined> {
    try {
      // Extract GA client ID from cookies or gtag
      const gaClientId = this.extractGAClientId();
      
      if (gaClientId) {
        return {
          ga_client_id: gaClientId,
          ga_session_id: this.generateSessionId(),
          demographics: await this.getGADemographics(),
          behavior: this.getGABehavior(),
          acquisition: this.getGAAcquisition(),
          ecommerce: this.getGAEcommerce()
        };
      }
    } catch (error) {
      console.warn('Google Analytics data collection failed:', error);
    }
    return undefined;
  }

  /**
   * Extract Google Analytics Client ID
   */
  private extractGAClientId(): string | undefined {
    if (typeof document === 'undefined') return undefined;
    
    // Try GA4 cookie first
    const ga4Match = document.cookie.match(/(?:^|; )_ga=([^;]*)/);
    if (ga4Match) {
      const parts = decodeURIComponent(ga4Match[1]).split('.');
      if (parts.length >= 4) {
        return `${parts[2]}.${parts[3]}`;
      }
    }
    
    return undefined;
  }

  /**
   * Collect third-party enrichment data
   */
  private async collectThirdPartyData(pixelId: string): Promise<ThirdPartyData | undefined> {
    try {
      // In production, these would be real API calls
      const data: ThirdPartyData = {};
      
      // Mock Clearbit-style company enrichment
      if (this.shouldEnrichWithCompanyData()) {
        data.clearbit = await this.mockClearbitEnrichment();
      }
      
      // Mock location intelligence
      data.foursquare = await this.mockFoursquareData();
      
      // Mock purchase intent data
      data.bombora = this.mockBomboraData();
      
      return Object.keys(data).length > 0 ? data : undefined;
    } catch (error) {
      console.warn('Third-party data collection failed:', error);
    }
    return undefined;
  }

  /**
   * Derive insights from collected data
   */
  private deriveInsights(
    facebookData?: FacebookPixelData,
    googleData?: GoogleAnalyticsData,
    thirdPartyData?: ThirdPartyData
  ): DerivedInsights {
    return {
      dining_personality: this.inferDiningPersonality(facebookData, googleData, thirdPartyData),
      preferred_cuisines: this.inferCuisinePreferences(facebookData, thirdPartyData),
      dining_occasions: this.inferDiningOccasions(facebookData, googleData),
      price_sensitivity: this.inferPriceSensitivity(facebookData, googleData, thirdPartyData),
      lifestyle_segments: this.inferLifestyleSegments(facebookData, googleData, thirdPartyData),
      purchase_power: this.inferPurchasePower(facebookData, googleData, thirdPartyData),
      social_influence: this.inferSocialInfluence(facebookData, thirdPartyData),
      tech_adoption: this.inferTechAdoption(googleData, thirdPartyData),
      decision_making_style: this.inferDecisionMakingStyle(facebookData, googleData),
      content_preferences: this.inferContentPreferences(facebookData, googleData),
      optimal_engagement_times: this.inferOptimalTimes(facebookData, googleData),
      churn_risk: this.calculateChurnRisk(googleData),
      lifetime_value_estimate: this.estimateLifetimeValue(facebookData, googleData, thirdPartyData),
      recommendation_acceptance_rate: this.estimateRecommendationAcceptance(facebookData, googleData)
    };
  }

  /**
   * Infer dining personality from multiple data sources
   */
  private inferDiningPersonality(
    facebookData?: FacebookPixelData,
    googleData?: GoogleAnalyticsData,
    thirdPartyData?: ThirdPartyData
  ): DerivedInsights['dining_personality'] {
    let score = {
      foodie: 0,
      convenience: 0,
      health_conscious: 0,
      budget_minded: 0,
      adventurous: 0
    };

    // Facebook interests analysis
    if (facebookData?.demographics?.interests) {
      facebookData.demographics.interests.forEach(interest => {
        if (interest.toLowerCase().includes('gourmet') || interest.toLowerCase().includes('fine dining')) {
          score.foodie += 3;
        }
        if (interest.toLowerCase().includes('fast food') || interest.toLowerCase().includes('delivery')) {
          score.convenience += 2;
        }
        if (interest.toLowerCase().includes('healthy') || interest.toLowerCase().includes('organic')) {
          score.health_conscious += 3;
        }
        if (interest.toLowerCase().includes('deals') || interest.toLowerCase().includes('coupons')) {
          score.budget_minded += 2;
        }
        if (interest.toLowerCase().includes('travel') || interest.toLowerCase().includes('exotic')) {
          score.adventurous += 2;
        }
      });
    }

    // Foursquare venue analysis
    if (thirdPartyData?.foursquare?.frequent_venues) {
      thirdPartyData.foursquare.frequent_venues.forEach(venue => {
        if (venue.category.includes('Fine Dining') || venue.category.includes('Wine Bar')) {
          score.foodie += 2;
        }
        if (venue.category.includes('Fast Food') || venue.category.includes('Chain')) {
          score.convenience += 1;
        }
        if (venue.category.includes('Juice Bar') || venue.category.includes('Salad')) {
          score.health_conscious += 2;
        }
        if (venue.avg_spend && venue.avg_spend < 15) {
          score.budget_minded += 1;
        }
        if (venue.category.includes('Ethnic') || venue.category.includes('Fusion')) {
          score.adventurous += 2;
        }
      });
    }

    // Return the highest scoring personality
    const maxScore = Math.max(...Object.values(score));
    const personality = Object.entries(score).find(([_, value]) => value === maxScore)?.[0] as DerivedInsights['dining_personality'];
    return personality || 'convenience';
  }

  /**
   * Generate personalization segments
   */
  private generatePersonalizationSegments(insights: DerivedInsights): string[] {
    const segments: string[] = [];

    // Dining personality segments
    segments.push(`dining_${insights.dining_personality}`);
    
    // Price sensitivity segments
    segments.push(`price_${insights.price_sensitivity}`);
    
    // Purchase power segments
    segments.push(`purchase_power_${insights.purchase_power}`);
    
    // Lifestyle segments
    segments.push(...insights.lifestyle_segments);
    
    // High-value segments
    if (insights.lifetime_value_estimate > 1000) {
      segments.push('high_value_customer');
    }
    
    if (insights.recommendation_acceptance_rate > 0.7) {
      segments.push('recommendation_friendly');
    }
    
    if (insights.churn_risk < 0.3) {
      segments.push('loyal_user');
    }
    
    if (insights.social_influence === 'high') {
      segments.push('influencer');
    }

    return segments;
  }

  /**
   * Get enhanced personalization context for AI
   */
  getEnhancedPersonalizationContext(pixelId: string): string {
    const profile = this.enrichedProfiles.get(pixelId);
    if (!profile) {
      return '';
    }

    const context = [];
    const insights = profile.derived_insights;

    // Dining personality context
    context.push(`User is a ${insights.dining_personality} diner`);

    // Cuisine preferences
    if (insights.preferred_cuisines.length > 0) {
      const topCuisines = insights.preferred_cuisines
        .sort((a, b) => b.affinity_score - a.affinity_score)
        .slice(0, 3)
        .map(c => c.cuisine);
      context.push(`Strong preferences for: ${topCuisines.join(', ')}`);
    }

    // Price sensitivity
    context.push(`Price sensitivity: ${insights.price_sensitivity}`);

    // Lifestyle segments
    if (insights.lifestyle_segments.length > 0) {
      context.push(`Lifestyle: ${insights.lifestyle_segments.join(', ')}`);
    }

    // Behavioral insights
    context.push(`Decision making style: ${insights.decision_making_style}`);
    
    if (insights.optimal_engagement_times.length > 0) {
      context.push(`Most active: ${insights.optimal_engagement_times.join(', ')}`);
    }

    // High-value indicators
    if (insights.social_influence === 'high') {
      context.push('High social influence - recommendations may be shared');
    }

    if (insights.recommendation_acceptance_rate > 0.7) {
      context.push('Typically accepts recommendations - confidence in suggestions');
    }

    return context.join('. ') + '.';
  }

  // Helper methods for data inference (simplified versions)
  private inferAgeRange(timeOfDay: number, userAgent: string): string {
    // Simple heuristics - would be more sophisticated in production
    if (timeOfDay >= 9 && timeOfDay <= 17) {
      return '25-34'; // Working hours suggest working age
    }
    return '18-65';
  }

  private inferFacebookInterests(): string[] {
    return ['Food and dining', 'Restaurants', 'Cooking', 'Food delivery'];
  }

  private inferRegionFromTimezone(): string {
    if (typeof Intl !== 'undefined') {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timezone.includes('New_York') || timezone.includes('Eastern')) return 'NY';
      if (timezone.includes('Chicago') || timezone.includes('Central')) return 'IL';
      if (timezone.includes('Denver') || timezone.includes('Mountain')) return 'CO';
      if (timezone.includes('Los_Angeles') || timezone.includes('Pacific')) return 'CA';
    }
    return 'Unknown';
  }

  private generateSessionId(): string {
    return `${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;
  }

  // Mock methods for demonstration (would be real API calls in production)
  private async getGADemographics(): Promise<GoogleAnalyticsData['demographics']> {
    return {
      interests: ['Food & Drink', 'Cooking & Recipes', 'Restaurant Reviews'],
      affinity_categories: ['Food Lovers', 'Cooking Enthusiasts'],
      in_market_segments: ['Restaurant & Food Services']
    };
  }

  private getGABehavior(): GoogleAnalyticsData['behavior'] {
    return {
      sessions_count: Math.floor(Math.random() * 20) + 5,
      avg_session_duration: Math.floor(Math.random() * 300) + 60,
      bounce_rate: Math.random() * 0.5 + 0.2,
      pages_per_session: Math.random() * 3 + 1,
      returning_visitor: Math.random() > 0.3
    };
  }

  private getGAAcquisition(): GoogleAnalyticsData['acquisition'] {
    const sources = ['google', 'facebook', 'instagram', 'direct', 'email'];
    return {
      source: sources[Math.floor(Math.random() * sources.length)],
      medium: 'organic',
      keywords: ['restaurants near me', 'food delivery', 'best pizza']
    };
  }

  private getGAEcommerce(): GoogleAnalyticsData['ecommerce'] {
    return {
      transactions: Math.floor(Math.random() * 10),
      revenue: Math.random() * 500 + 50,
      avg_order_value: Math.random() * 50 + 25,
      products_purchased: ['Food Delivery', 'Restaurant Reservation']
    };
  }

  // Additional helper methods would continue here...
  private collectFacebookEvents(): FacebookEvent[] { return []; }
  private inferCustomAudiences(demographics: any): string[] { return []; }
  private extractPurchaseEvents(): PurchaseEvent[] { return []; }
  private shouldEnrichWithCompanyData(): boolean { return false; }
  private async mockClearbitEnrichment(): Promise<any> { return {}; }
  private async mockFoursquareData(): Promise<any> { return {}; }
  private mockBomboraData(): any { return {}; }
  
  // Inference methods would continue with similar implementations...
  private inferCuisinePreferences(): CuisinePreference[] { return []; }
  private inferDiningOccasions(): DiningOccasion[] { return []; }
  private inferPriceSensitivity(): 'low' | 'medium' | 'high' { return 'medium'; }
  private inferLifestyleSegments(): string[] { return []; }
  private inferPurchasePower(): 'low' | 'medium' | 'high' | 'premium' { return 'medium'; }
  private inferSocialInfluence(): 'low' | 'medium' | 'high' { return 'medium'; }
  private inferTechAdoption(): 'laggard' | 'majority' | 'early-adopter' | 'innovator' { return 'majority'; }
  private inferDecisionMakingStyle(): 'impulsive' | 'research-heavy' | 'social-influenced' | 'brand-loyal' { return 'research-heavy'; }
  private inferContentPreferences(): string[] { return []; }
  private inferOptimalTimes(): string[] { return []; }
  private calculateChurnRisk(): number { return Math.random() * 0.5; }
  private estimateLifetimeValue(): number { return Math.random() * 2000 + 500; }
  private estimateRecommendationAcceptance(): number { return Math.random() * 0.5 + 0.5; }

  private calculateConfidenceScore(fb?: FacebookPixelData, ga?: GoogleAnalyticsData, tp?: ThirdPartyData): number {
    let score = 0;
    if (fb) score += 0.4;
    if (ga) score += 0.4;
    if (tp) score += 0.2;
    return Math.min(score, 1);
  }

  private getDataSources(fb?: FacebookPixelData, ga?: GoogleAnalyticsData, tp?: ThirdPartyData): string[] {
    const sources = [];
    if (fb) sources.push('facebook');
    if (ga) sources.push('google');
    if (tp) sources.push('third_party');
    return sources;
  }

  private isCacheValid(profile: EnrichedUserProfile): boolean {
    return Date.now() - new Date(profile.enrichment_timestamp).getTime() < this.CACHE_DURATION;
  }

  private createBasicProfile(pixelId: string): EnrichedUserProfile {
    return {
      pixel_id: pixelId,
      enrichment_timestamp: new Date().toISOString(),
      derived_insights: {
        dining_personality: 'convenience',
        preferred_cuisines: [],
        dining_occasions: [],
        price_sensitivity: 'medium',
        lifestyle_segments: [],
        purchase_power: 'medium',
        social_influence: 'medium',
        tech_adoption: 'majority',
        decision_making_style: 'research-heavy',
        content_preferences: [],
        optimal_engagement_times: [],
        churn_risk: 0.5,
        lifetime_value_estimate: 500,
        recommendation_acceptance_rate: 0.5
      },
      confidence_score: 0.1,
      personalization_segments: ['basic_user']
    };
  }
}

export const martechProfileService = new MarTechProfileService();