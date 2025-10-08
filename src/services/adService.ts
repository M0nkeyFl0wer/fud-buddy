import { logToAirtable } from "@/utils/airtable";
import { userProfileService } from "./userProfileService";
import { locationService, LocationData } from "./locationService";
import { analyticsService } from "./analyticsService";

export interface TargetedAd {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  clickUrl: string;
  category: 'restaurant' | 'food-delivery' | 'cooking' | 'lifestyle';
  targetingReason: string;
  provider: 'google-ads' | 'facebook-ads' | 'custom';
  impressionId: string;
}

export interface AdConfiguration {
  googleAdSenseId?: string;
  facebookAdsId?: string;
  customAdEndpoint?: string;
  enableTargeting: boolean;
  maxAdsPerPage: number;
  adRefreshInterval: number; // in milliseconds
}

class AdService {
  private readonly STORAGE_KEY = 'fud-buddy-ad-config';
  private config: AdConfiguration;
  private displayedAds: TargetedAd[] = [];

  constructor() {
    this.config = this.loadConfiguration();
  }

  /**
   * Load ad configuration from storage or use defaults
   */
  private loadConfiguration(): AdConfiguration {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return { ...this.getDefaultConfig(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load ad configuration:', error);
    }
    return this.getDefaultConfig();
  }

  /**
   * Get default ad configuration
   */
  private getDefaultConfig(): AdConfiguration {
    return {
      enableTargeting: true,
      maxAdsPerPage: 3,
      adRefreshInterval: 60000, // 1 minute
    };
  }

  /**
   * Update ad configuration
   */
  updateConfiguration(newConfig: Partial<AdConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save ad configuration:', error);
    }
  }

  /**
   * Get targeted ads based on user profile and current context
   */
  async getTargetedAds(context?: {
    chatType?: string;
    restaurantMentioned?: string;
    cuisineType?: string;
    currentPage?: string;
  }): Promise<TargetedAd[]> {
    try {
      if (!this.config.enableTargeting) {
        return this.getGenericAds();
      }

      const userProfile = userProfileService.getProfile();
      let userLocation: LocationData | null = null;
      
      try {
        userLocation = await locationService.getCurrentLocation();
      } catch (error) {
        console.warn('Could not get location for ad targeting:', error);
      }

      // Build targeting parameters
      const targetingData = this.buildTargetingData(userProfile, userLocation, context);
      
      // Get ads based on targeting
      const ads = await this.fetchTargetedAds(targetingData);
      
      // Track ad impressions
      ads.forEach(ad => this.trackAdImpression(ad));
      
      this.displayedAds = ads;
      return ads;
      
    } catch (error) {
      console.error('Failed to get targeted ads:', error);
      return this.getGenericAds();
    }
  }

  /**
   * Build targeting data from user profile and context
   */
  private buildTargetingData(
    userProfile: any, 
    userLocation: LocationData | null, 
    context?: any
  ): Record<string, any> {
    const targeting: Record<string, any> = {};

    // Location targeting
    if (userLocation) {
      targeting.location = {
        city: userLocation.city,
        state: userLocation.state,
        country: userLocation.country
      };
    }

    // User preferences targeting
    if (userProfile) {
      targeting.demographics = {
        sessionCount: userProfile.behaviorTracking.sessionCount,
        mostActiveHours: userProfile.behaviorTracking.mostActiveHours,
        deviceInfo: userProfile.deviceInfo
      };

      // Cuisine preferences
      const topCuisines = Object.entries(userProfile.inferredData.cuisineAffinity || {})
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 3)
        .map(([cuisine]) => cuisine);
      
      if (topCuisines.length > 0) {
        targeting.cuisinePreferences = topCuisines;
      }

      // Budget preferences
      const budgetPreferences = Object.entries(userProfile.inferredData.pricePreferences || {})
        .sort(([,a], [,b]) => (b as number) - (a as number))[0];
      
      if (budgetPreferences) {
        targeting.budgetRange = budgetPreferences[0];
      }

      // Dietary restrictions
      if (userProfile.preferences.dietaryRestrictions.length > 0) {
        targeting.dietaryRestrictions = userProfile.preferences.dietaryRestrictions;
      }
    }

    // Context targeting
    if (context) {
      targeting.context = {
        chatType: context.chatType,
        restaurantMentioned: context.restaurantMentioned,
        cuisineType: context.cuisineType,
        currentPage: context.currentPage
      };
    }

    return targeting;
  }

  /**
   * Fetch targeted ads based on targeting data
   */
  private async fetchTargetedAds(targetingData: Record<string, any>): Promise<TargetedAd[]> {
    // In production, this would make calls to real ad networks
    // For now, we'll generate smart mock ads based on targeting data
    
    return this.generateMockTargetedAds(targetingData);
  }

  /**
   * Generate mock targeted ads based on targeting data
   */
  private generateMockTargetedAds(targetingData: Record<string, any>): TargetedAd[] {
    const ads: TargetedAd[] = [];
    const location = targetingData.location?.city || 'your area';
    const cuisinePrefs = targetingData.cuisinePreferences || [];
    const budgetRange = targetingData.budgetRange || 'moderate';
    const context = targetingData.context || {};
    
    // Restaurant recommendation ads
    if (context.chatType === 'whereToGo' || !context.chatType) {
      if (cuisinePrefs.includes('italian')) {
        ads.push({
          id: `ad_${Date.now()}_1`,
          title: `Authentic Italian in ${location}`,
          description: "Mama Rosa's just opened 2 blocks away. Fresh pasta made daily!",
          imageUrl: 'https://picsum.photos/seed/italian-restaurant/300/200',
          clickUrl: 'https://example.com/mama-rosas',
          category: 'restaurant',
          targetingReason: `Based on your love for Italian food`,
          provider: 'custom',
          impressionId: `imp_${Date.now()}_1`
        });
      }
      
      if (budgetRange === 'budget') {
        ads.push({
          id: `ad_${Date.now()}_2`,
          title: 'Happy Hour Specials',
          description: '$5 appetizers and half-price drinks at 3 local spots!',
          imageUrl: 'https://picsum.photos/seed/happy-hour/300/200',
          clickUrl: 'https://example.com/happy-hour-deals',
          category: 'restaurant',
          targetingReason: 'Perfect for your budget-friendly preferences',
          provider: 'facebook-ads',
          impressionId: `imp_${Date.now()}_2`
        });
      }
    }
    
    // Food delivery ads
    if (context.chatType === 'whatToOrder') {
      ads.push({
        id: `ad_${Date.now()}_3`,
        title: 'Skip the Line - Order Ahead',
        description: context.restaurantMentioned ? 
          `Order from ${context.restaurantMentioned} for pickup in 15 mins` :
          'Order ahead from 500+ local restaurants',
        imageUrl: 'https://picsum.photos/seed/food-delivery/300/200',
        clickUrl: 'https://example.com/order-ahead',
        category: 'food-delivery',
        targetingReason: 'Since you\'re deciding what to order',
        provider: 'google-ads',
        impressionId: `imp_${Date.now()}_3`
      });
    }
    
    // Cooking/lifestyle ads
    if (targetingData.demographics?.sessionCount > 5) {
      ads.push({
        id: `ad_${Date.now()}_4`,
        title: 'Master Chef Skills at Home',
        description: 'Learn to cook your favorite restaurant dishes with our online classes!',
        imageUrl: 'https://picsum.photos/seed/cooking-class/300/200',
        clickUrl: 'https://example.com/cooking-classes',
        category: 'cooking',
        targetingReason: 'For foodie enthusiasts like you',
        provider: 'custom',
        impressionId: `imp_${Date.now()}_4`
      });
    }
    
    // Location-specific ads
    if (location !== 'your area') {
      ads.push({
        id: `ad_${Date.now()}_5`,
        title: `${location} Food Festival`,
        description: 'This weekend: 50+ food vendors, live music, and cooking demos!',
        imageUrl: 'https://picsum.photos/seed/food-festival/300/200',
        clickUrl: 'https://example.com/food-festival',
        category: 'lifestyle',
        targetingReason: `Happening right in ${location}`,
        provider: 'facebook-ads',
        impressionId: `imp_${Date.now()}_5`
      });
    }
    
    // Return a maximum number of ads based on config
    return ads.slice(0, this.config.maxAdsPerPage);
  }

  /**
   * Get generic non-targeted ads
   */
  private getGenericAds(): TargetedAd[] {
    return [
      {
        id: `ad_generic_1`,
        title: 'Discover Great Food',
        description: 'Find amazing restaurants and hidden gems near you!',
        imageUrl: 'https://picsum.photos/seed/generic-food/300/200',
        clickUrl: 'https://example.com/discover',
        category: 'restaurant',
        targetingReason: 'General recommendation',
        provider: 'custom',
        impressionId: `imp_generic_1`
      }
    ];
  }

  /**
   * Track ad impression
   */
  private trackAdImpression(ad: TargetedAd): void {
    const userProfile = userProfileService.getProfile();
    
    // Log to internal analytics
    logToAirtable('ad_impressions', {
      userId: userProfile?.id,
      adId: ad.id,
      impressionId: ad.impressionId,
      category: ad.category,
      provider: ad.provider,
      targetingReason: ad.targetingReason,
      timestamp: new Date().toISOString()
    });
    
    // Track with analytics service
    analyticsService.trackEvent('ad_impression', {
      ad_id: ad.id,
      ad_category: ad.category,
      ad_provider: ad.provider,
      targeting_reason: ad.targetingReason
    });
  }

  /**
   * Track ad click
   */
  trackAdClick(adId: string): void {
    const ad = this.displayedAds.find(a => a.id === adId);
    if (!ad) return;
    
    const userProfile = userProfileService.getProfile();
    
    // Log to internal analytics
    logToAirtable('ad_clicks', {
      userId: userProfile?.id,
      adId: ad.id,
      impressionId: ad.impressionId,
      category: ad.category,
      provider: ad.provider,
      clickUrl: ad.clickUrl,
      timestamp: new Date().toISOString()
    });
    
    // Track with analytics service
    analyticsService.trackEvent('ad_click', {
      ad_id: ad.id,
      ad_category: ad.category,
      ad_provider: ad.provider,
      click_url: ad.clickUrl
    });
  }

  /**
   * Initialize third-party ad networks
   */
  initializeAdNetworks(): void {
    // Initialize Google AdSense if configured
    if (this.config.googleAdSenseId) {
      this.initializeGoogleAds();
    }
    
    // Initialize Facebook Ads if configured
    if (this.config.facebookAdsId) {
      this.initializeFacebookAds();
    }
  }

  /**
   * Initialize Google Ads
   */
  private initializeGoogleAds(): void {
    if ((window as any).adsbygoogle) return; // Already loaded
    
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${this.config.googleAdSenseId}`;
    script.crossOrigin = 'anonymous';
    
    document.head.appendChild(script);
    
    console.log('Google Ads initialized');
  }

  /**
   * Initialize Facebook Ads
   */
  private initializeFacebookAds(): void {
    if ((window as any).fbq) return; // Already loaded via analyticsService
    
    // Facebook ads would typically be handled through the pixel
    // which is already initialized in analyticsService
    console.log('Facebook Ads targeting enabled');
  }

  /**
   * Get ad performance statistics
   */
  getAdStats(): {
    totalImpressions: number;
    totalClicks: number;
    clickThroughRate: number;
    topPerformingCategory: string | null;
  } {
    // This would typically pull from analytics backend
    // For now, return mock data
    return {
      totalImpressions: 150,
      totalClicks: 12,
      clickThroughRate: 0.08,
      topPerformingCategory: 'restaurant'
    };
  }

  /**
   * Test different ad variations (A/B testing)
   */
  async testAdVariation(baseAd: TargetedAd, variations: Partial<TargetedAd>[]): Promise<TargetedAd> {
    // Simple A/B testing logic
    const random = Math.random();
    const variationIndex = Math.floor(random * (variations.length + 1));
    
    if (variationIndex < variations.length) {
      const variation = { ...baseAd, ...variations[variationIndex] };
      
      // Log A/B test participation
      logToAirtable('ab_test_ads', {
        baseAdId: baseAd.id,
        variationIndex,
        variation: variations[variationIndex],
        timestamp: new Date().toISOString()
      });
      
      return variation;
    }
    
    return baseAd;
  }
}

// Export singleton instance
export const adService = new AdService();
