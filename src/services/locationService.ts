/**
 * Location Service
 * Handles geolocation detection and city/address resolution
 */

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
  accuracy?: number;
}

class LocationService {
  private cachedLocation: LocationData | null = null;

  /**
   * Get user's current location using browser geolocation API
   */
  async getCurrentLocation(): Promise<LocationData> {
    // Return cached location if available
    if (this.cachedLocation) {
      return this.cachedLocation;
    }

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };

          // Try to get city name from coordinates
          try {
            const cityInfo = await this.reverseGeocode(
              locationData.latitude,
              locationData.longitude
            );
            locationData.city = cityInfo.city;
            locationData.state = cityInfo.state;
            locationData.country = cityInfo.country;
          } catch (error) {
            console.warn('Could not reverse geocode location:', error);
          }

          // Cache the location
          this.cachedLocation = locationData;

          resolve(locationData);
        },
        (error) => {
          let errorMessage = 'Unable to retrieve your location';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }

          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // Cache for 5 minutes
        }
      );
    });
  }

  /**
   * Reverse geocode coordinates to get city/state info
   * Uses free Nominatim API (OpenStreetMap)
   */
  private async reverseGeocode(lat: number, lng: number): Promise<{ city?: string; state?: string; country?: string }> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
        {
          headers: {
            'User-Agent': 'FUDBuddy/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();

      return {
        city: data.address?.city || data.address?.town || data.address?.village,
        state: data.address?.state,
        country: data.address?.country
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return {};
    }
  }

  /**
   * Check if location permission is granted
   */
  async checkPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    if (!navigator.permissions) {
      return 'prompt';
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return result.state as 'granted' | 'denied' | 'prompt';
    } catch {
      return 'prompt';
    }
  }

  /**
   * Clear cached location
   */
  clearCache(): void {
    this.cachedLocation = null;
  }

  /**
   * Format location for display
   */
  formatLocation(location: LocationData): string {
    if (location.city && location.state) {
      return `${location.city}, ${location.state}`;
    } else if (location.city) {
      return location.city;
    } else {
      return `${location.latitude.toFixed(2)}°, ${location.longitude.toFixed(2)}°`;
    }
  }
}

export const locationService = new LocationService();
