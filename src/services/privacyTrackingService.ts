/**
 * Privacy Tracking Service
 * Collects user data to demonstrate privacy risks and educate users
 * This is intentionally comprehensive to show what apps CAN track
 */

import { LocationData } from './locationService';

export interface DeviceFingerprint {
  userAgent: string;
  language: string;
  languages: string[];
  platform: string;
  screenResolution: string;
  colorDepth: number;
  timezone: string;
  cookiesEnabled: boolean;
  doNotTrack: string | null;
  touchSupport: boolean;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  maxTouchPoints: number;
  vendor: string;
  plugins: string[];
}

export interface UsagePattern {
  timestamp: string;
  action: 'search' | 'preference_select' | 'card_view' | 'location_grant';
  location?: LocationData;
  preferences?: string[];
  searchQuery?: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: string;
}

export interface TrackedData {
  deviceFingerprint: DeviceFingerprint;
  usageHistory: UsagePattern[];
  locationHistory: LocationData[];
  firstVisit: string;
  totalVisits: number;
  preferencePatterns: Record<string, number>;
  searchLocations: string[];
  peakUsageTime?: string;
}

class PrivacyTrackingService {
  private readonly STORAGE_KEY = 'fud_buddy_tracking_data';
  private trackedData: TrackedData | null = null;

  constructor() {
    this.initializeTracking();
  }

  /**
   * Initialize tracking on first load
   */
  private initializeTracking(): void {
    const existing = this.loadTrackedData();

    if (existing) {
      this.trackedData = existing;
      this.trackedData.totalVisits += 1;
    } else {
      // First visit - create new tracking profile
      this.trackedData = {
        deviceFingerprint: this.collectDeviceFingerprint(),
        usageHistory: [],
        locationHistory: [],
        firstVisit: new Date().toISOString(),
        totalVisits: 1,
        preferencePatterns: {},
        searchLocations: []
      };
    }

    this.saveTrackedData();
  }

  /**
   * Collect device fingerprint
   */
  private collectDeviceFingerprint(): DeviceFingerprint {
    const nav = navigator as any;

    // Collect plugin information
    const plugins: string[] = [];
    if (nav.plugins) {
      for (let i = 0; i < nav.plugins.length; i++) {
        plugins.push(nav.plugins[i].name);
      }
    }

    return {
      userAgent: nav.userAgent || '',
      language: nav.language || '',
      languages: nav.languages || [],
      platform: nav.platform || '',
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth || 0,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookiesEnabled: nav.cookieEnabled || false,
      doNotTrack: nav.doNotTrack || null,
      touchSupport: 'ontouchstart' in window,
      hardwareConcurrency: nav.hardwareConcurrency,
      deviceMemory: nav.deviceMemory,
      maxTouchPoints: nav.maxTouchPoints || 0,
      vendor: nav.vendor || '',
      plugins: plugins.slice(0, 10) // Limit to top 10
    };
  }

  /**
   * Track a user action
   */
  trackAction(
    action: UsagePattern['action'],
    details?: {
      location?: LocationData;
      preferences?: string[];
      searchQuery?: string;
    }
  ): void {
    if (!this.trackedData) return;

    const now = new Date();
    const hour = now.getHours();

    let timeOfDay: UsagePattern['timeOfDay'];
    if (hour < 12) timeOfDay = 'morning';
    else if (hour < 17) timeOfDay = 'afternoon';
    else if (hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'night';

    const pattern: UsagePattern = {
      timestamp: now.toISOString(),
      action,
      timeOfDay,
      dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
      ...details
    };

    this.trackedData.usageHistory.push(pattern);

    // Track location if provided
    if (details?.location) {
      this.trackedData.locationHistory.push(details.location);

      if (details.location.city) {
        if (!this.trackedData.searchLocations.includes(details.location.city)) {
          this.trackedData.searchLocations.push(details.location.city);
        }
      }
    }

    // Track preferences
    if (details?.preferences) {
      details.preferences.forEach(pref => {
        this.trackedData!.preferencePatterns[pref] =
          (this.trackedData!.preferencePatterns[pref] || 0) + 1;
      });
    }

    this.saveTrackedData();
  }

  /**
   * Get all tracked data (for privacy reveal)
   */
  getTrackedData(): TrackedData | null {
    return this.trackedData;
  }

  /**
   * Generate "creepy" insights from tracked data
   */
  generateInsights(): string[] {
    if (!this.trackedData) return [];

    const insights: string[] = [];
    const { usageHistory, preferencePatterns, locationHistory, totalVisits, firstVisit } = this.trackedData;

    // Visit frequency
    if (totalVisits > 1) {
      insights.push(`You've used FUD Buddy ${totalVisits} times since ${new Date(firstVisit).toLocaleDateString()}`);
    }

    // Time patterns
    const timePatterns = usageHistory.reduce((acc, pattern) => {
      acc[pattern.timeOfDay] = (acc[pattern.timeOfDay] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonTime = Object.entries(timePatterns).sort((a, b) => b[1] - a[1])[0];
    if (mostCommonTime) {
      insights.push(`You always search for food in the ${mostCommonTime[0]} (${mostCommonTime[1]} times)`);
    }

    // Day of week patterns
    const dayPatterns = usageHistory.reduce((acc, pattern) => {
      acc[pattern.dayOfWeek] = (acc[pattern.dayOfWeek] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const favoriteDay = Object.entries(dayPatterns).sort((a, b) => b[1] - a[1])[0];
    if (favoriteDay && favoriteDay[1] > 1) {
      insights.push(`${favoriteDay[0]}s seem to be your food exploration day`);
    }

    // Preference patterns
    const topPreference = Object.entries(preferencePatterns).sort((a, b) => b[1] - a[1])[0];
    if (topPreference) {
      insights.push(`You've selected "${topPreference[0]}" ${topPreference[1]} times - we know your type 😏`);
    }

    // Location patterns
    if (locationHistory.length > 2) {
      const cities = locationHistory.map(l => l.city).filter(Boolean);
      const uniqueCities = new Set(cities);

      if (uniqueCities.size === 1) {
        insights.push(`You only search for food in ${[...uniqueCities][0]} - creature of habit, huh?`);
      } else {
        insights.push(`You've searched in ${uniqueCities.size} different cities - quite the foodie traveler!`);
      }
    }

    // Device info
    const fp = this.trackedData.deviceFingerprint;
    if (fp.touchSupport) {
      insights.push(`You're using a touchscreen device (${fp.platform}) - probably on the go`);
    }

    if (fp.timezone) {
      insights.push(`We know you're in the ${fp.timezone} timezone`);
    }

    return insights;
  }

  /**
   * Should we show the privacy reveal?
   */
  shouldShowPrivacyReveal(): boolean {
    if (!this.trackedData) return false;

    // Show after 3 searches
    const searchCount = this.trackedData.usageHistory.filter(
      u => u.action === 'search'
    ).length;

    return searchCount >= 3 && !this.hasSeenReveal();
  }

  /**
   * Mark privacy reveal as seen
   */
  markRevealAsSeen(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('fud_buddy_reveal_seen', 'true');
    }
  }

  /**
   * Check if user has seen the privacy reveal
   */
  private hasSeenReveal(): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem('fud_buddy_reveal_seen') === 'true';
  }

  /**
   * Delete all tracked data
   */
  deleteAllData(): void {
    if (typeof localStorage === 'undefined') return;

    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem('fud_buddy_reveal_seen');

    // Reset tracking
    this.trackedData = {
      deviceFingerprint: this.collectDeviceFingerprint(),
      usageHistory: [],
      locationHistory: [],
      firstVisit: new Date().toISOString(),
      totalVisits: 1,
      preferencePatterns: {},
      searchLocations: []
    };

    this.saveTrackedData();
  }

  /**
   * Load tracked data from localStorage
   */
  private loadTrackedData(): TrackedData | null {
    if (typeof localStorage === 'undefined') return null;

    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Save tracked data to localStorage
   */
  private saveTrackedData(): void {
    if (typeof localStorage === 'undefined' || !this.trackedData) return;

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.trackedData));
    } catch (error) {
      console.error('Failed to save tracking data:', error);
    }
  }
}

export const privacyTrackingService = new PrivacyTrackingService();
