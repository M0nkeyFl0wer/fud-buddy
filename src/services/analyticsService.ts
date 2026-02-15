import { logToAirtable } from "@/utils/airtable";

// Interface for pixel configuration
interface PixelConfig {
  googleId?: string;
  facebookId?: string;
}

class AnalyticsService {
  private googleInitialized = false;
  private facebookInitialized = false;
  private config: PixelConfig = {};

  constructor() {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      this.initializeFromWindow();
    }
  }

  /**
   * Initialize analytics from window globals (if any are set)
   */
  private initializeFromWindow(): void {
    // Check for existing Google Analytics
    if (window.gtag) {
      this.googleInitialized = true;
    }
    
    // Check for existing Facebook Pixel
    if (window.fbq) {
      this.facebookInitialized = true;
    }
  }

  /**
   * Initialize Google Analytics
   */
  initializeGoogleAnalytics(googleId: string): void {
    if (this.googleInitialized) return;
    
    this.config.googleId = googleId;
    
    // Create the script tag for Google Analytics
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${googleId}`;
    
    // Add the script to document head
    document.head.appendChild(script);
    
    // Initialize the gtag function
    window.dataLayer = window.dataLayer ?? [];
    const gtag = (...args: unknown[]) => {
      window.dataLayer?.push(args);
    };
    window.gtag = gtag;
    
    gtag('js', new Date());
    gtag('config', googleId);
    
    this.googleInitialized = true;
    console.log('Google Analytics initialized');
  }

  /**
   * Initialize Facebook Pixel
   */
  initializeFacebookPixel(facebookId: string): void {
    if (this.facebookInitialized) return;
    
    this.config.facebookId = facebookId;
    
    // Initialize Facebook Pixel (minimal, type-safe queue implementation)
    if (!window.fbq) {
      type FbqQueuedFn = ((...args: unknown[]) => void) & {
        callMethod?: (...args: unknown[]) => void;
        queue: unknown[][];
        loaded?: boolean;
        version?: string;
      };

      const fbq: FbqQueuedFn = ((...args: unknown[]) => {
        if (typeof fbq.callMethod === 'function') {
          fbq.callMethod(...args);
          return;
        }
        fbq.queue.push(args);
      }) as FbqQueuedFn;

      fbq.queue = [];
      fbq.loaded = true;
      fbq.version = '2.0';
      window.fbq = fbq;
      (window as Window & { _fbq?: unknown })._fbq = fbq;

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript?.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
      } else {
        document.head.appendChild(script);
      }
    }

    window.fbq?.('init', facebookId);
    window.fbq?.('track', 'PageView');
    
    this.facebookInitialized = true;
    console.log('Facebook Pixel initialized');
  }

  /**
   * Track a page view
   */
  trackPageView(pagePath: string, pageTitle?: string): void {
    // Log to internal analytics (Airtable)
    logToAirtable('page_views', {
      path: pagePath,
      title: pageTitle || document.title,
      timestamp: new Date().toISOString()
    });
    
    // Google Analytics
    if (this.googleInitialized) {
      window.gtag?.('event', 'page_view', {
        page_path: pagePath,
        page_title: pageTitle || document.title
      });
    }
    
    // Facebook Pixel
    if (this.facebookInitialized) {
      window.fbq?.('track', 'PageView');
    }
    
    console.log(`Page view tracked: ${pagePath}`);
  }

  /**
   * Track a custom event
   */
  trackEvent(eventName: string, params?: Record<string, unknown>): void {
    // Log to internal analytics (Airtable)
    logToAirtable('events', {
      event: eventName,
      params,
      timestamp: new Date().toISOString()
    });
    
    // Google Analytics
    if (this.googleInitialized) {
      window.gtag?.('event', eventName, params);
    }
    
    // Facebook Pixel
    if (this.facebookInitialized) {
      window.fbq?.('track', eventName, params);
    }
    
    console.log(`Event tracked: ${eventName}`, params);
  }
}

// Export a singleton instance
export const analyticsService = new AnalyticsService();
