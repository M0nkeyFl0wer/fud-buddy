
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
    if ((window as any).gtag) {
      this.googleInitialized = true;
    }
    
    // Check for existing Facebook Pixel
    if ((window as any).fbq) {
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
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer.push(arguments);
    }
    (window as any).gtag = gtag;
    
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
    
    // Initialize Facebook Pixel
    (function(f: any, b: any, e: any, v: any, n: any, t: any, s: any) {
      if (f.fbq) return;
      n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(
      window,
      document,
      'script',
      'https://connect.facebook.net/en_US/fbevents.js',
      0,
      0,
      0
    );
    
    (window as any).fbq('init', facebookId);
    (window as any).fbq('track', 'PageView');
    
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
      (window as any).gtag('event', 'page_view', {
        page_path: pagePath,
        page_title: pageTitle || document.title
      });
    }
    
    // Facebook Pixel
    if (this.facebookInitialized) {
      (window as any).fbq('track', 'PageView');
    }
    
    console.log(`Page view tracked: ${pagePath}`);
  }

  /**
   * Track a custom event
   */
  trackEvent(eventName: string, params?: Record<string, any>): void {
    // Log to internal analytics (Airtable)
    logToAirtable('events', {
      event: eventName,
      params,
      timestamp: new Date().toISOString()
    });
    
    // Google Analytics
    if (this.googleInitialized) {
      (window as any).gtag('event', eventName, params);
    }
    
    // Facebook Pixel
    if (this.facebookInitialized) {
      (window as any).fbq('track', eventName, params);
    }
    
    console.log(`Event tracked: ${eventName}`, params);
  }
}

// Export a singleton instance
export const analyticsService = new AnalyticsService();

// Add TypeScript definitions for global window object
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    fbq: (...args: any[]) => void;
  }
}
