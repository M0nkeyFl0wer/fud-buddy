import { logToAirtable } from "@/utils/airtable";

export interface RestaurantIntegration {
  id: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  menuUrl?: string;
  reservationProviders: ReservationProvider[];
  deliveryProviders: DeliveryProvider[];
  socialMedia: SocialMediaLinks;
  photos: string[];
  operatingHours: OperatingHours;
  priceRange: '$' | '$$' | '$$$' | '$$$$';
  cuisineType: string;
  features: RestaurantFeature[];
}

export interface ReservationProvider {
  name: 'opentable' | 'resy' | 'yelp' | 'direct' | 'custom';
  bookingUrl: string;
  requiresAccount: boolean;
  supportsPartySize: number[];
  advanceBookingDays: number;
}

export interface DeliveryProvider {
  name: 'ubereats' | 'doordash' | 'grubhub' | 'postmates' | 'direct' | 'custom';
  orderUrl: string;
  minimumOrder?: number;
  deliveryFee?: number;
  estimatedDelivery: string;
}

export interface SocialMediaLinks {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;
}

export interface OperatingHours {
  monday?: TimeSlot;
  tuesday?: TimeSlot;
  wednesday?: TimeSlot;
  thursday?: TimeSlot;
  friday?: TimeSlot;
  saturday?: TimeSlot;
  sunday?: TimeSlot;
}

export interface TimeSlot {
  open: string; // "HH:mm" format
  close: string; // "HH:mm" format
  closed?: boolean;
}

export interface RestaurantFeature {
  name: string;
  description: string;
  type: 'amenity' | 'dietary' | 'atmosphere' | 'service';
}

export interface OutfitSuggestion {
  restaurantId: string;
  restaurantName: string;
  dressCode: 'casual' | 'smart-casual' | 'business-casual' | 'formal' | 'black-tie';
  suggestions: {
    general: string;
    men?: string;
    women?: string;
    accessories?: string;
    seasonalNotes?: string;
  };
  whatToAvoid: string[];
  photos?: string[]; // Example outfit photos
}

class RestaurantIntegrationService {
  private restaurantCache: Map<string, RestaurantIntegration> = new Map();
  private outfitSuggestions: Map<string, OutfitSuggestion> = new Map();

  constructor() {
    this.initializeMockData();
  }

  /**
   * Initialize with mock restaurant data
   */
  private initializeMockData(): void {
    // Mock restaurant data that would normally come from APIs
    const mockRestaurants: RestaurantIntegration[] = [
      {
        id: 'copper-table-1',
        name: 'The Copper Table',
        address: '123 Main Street, Downtown',
        phone: '(555) 123-4567',
        website: 'https://thecoppertable.com',
        menuUrl: 'https://thecoppertable.com/menu',
        reservationProviders: [
          {
            name: 'opentable',
            bookingUrl: 'https://www.opentable.com/r/the-copper-table',
            requiresAccount: false,
            supportsPartySize: [1, 2, 3, 4, 5, 6, 7, 8],
            advanceBookingDays: 30
          },
          {
            name: 'direct',
            bookingUrl: 'https://thecoppertable.com/reservations',
            requiresAccount: false,
            supportsPartySize: [1, 2, 3, 4, 5, 6, 7, 8, 10, 12],
            advanceBookingDays: 60
          }
        ],
        deliveryProviders: [],
        socialMedia: {
          instagram: 'https://instagram.com/coppertablerestaurant',
          facebook: 'https://facebook.com/coppertable'
        },
        photos: [
          'https://picsum.photos/seed/copper-table-interior/800/600',
          'https://picsum.photos/seed/copper-table-food/800/600'
        ],
        operatingHours: {
          monday: { closed: true },
          tuesday: { open: '17:00', close: '22:00' },
          wednesday: { open: '17:00', close: '22:00' },
          thursday: { open: '17:00', close: '22:00' },
          friday: { open: '17:00', close: '23:00' },
          saturday: { open: '16:00', close: '23:00' },
          sunday: { open: '16:00', close: '21:00' }
        },
        priceRange: '$$',
        cuisineType: 'Modern American',
        features: [
          { name: 'Pet Friendly', description: 'Dogs welcome on patio', type: 'amenity' },
          { name: 'Craft Cocktails', description: 'House-made spirits and bitters', type: 'service' },
          { name: 'Romantic Atmosphere', description: 'Dim lighting, intimate seating', type: 'atmosphere' }
        ]
      },
      {
        id: 'ramen-underground-1',
        name: 'Ramen Underground',
        address: '456 Basement Lane, Arts District',
        phone: '(555) 987-6543',
        website: 'https://ramenunderground.com',
        menuUrl: 'https://ramenunderground.com/menu.pdf',
        reservationProviders: [],
        deliveryProviders: [
          {
            name: 'ubereats',
            orderUrl: 'https://ubereats.com/ramen-underground',
            minimumOrder: 15,
            deliveryFee: 3.99,
            estimatedDelivery: '25-35 mins'
          }
        ],
        socialMedia: {
          instagram: 'https://instagram.com/ramenunderground'
        },
        photos: [
          'https://picsum.photos/seed/ramen-interior/800/600'
        ],
        operatingHours: {
          tuesday: { open: '18:00', close: '23:00' },
          wednesday: { open: '18:00', close: '23:00' },
          thursday: { open: '18:00', close: '23:00' },
          friday: { open: '18:00', close: '24:00' },
          saturday: { open: '18:00', close: '24:00' },
          sunday: { closed: true },
          monday: { closed: true }
        },
        priceRange: '$$',
        cuisineType: 'Japanese',
        features: [
          { name: 'Authentic Ramen', description: '18-hour bone broth', type: 'service' },
          { name: 'Counter Seating', description: 'Watch the chefs work', type: 'atmosphere' },
          { name: 'Cash Only', description: 'ATM available on-site', type: 'service' }
        ]
      }
    ];

    // Cache the mock restaurants
    mockRestaurants.forEach(restaurant => {
      this.restaurantCache.set(restaurant.id, restaurant);
    });

    // Initialize outfit suggestions
    this.initializeOutfitSuggestions();
  }

  /**
   * Initialize outfit suggestions for restaurants
   */
  private initializeOutfitSuggestions(): void {
    const outfitSuggestions: OutfitSuggestion[] = [
      {
        restaurantId: 'copper-table-1',
        restaurantName: 'The Copper Table',
        dressCode: 'smart-casual',
        suggestions: {
          general: 'Think upscale but approachable - nice jeans or chinos with a button-down shirt or blouse',
          men: 'Dark jeans or chinos, button-down shirt (sleeves can be rolled up), optional blazer, leather shoes or clean sneakers',
          women: 'Nice jeans or dress pants, blouse or sweater, or a casual dress with cardigan, flats or low heels',
          accessories: 'A watch, simple jewelry, and a nice bag complete the look',
          seasonalNotes: 'The restaurant has great mood lighting, so metallics and jewel tones photograph beautifully'
        },
        whatToAvoid: [
          'Athletic wear or gym clothes',
          'Flip-flops or beach sandals',
          'Very revealing clothing',
          'Overly formal business suits'
        ],
        photos: [
          'https://picsum.photos/seed/smart-casual-outfit/400/600'
        ]
      },
      {
        restaurantId: 'ramen-underground-1',
        restaurantName: 'Ramen Underground',
        dressCode: 'casual',
        suggestions: {
          general: 'This is a super casual spot - wear whatever makes you comfortable! It gets steamy inside.',
          men: 'T-shirt, jeans, comfortable shoes. Maybe skip the white shirt since ramen can be messy!',
          women: 'Comfortable top, jeans or casual pants, shoes you don\\'t mind getting a little steamy',
          accessories: 'Minimal jewelry (steam and heat), hair tie if you have long hair',
          seasonalNotes: 'Dress in layers - it\\'s hot inside but you might need a jacket for the walk'
        },
        whatToAvoid: [
          'White or very light colored clothes (splashing risk)',
          'Anything too fancy - you\\'ll be overdressed',
          'Heavy makeup (it gets steamy)',
          'Expensive shoes (floor can get slippery)'
        ]
      }
    ];

    outfitSuggestions.forEach(suggestion => {
      this.outfitSuggestions.set(suggestion.restaurantId, suggestion);
    });
  }

  /**
   * Get restaurant integration data by name or ID
   */
  async getRestaurantIntegration(identifier: string): Promise<RestaurantIntegration | null> {
    // Check cache first
    let restaurant = this.restaurantCache.get(identifier);
    if (restaurant) {
      return restaurant;
    }

    // Search by name
    for (const [id, rest] of this.restaurantCache.entries()) {
      if (rest.name.toLowerCase().includes(identifier.toLowerCase())) {
        return rest;
      }
    }

    // In production, this would make API calls to:
    // - Google Places API
    // - Yelp API
    // - OpenTable API
    // - Restaurant's own API
    return await this.fetchRestaurantFromAPIs(identifier);
  }

  /**
   * Mock function for fetching restaurant data from APIs
   */
  private async fetchRestaurantFromAPIs(identifier: string): Promise<RestaurantIntegration | null> {
    // This would integrate with real APIs in production
    console.log(`Fetching restaurant data for: ${identifier}`);
    
    // Return null for now - in production this would fetch real data
    return null;
  }

  /**
   * Get outfit suggestions for a restaurant
   */
  getOutfitSuggestion(restaurantId: string): OutfitSuggestion | null {
    return this.outfitSuggestions.get(restaurantId) || null;
  }

  /**
   * Generate outfit suggestions based on restaurant type and atmosphere
   */
  generateOutfitSuggestion(restaurant: RestaurantIntegration): OutfitSuggestion {
    let dressCode: OutfitSuggestion['dressCode'] = 'casual';
    let suggestions = {
      general: 'Dress comfortably for a great meal!',
      men: 'Casual attire works well',
      women: 'Comfortable and stylish',
      accessories: 'Keep it simple'
    };
    let whatToAvoid = ['Athletic wear'];

    // Determine dress code based on price range and features
    if (restaurant.priceRange === '$$$$') {
      dressCode = 'formal';
      suggestions = {
        general: 'This is a high-end establishment - dress to impress!',
        men: 'Dark suit or blazer with dress shirt, dress shoes, consider a tie',
        women: 'Elegant dress or nice blouse with dress pants/skirt, heels or dress flats',
        accessories: 'Quality accessories make a difference - watch, nice jewelry, elegant bag'
      };
      whatToAvoid = ['Casual wear', 'Sneakers', 'Jeans', 'T-shirts'];
    } else if (restaurant.priceRange === '$$$') {
      dressCode = 'business-casual';
      suggestions = {
        general: 'Upscale casual - think date night or business dinner',
        men: 'Dress shirt or polo, dress pants or nice jeans, leather shoes',
        women: 'Nice blouse or sweater, dress pants or skirt, or a casual dress',
        accessories: 'A step up from everyday - nice watch, jewelry, structured bag'
      };
      whatToAvoid = ['Flip-flops', 'Athletic wear', 'Very casual t-shirts'];
    } else if (restaurant.priceRange === '$$') {
      dressCode = 'smart-casual';
    }

    // Adjust based on cuisine type
    if (restaurant.cuisineType.toLowerCase().includes('japanese') && restaurant.name.toLowerCase().includes('ramen')) {
      suggestions.seasonalNotes = 'It can get steamy inside - dress in breathable fabrics and layers';
      whatToAvoid.push('White clothing (potential for splashing)');
    }

    // Adjust based on features
    restaurant.features.forEach(feature => {
      if (feature.name.toLowerCase().includes('romantic')) {
        suggestions.seasonalNotes = 'Perfect for date night - this place has great ambiance for photos';
      }
      if (feature.name.toLowerCase().includes('pet friendly')) {
        suggestions.accessories = (suggestions.accessories || '') + '. Pet-friendly, so comfortable shoes for outdoor seating';
      }
    });

    return {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      dressCode,
      suggestions,
      whatToAvoid
    };
  }

  /**
   * Get reservation link for a restaurant
   */
  getReservationLink(restaurantId: string, partySize?: number, preferredProvider?: string): string | null {
    const restaurant = this.restaurantCache.get(restaurantId);
    if (!restaurant || restaurant.reservationProviders.length === 0) {
      return null;
    }

    // Try to find preferred provider
    if (preferredProvider) {
      const provider = restaurant.reservationProviders.find(p => p.name === preferredProvider);
      if (provider) {
        return this.buildReservationUrl(provider, partySize);
      }
    }

    // Use first available provider that supports the party size
    for (const provider of restaurant.reservationProviders) {
      if (!partySize || provider.supportsPartySize.includes(partySize)) {
        return this.buildReservationUrl(provider, partySize);
      }
    }

    // Fallback to first provider
    return this.buildReservationUrl(restaurant.reservationProviders[0], partySize);
  }

  /**
   * Build reservation URL with party size if supported
   */
  private buildReservationUrl(provider: ReservationProvider, partySize?: number): string {
    let url = provider.bookingUrl;
    
    // Add party size parameter if supported by the provider
    if (partySize && provider.name === 'opentable') {
      url += `?partySize=${partySize}`;
    }
    
    return url;
  }

  /**
   * Get delivery/order link for a restaurant
   */
  getOrderLink(restaurantId: string, preferredProvider?: string): string | null {
    const restaurant = this.restaurantCache.get(restaurantId);
    if (!restaurant || restaurant.deliveryProviders.length === 0) {
      return null;
    }

    // Try to find preferred provider
    if (preferredProvider) {
      const provider = restaurant.deliveryProviders.find(p => p.name === preferredProvider);
      if (provider) {
        return provider.orderUrl;
      }
    }

    // Use first available provider
    return restaurant.deliveryProviders[0].orderUrl;
  }

  /**
   * Check if restaurant is currently open
   */
  isRestaurantOpen(restaurantId: string): boolean {
    const restaurant = this.restaurantCache.get(restaurantId);
    if (!restaurant) return false;

    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' }) as keyof OperatingHours;
    const currentTime = now.toTimeString().slice(0, 5); // HH:mm format

    const todayHours = restaurant.operatingHours[currentDay];
    if (!todayHours || todayHours.closed) {
      return false;
    }

    return currentTime >= todayHours.open && currentTime <= todayHours.close;
  }

  /**
   * Get restaurant hours for today
   */
  getTodaysHours(restaurantId: string): string {
    const restaurant = this.restaurantCache.get(restaurantId);
    if (!restaurant) return 'Hours unavailable';

    const today = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' }) as keyof OperatingHours;
    const todayHours = restaurant.operatingHours[today];

    if (!todayHours || todayHours.closed) {
      return 'Closed today';
    }

    return `${this.formatTime(todayHours.open)} - ${this.formatTime(todayHours.close)}`;
  }

  /**
   * Format time from HH:mm to readable format
   */
  private formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }

  /**
   * Track restaurant interaction for analytics
   */
  trackRestaurantInteraction(action: string, restaurantId: string, details?: any): void {
    logToAirtable('restaurant_interactions', {
      action,
      restaurantId,
      restaurantName: this.restaurantCache.get(restaurantId)?.name,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get all available restaurants (for testing/development)
   */
  getAllRestaurants(): RestaurantIntegration[] {
    return Array.from(this.restaurantCache.values());
  }

  /**
   * Add or update restaurant integration data
   */
  updateRestaurantIntegration(restaurant: RestaurantIntegration): void {
    this.restaurantCache.set(restaurant.id, restaurant);
    
    // Generate outfit suggestion if not exists
    if (!this.outfitSuggestions.has(restaurant.id)) {
      const outfitSuggestion = this.generateOutfitSuggestion(restaurant);
      this.outfitSuggestions.set(restaurant.id, outfitSuggestion);
    }
  }
}

// Export singleton instance
export const restaurantIntegrationService = new RestaurantIntegrationService();