import { logToAirtable } from "@/utils/airtable";
import { martechProfileService } from "./martechProfileService";

export interface PixelConfiguration {
  // Core tracking pixels
  facebook_pixel_id?: string;
  google_analytics_id?: string;
  google_ads_id?: string;
  
  // Advanced marketing tools
  hotjar_id?: string;
  mixpanel_token?: string;
  segment_write_key?: string;
  amplitude_api_key?: string;
  
  // Attribution and analytics
  branch_key?: string;
  adjust_app_token?: string;
  appsflyer_dev_key?: string;
  
  // Customer data platforms
  rudderstack_write_key?: string;
  mparticle_key?: string;
  
  // Heat mapping and session recording
  fullstory_org_id?: string;
  logrocket_app_id?: string;
  
  // A/B testing and personalization
  optimizely_project_id?: string;
  vwo_account_id?: string;
  google_optimize_id?: string;
  
  // Email and marketing automation
  klaviyo_public_api_key?: string;
  mailchimp_dc?: string;
  sendgrid_tracking_id?: string;
  
  // Conversion and revenue tracking
  impact_radius_id?: string;
  commission_junction_id?: string;
  shareasale_merchant_id?: string;
}

export interface UserIdentifiers {
  // Primary identifiers
  anonymous_id: string;
  user_id?: string;
  
  // Pixel-specific IDs
  facebook_fbp?: string;
  facebook_fbc?: string;
  google_client_id?: string;
  google_user_id?: string;
  
  // Cross-device linking
  device_fingerprint?: string;
  email_hash?: string;
  phone_hash?: string;
  
  // Session identifiers
  session_id: string;
  visitor_id?: string;
}

export interface TrackingEvent {
  event_name: string;
  timestamp: string;
  user_identifiers: UserIdentifiers;
  event_properties: Record<string, any>;
  user_properties?: Record<string, any>;
  
  // Context
  page_url: string;
  referrer?: string;
  utm_parameters?: UTMParameters;
  device_info: DeviceInfo;
  location_info?: LocationInfo;
}

export interface UTMParameters {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface DeviceInfo {
  user_agent: string;
  screen_resolution: string;
  viewport_size: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
  language: string;
  timezone: string;
}

export interface LocationInfo {
  ip_address: string;
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface ConversionEvent {
  event_type: 'purchase' | 'signup' | 'reservation' | 'lead' | 'custom';
  value?: number;
  currency?: string;
  items?: ConversionItem[];
  custom_parameters?: Record<string, any>;
}

export interface ConversionItem {
  item_id: string;
  item_name: string;
  category?: string;
  quantity: number;
  price: number;
}

class PixelManagerService {
  private config: PixelConfiguration = {};
  private userIdentifiers: UserIdentifiers;
  private isInitialized = false;
  private dataLayer: any[] = [];

  constructor() {
    this.userIdentifiers = this.generateInitialIdentifiers();
    this.setupDataLayer();
  }

  /**
   * Initialize pixel manager with configuration
   */
  async initialize(config: PixelConfiguration): Promise<void> {
    this.config = { ...this.config, ...config };
    
    if (!this.isInitialized) {
      await this.loadPixels();
      this.setupCrossDomainTracking();
      this.isInitialized = true;
      
      console.log('Pixel Manager initialized with:', Object.keys(config));
    }
  }

  /**
   * Load and initialize all configured pixels
   */
  private async loadPixels(): Promise<void> {
    const loadPromises: Promise<void>[] = [];

    // Facebook Pixel
    if (this.config.facebook_pixel_id) {
      loadPromises.push(this.loadFacebookPixel());
    }

    // Google Analytics 4
    if (this.config.google_analytics_id) {
      loadPromises.push(this.loadGoogleAnalytics());
    }

    // Google Ads
    if (this.config.google_ads_id) {
      loadPromises.push(this.loadGoogleAds());
    }

    // Hotjar
    if (this.config.hotjar_id) {
      loadPromises.push(this.loadHotjar());
    }

    // Mixpanel
    if (this.config.mixpanel_token) {
      loadPromises.push(this.loadMixpanel());
    }

    // Segment
    if (this.config.segment_write_key) {
      loadPromises.push(this.loadSegment());
    }

    // FullStory
    if (this.config.fullstory_org_id) {
      loadPromises.push(this.loadFullStory());
    }

    // Additional pixels would be loaded here...

    await Promise.allSettled(loadPromises);
  }

  /**
   * Load Facebook Pixel
   */
  private async loadFacebookPixel(): Promise<void> {
    return new Promise((resolve) => {
      if ((window as any).fbq) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      
      script.onload = () => {
        (window as any).fbq('init', this.config.facebook_pixel_id);
        (window as any).fbq('track', 'PageView');
        
        // Extract Facebook identifiers
        this.updateFacebookIdentifiers();
        resolve();
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Load Google Analytics 4
   */
  private async loadGoogleAnalytics(): Promise<void> {
    return new Promise((resolve) => {
      if ((window as any).gtag) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${this.config.google_analytics_id}`;
      
      script.onload = () => {
        (window as any).dataLayer = (window as any).dataLayer || [];
        function gtag(...args: any[]) {
          (window as any).dataLayer.push(arguments);
        }
        (window as any).gtag = gtag;
        
        gtag('js', new Date());
        gtag('config', this.config.google_analytics_id, {
          send_page_view: true,
          custom_map: {
            'custom_parameter_1': 'dining_personality',
            'custom_parameter_2': 'price_sensitivity'
          }
        });
        
        // Extract Google identifiers
        this.updateGoogleIdentifiers();
        resolve();
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Load Hotjar for heatmaps and session recordings
   */
  private async loadHotjar(): Promise<void> {
    return new Promise((resolve) => {
      (window as any).hj = (window as any).hj || function(...args: any[]) {
        ((window as any).hj.q = (window as any).hj.q || []).push(arguments);
      };
      (window as any)._hjSettings = { hjid: this.config.hotjar_id, hjsv: 6 };
      
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://static.hotjar.com/c/hotjar-${this.config.hotjar_id}.js?sv=6`;
      
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  /**
   * Load Mixpanel
   */
  private async loadMixpanel(): Promise<void> {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';
      
      script.onload = () => {
        (window as any).mixpanel.init(this.config.mixpanel_token, {
          debug: process.env.NODE_ENV === 'development',
          track_pageview: true,
          persistence: 'localStorage'
        });
        resolve();
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Load Segment
   */
  private async loadSegment(): Promise<void> {
    return new Promise((resolve) => {
      !(function() {
        const analytics = (window as any).analytics = (window as any).analytics || [];
        if (!analytics.initialize) {
          if (analytics.invoked) {
            console.error("Segment snippet included twice.");
          } else {
            analytics.invoked = !0;
            analytics.methods = ["trackSubmit", "trackClick", "trackLink", "trackForm", "pageview", "identify", "reset", "group", "track", "ready", "alias", "debug", "page", "once", "off", "on", "addSourceMiddleware", "addIntegrationMiddleware", "setAnonymousId", "addDestinationMiddleware"];
            analytics.factory = function(e: any) {
              return function() {
                const t = Array.prototype.slice.call(arguments);
                t.unshift(e);
                analytics.push(t);
                return analytics;
              };
            };
            for (let e = 0; e < analytics.methods.length; e++) {
              const key = analytics.methods[e];
              analytics[key] = analytics.factory(key);
            }
            analytics.load = function(key: string, e: any) {
              const t = document.createElement("script");
              t.type = "text/javascript";
              t.async = !0;
              t.src = "https://cdn.segment.com/analytics.js/v1/" + key + "/analytics.min.js";
              const n = document.getElementsByTagName("script")[0];
              n.parentNode!.insertBefore(t, n);
              analytics._loadOptions = e;
            };
            analytics.SNIPPET_VERSION = "4.13.1";
            analytics.load(this.config.segment_write_key);
            analytics.page();
          }
        }
        resolve();
      })();
    });
  }

  /**
   * Load FullStory for session recordings
   */
  private async loadFullStory(): Promise<void> {
    return new Promise((resolve) => {
      (window as any)['_fs_debug'] = false;
      (window as any)['_fs_host'] = 'fullstory.com';
      (window as any)['_fs_script'] = 'edge.fullstory.com/s/fs.js';
      (window as any)['_fs_org'] = this.config.fullstory_org_id;
      (window as any)['_fs_namespace'] = 'FS';
      
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://${(window as any)._fs_script}`;
      
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  /**
   * Track custom event across all configured pixels
   */
  async trackEvent(eventName: string, properties: Record<string, any> = {}, conversionData?: ConversionEvent): Promise<void> {
    const event: TrackingEvent = {
      event_name: eventName,
      timestamp: new Date().toISOString(),
      user_identifiers: this.userIdentifiers,
      event_properties: properties,
      page_url: window.location.href,
      referrer: document.referrer,
      utm_parameters: this.extractUTMParameters(),
      device_info: this.getDeviceInfo(),
      location_info: await this.getLocationInfo()
    };

    // Track on Facebook Pixel
    if (this.config.facebook_pixel_id && (window as any).fbq) {
      this.trackFacebookEvent(eventName, properties, conversionData);
    }

    // Track on Google Analytics
    if (this.config.google_analytics_id && (window as any).gtag) {
      this.trackGoogleAnalyticsEvent(eventName, properties);
    }

    // Track on Mixpanel
    if (this.config.mixpanel_token && (window as any).mixpanel) {
      (window as any).mixpanel.track(eventName, properties);
    }

    // Track on Segment
    if (this.config.segment_write_key && (window as any).analytics) {
      (window as any).analytics.track(eventName, properties);
    }

    // Log to internal analytics
    logToAirtable('cross_pixel_events', {
      event_name: eventName,
      properties,
      user_identifiers: this.userIdentifiers,
      pixels_fired: this.getActivePixelsList(),
      timestamp: event.timestamp
    });

    // Trigger profile enrichment
    if (this.userIdentifiers.facebook_fbp) {
      await martechProfileService.enrichUserProfile(this.userIdentifiers.facebook_fbp);
    }
  }

  /**
   * Track Facebook-specific events
   */
  private trackFacebookEvent(eventName: string, properties: Record<string, any>, conversionData?: ConversionEvent): void {
    const fbEventMap: Record<string, string> = {
      'page_view': 'PageView',
      'view_content': 'ViewContent',
      'add_to_cart': 'AddToCart',
      'purchase': 'Purchase',
      'lead': 'Lead',
      'signup': 'CompleteRegistration',
      'reservation_made': 'Schedule',
      'restaurant_viewed': 'ViewContent'
    };

    const fbEventName = fbEventMap[eventName] || 'CustomEvent';
    
    let fbProperties: any = {
      content_name: properties.content_name || properties.restaurant_name,
      content_category: properties.category || 'food',
      custom_parameter: properties.custom_parameter
    };

    if (conversionData) {
      fbProperties.value = conversionData.value;
      fbProperties.currency = conversionData.currency || 'USD';
      
      if (conversionData.items) {
        fbProperties.contents = conversionData.items.map(item => ({
          id: item.item_id,
          quantity: item.quantity,
          item_price: item.price
        }));
        fbProperties.content_ids = conversionData.items.map(item => item.item_id);
      }
    }

    (window as any).fbq('track', fbEventName, fbProperties);
  }

  /**
   * Track Google Analytics events
   */
  private trackGoogleAnalyticsEvent(eventName: string, properties: Record<string, any>): void {
    (window as any).gtag('event', eventName, {
      event_category: properties.category || 'engagement',
      event_label: properties.label,
      value: properties.value,
      custom_parameter_1: properties.dining_personality,
      custom_parameter_2: properties.price_sensitivity,
      ...properties
    });
  }

  /**
   * Identify user across all pixels
   */
  identifyUser(userId: string, traits: Record<string, any> = {}): void {
    this.userIdentifiers.user_id = userId;

    // Facebook Pixel - using Advanced Matching
    if (this.config.facebook_pixel_id && (window as any).fbq) {
      const advancedMatching: any = {};
      if (traits.email) advancedMatching.em = this.hashString(traits.email);
      if (traits.phone) advancedMatching.ph = this.hashString(traits.phone);
      if (traits.first_name) advancedMatching.fn = this.hashString(traits.first_name);
      if (traits.last_name) advancedMatching.ln = this.hashString(traits.last_name);

      (window as any).fbq('init', this.config.facebook_pixel_id, advancedMatching);
    }

    // Google Analytics - set user ID
    if (this.config.google_analytics_id && (window as any).gtag) {
      (window as any).gtag('config', this.config.google_analytics_id, {
        user_id: userId,
        custom_map: traits
      });
    }

    // Mixpanel
    if (this.config.mixpanel_token && (window as any).mixpanel) {
      (window as any).mixpanel.identify(userId);
      (window as any).mixpanel.people.set(traits);
    }

    // Segment
    if (this.config.segment_write_key && (window as any).analytics) {
      (window as any).analytics.identify(userId, traits);
    }

    // FullStory
    if (this.config.fullstory_org_id && (window as any).FS) {
      (window as any).FS.identify(userId, traits);
    }

    // Log identification event
    logToAirtable('user_identification', {
      user_id: userId,
      anonymous_id: this.userIdentifiers.anonymous_id,
      traits,
      pixels_updated: this.getActivePixelsList(),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Track conversion events with enhanced attribution
   */
  async trackConversion(conversionData: ConversionEvent, additionalProperties: Record<string, any> = {}): Promise<void> {
    const eventName = `conversion_${conversionData.event_type}`;
    
    await this.trackEvent(eventName, {
      ...additionalProperties,
      conversion_value: conversionData.value,
      conversion_currency: conversionData.currency,
      item_count: conversionData.items?.length || 0
    }, conversionData);

    // Enhanced attribution tracking
    await this.trackAttribution(conversionData);
  }

  /**
   * Track attribution data across channels
   */
  private async trackAttribution(conversionData: ConversionEvent): Promise<void> {
    const attributionData = {
      conversion_type: conversionData.event_type,
      conversion_value: conversionData.value,
      utm_parameters: this.extractUTMParameters(),
      referrer: document.referrer,
      landing_page: this.getLandingPage(),
      session_source: this.getSessionSource(),
      time_to_conversion: this.calculateTimeToConversion(),
      touchpoint_sequence: this.getTouchpointSequence()
    };

    logToAirtable('attribution_data', {
      user_identifiers: this.userIdentifiers,
      attribution_data: attributionData,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Generate initial user identifiers
   */
  private generateInitialIdentifiers(): UserIdentifiers {
    const anonymousId = this.getStoredValue('fud_anonymous_id') || this.generateUUID();
    this.setStoredValue('fud_anonymous_id', anonymousId);

    return {
      anonymous_id: anonymousId,
      session_id: this.generateSessionId(),
      device_fingerprint: this.generateDeviceFingerprint()
    };
  }

  /**
   * Update Facebook identifiers from cookies
   */
  private updateFacebookIdentifiers(): void {
    this.userIdentifiers.facebook_fbp = this.getCookie('_fbp');
    this.userIdentifiers.facebook_fbc = this.getCookie('_fbc') || this.extractFBCFromURL();
  }

  /**
   * Update Google identifiers from cookies
   */
  private updateGoogleIdentifiers(): void {
    const gaCookie = this.getCookie('_ga');
    if (gaCookie) {
      const parts = gaCookie.split('.');
      if (parts.length >= 4) {
        this.userIdentifiers.google_client_id = `${parts[2]}.${parts[3]}`;
      }
    }
  }

  /**
   * Setup cross-domain tracking
   */
  private setupCrossDomainTracking(): void {
    // Facebook Cross-Domain Tracking
    if (this.config.facebook_pixel_id) {
      this.setupFacebookCrossDomain();
    }

    // Google Analytics Cross-Domain Tracking
    if (this.config.google_analytics_id) {
      this.setupGoogleCrossDomain();
    }
  }

  // Utility methods
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private generateSessionId(): string {
    return `${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDeviceFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx!.textBaseline = 'top';
    ctx!.font = '14px Arial';
    ctx!.fillText('Device fingerprint', 2, 2);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    return this.hashString(fingerprint).substring(0, 16);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getCookie(name: string): string | undefined {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : undefined;
  }

  private extractFBCFromURL(): string | undefined {
    const urlParams = new URLSearchParams(window.location.search);
    const fbclid = urlParams.get('fbclid');
    return fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined;
  }

  private extractUTMParameters(): UTMParameters {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      utm_source: urlParams.get('utm_source') || undefined,
      utm_medium: urlParams.get('utm_medium') || undefined,
      utm_campaign: urlParams.get('utm_campaign') || undefined,
      utm_term: urlParams.get('utm_term') || undefined,
      utm_content: urlParams.get('utm_content') || undefined
    };
  }

  private getDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent;
    return {
      user_agent: userAgent,
      screen_resolution: `${screen.width}x${screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      device_type: this.getDeviceType(userAgent),
      browser: this.getBrowser(userAgent),
      os: this.getOS(userAgent),
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  private getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
    if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      if (/iPad|Android(?!.*Mobile)/i.test(userAgent)) return 'tablet';
      return 'mobile';
    }
    return 'desktop';
  }

  private getBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private getOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'MacOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  private async getLocationInfo(): Promise<LocationInfo | undefined> {
    // This would integrate with IP geolocation service
    return undefined;
  }

  private getActivePixelsList(): string[] {
    const active = [];
    if (this.config.facebook_pixel_id) active.push('facebook');
    if (this.config.google_analytics_id) active.push('google_analytics');
    if (this.config.mixpanel_token) active.push('mixpanel');
    if (this.config.segment_write_key) active.push('segment');
    if (this.config.hotjar_id) active.push('hotjar');
    return active;
  }

  private setupDataLayer(): void {
    (window as any).dataLayer = (window as any).dataLayer || [];
    this.dataLayer = (window as any).dataLayer;
  }

  private setupFacebookCrossDomain(): void {
    // Facebook cross-domain tracking setup
    if ((window as any).fbq) {
      (window as any).fbq('set', 'autoConfig', false, this.config.facebook_pixel_id);
    }
  }

  private setupGoogleCrossDomain(): void {
    // Google Analytics cross-domain tracking
    if ((window as any).gtag) {
      const domains = ['fudbbuddy.com', 'app.fudbbuddy.com']; // Configure as needed
      (window as any).gtag('config', this.config.google_analytics_id, {
        linker: {
          domains: domains
        }
      });
    }
  }

  // Additional tracking methods
  private getStoredValue(key: string): string | null {
    return localStorage.getItem(key);
  }

  private setStoredValue(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  private getLandingPage(): string {
    return this.getStoredValue('landing_page') || window.location.href;
  }

  private getSessionSource(): string {
    return this.getStoredValue('session_source') || 'direct';
  }

  private calculateTimeToConversion(): number {
    const sessionStart = this.getStoredValue('session_start');
    return sessionStart ? Date.now() - parseInt(sessionStart) : 0;
  }

  private getTouchpointSequence(): string[] {
    const stored = this.getStoredValue('touchpoint_sequence');
    return stored ? JSON.parse(stored) : [];
  }
}

// Export singleton instance
export const pixelManagerService = new PixelManagerService();