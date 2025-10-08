import { logToAirtable } from "@/utils/airtable";

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
  accuracy?: number;
  source: 'gps' | 'ip' | 'manual';
}

export interface IPLocationResponse {
  ip: string;
  city: string;
  region: string;
  country: string;
  loc: string; // "lat,lng" format
  org?: string;
  timezone?: string;
}

class LocationService {
  private cachedLocation: LocationData | null = null;
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private lastLocationTime: number = 0;

  /**
   * Get user's current location using GPS first, then IP fallback
   */
  async getCurrentLocation(): Promise<LocationData> {
    // Check if we have recent cached location
    if (this.cachedLocation && this.isLocationCacheValid()) {
      console.log('Using cached location data');
      return this.cachedLocation;
    }

    try {
      // Try GPS first (requires user permission)
      const gpsLocation = await this.getGPSLocation();
      if (gpsLocation) {
        this.cacheLocation(gpsLocation);
        this.logLocationEvent('gps_success', gpsLocation);
        return gpsLocation;
      }
    } catch (error) {
      console.warn('GPS location failed:', error);
      this.logLocationEvent('gps_failed', null, error as Error);
    }

    try {
      // Fallback to IP-based location
      const ipLocation = await this.getIPLocation();
      this.cacheLocation(ipLocation);
      this.logLocationEvent('ip_success', ipLocation);
      return ipLocation;
    } catch (error) {
      console.error('IP location also failed:', error);
      this.logLocationEvent('ip_failed', null, error as Error);
      throw new Error('Unable to determine location');
    }
  }

  /**
   * Get location using browser's geolocation API
   */
  private async getGPSLocation(): Promise<LocationData | null> {
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported');
    }

    return new Promise((resolve, reject) => {
      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000 // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          try {
            // Try to get city/state from reverse geocoding
            const cityInfo = await this.reverseGeocode(latitude, longitude);
            
            resolve({
              latitude,
              longitude,
              accuracy,
              source: 'gps',
              ...cityInfo
            });
          } catch (error) {
            // Even if reverse geocoding fails, we have coordinates
            resolve({
              latitude,
              longitude,
              accuracy,
              source: 'gps'
            });
          }
        },
        (error) => {
          reject(new Error(`GPS Error: ${error.message}`));
        },
        options
      );
    });
  }

  /**
   * Get location using IP geolocation (using ipinfo.io as fallback)
   */
  private async getIPLocation(): Promise<LocationData> {
    // Using ipinfo.io which provides good free tier
    const response = await fetch('https://ipinfo.io/json');
    
    if (!response.ok) {
      throw new Error('IP location service unavailable');
    }

    const data: IPLocationResponse = await response.json();
    const [latitude, longitude] = data.loc.split(',').map(Number);

    return {
      latitude,
      longitude,
      city: data.city,
      state: data.region,
      country: data.country,
      source: 'ip'
    };
  }

  /**
   * Reverse geocode coordinates to get city/state info
   */
  private async reverseGeocode(lat: number, lng: number): Promise<Partial<LocationData>> {
    try {
      // Using a simple reverse geocoding service
      // In production, you might want to use Google Maps API or similar
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      
      if (response.ok) {
        const data = await response.json();
        return {
          city: data.city || data.locality,
          state: data.principalSubdivision,
          country: data.countryName
        };
      }
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
    }
    
    return {};
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in miles
  }

  /**
   * Convert degrees to radians
   */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get formatted location string for display
   */
  getLocationString(location: LocationData): string {
    if (location.city && location.state) {
      return `${location.city}, ${location.state}`;
    } else if (location.city) {
      return location.city;
    } else {
      return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    }
  }

  /**
   * Cache location data
   */
  private cacheLocation(location: LocationData): void {
    this.cachedLocation = location;
    this.lastLocationTime = Date.now();
  }

  /**
   * Check if cached location is still valid
   */
  private isLocationCacheValid(): boolean {
    return Date.now() - this.lastLocationTime < this.CACHE_DURATION;
  }

  /**
   * Clear cached location (useful for testing or user-requested refresh)
   */
  clearLocationCache(): void {
    this.cachedLocation = null;
    this.lastLocationTime = 0;
  }

  /**
   * Log location events for analytics
   */
  private logLocationEvent(
    event: string, 
    location: LocationData | null, 
    error?: Error
  ): void {
    logToAirtable('location_events', {
      event,
      location: location ? {
        lat: location.latitude,
        lng: location.longitude,
        city: location.city,
        source: location.source
      } : null,
      error: error?.message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Check if browser supports geolocation
   */
  isGeolocationSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Request location permission explicitly
   */
  async requestLocationPermission(): Promise<PermissionState> {
    if ('permissions' in navigator) {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state;
    }
    return 'prompt'; // Default assumption
  }
}

// Export singleton instance
export const locationService = new LocationService();