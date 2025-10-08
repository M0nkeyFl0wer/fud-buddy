import { logToAirtable } from "@/utils/airtable";
import { userProfileService } from "./userProfileService";

export interface ImageGenerationRequest {
  restaurantName: string;
  dishName: string;
  userDescription?: string;
  style?: 'realistic' | 'artistic' | 'cartoon' | 'instagram';
  mood?: 'cozy' | 'elegant' | 'casual' | 'adventurous';
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  style: string;
  generatedAt: string;
  restaurantName: string;
  dishName: string;
}

class ImageGenerationService {
  private readonly STORAGE_KEY = 'fud-buddy-generated-images';
  private generatedImages: GeneratedImage[] = [];

  constructor() {
    this.loadStoredImages();
  }

  /**
   * Generate a personalized image of the user enjoying a meal
   */
  async generateMealExperience(request: ImageGenerationRequest): Promise<GeneratedImage> {
    try {
      // Get user profile for personalization
      const userProfile = userProfileService.getProfile();
      
      // Build personalized prompt
      const prompt = this.buildPersonalizedPrompt(request, userProfile);
      
      // Log the generation request
      logToAirtable('image_generations', {
        userId: userProfile?.id,
        restaurantName: request.restaurantName,
        dishName: request.dishName,
        prompt: prompt,
        timestamp: new Date().toISOString()
      });

      // In production, this would call actual AI image generation APIs like:
      // - OpenAI DALL-E 3
      // - Midjourney API
      // - Stable Diffusion
      // - Adobe Firefly
      
      const generatedImage = await this.mockImageGeneration(request, prompt);
      
      // Store the generated image
      this.generatedImages.push(generatedImage);
      this.saveImages();
      
      return generatedImage;
      
    } catch (error) {
      console.error('Image generation failed:', error);
      throw new Error('Failed to generate personalized meal image');
    }
  }

  /**
   * Build a personalized prompt based on user profile and request
   */
  private buildPersonalizedPrompt(
    request: ImageGenerationRequest, 
    userProfile: any
  ): string {
    let prompt = '';
    
    // Base scene setup
    prompt += `A photorealistic scene of someone enjoying ${request.dishName} at ${request.restaurantName}, `;
    
    // Add user characteristics if available
    if (userProfile) {
      // Infer some characteristics from profile (keeping it general for privacy)
      const timeOfDay = this.getMostCommonMealTime(userProfile);
      const socialContext = this.getPreferredSocialContext(userProfile);
      
      if (timeOfDay) {
        prompt += `during ${timeOfDay}, `;
      }
      
      if (socialContext === 'solo') {
        prompt += 'person dining alone with a satisfied smile, ';
      } else if (socialContext === 'couple') {
        prompt += 'couple sharing the meal together, ';
      } else {
        prompt += 'person enjoying the meal with friends, ';
      }
    }
    
    // Add restaurant atmosphere based on type
    if (request.restaurantName.toLowerCase().includes('fine') || 
        request.restaurantName.toLowerCase().includes('upscale')) {
      prompt += 'elegant restaurant interior with soft lighting, white tablecloths, wine glasses, ';
    } else if (request.restaurantName.toLowerCase().includes('casual') || 
               request.restaurantName.toLowerCase().includes('family')) {
      prompt += 'warm, welcoming casual restaurant atmosphere with wooden tables, ';
    } else if (request.restaurantName.toLowerCase().includes('food truck') || 
               request.restaurantName.toLowerCase().includes('street')) {
      prompt += 'outdoor street food setting with vibrant energy, ';
    } else {
      prompt += 'cozy restaurant interior with ambient lighting, ';
    }
    
    // Add mood and style
    switch (request.mood) {
      case 'elegant':
        prompt += 'sophisticated ambiance, premium presentation, refined atmosphere, ';
        break;
      case 'cozy':
        prompt += 'warm and inviting atmosphere, comfortable seating, homey feeling, ';
        break;
      case 'adventurous':
        prompt += 'exciting and vibrant setting, unique decor, energetic atmosphere, ';
        break;
      default:
        prompt += 'relaxed and comfortable dining atmosphere, ';
    }
    
    // Add specific dish details
    prompt += `the ${request.dishName} beautifully plated and looking absolutely delicious, `;
    
    // Add technical photo specifications
    switch (request.style) {
      case 'realistic':
        prompt += 'shot with professional camera, natural lighting, high detail, photojournalistic style';
        break;
      case 'artistic':
        prompt += 'artistic composition, dramatic lighting, fine art photography style';
        break;
      case 'instagram':
        prompt += 'Instagram-worthy shot, perfect for food blogging, bright and appealing';
        break;
      case 'cartoon':
        prompt += 'illustrated cartoon style, colorful and whimsical, animated feel';
        break;
      default:
        prompt += 'natural photography, appealing food presentation';
    }
    
    return prompt;
  }

  /**
   * Mock image generation (placeholder for real AI service)
   */
  private async mockImageGeneration(
    request: ImageGenerationRequest, 
    prompt: string
  ): Promise<GeneratedImage> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In production, this would be a real generated image URL
    // For now, we'll use a placeholder service that can generate food images
    const mockImageUrl = this.getMockImageUrl(request);
    
    return {
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: mockImageUrl,
      prompt: prompt,
      style: request.style || 'realistic',
      generatedAt: new Date().toISOString(),
      restaurantName: request.restaurantName,
      dishName: request.dishName
    };
  }

  /**
   * Get mock image URL (in production, this would be the actual generated image)
   */
  private getMockImageUrl(request: ImageGenerationRequest): string {
    // Using a food image placeholder service
    const width = 512;
    const height = 512;
    
    // Create a deterministic but varied image based on the dish name
    const dishHash = this.hashString(request.dishName);
    const imageNumber = (dishHash % 50) + 1; // Use hash to pick from 50 sample food images
    
    // Using Lorem Picsum with a food-focused approach
    // In production, this would be the actual AI-generated image URL
    return `https://picsum.photos/seed/${request.dishName.replace(/\s+/g, '')}/512/512`;
  }

  /**
   * Simple hash function for deterministic mock images
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get most common meal time from user profile
   */
  private getMostCommonMealTime(userProfile: any): string | null {
    if (!userProfile.interactions || userProfile.interactions.length === 0) {
      return null;
    }
    
    const hours = userProfile.interactions.map((interaction: any) => 
      new Date(interaction.timestamp).getHours()
    );
    
    const averageHour = hours.reduce((sum: number, hour: number) => sum + hour, 0) / hours.length;
    
    if (averageHour < 10) return 'breakfast';
    if (averageHour < 15) return 'lunch';
    if (averageHour < 18) return 'afternoon';
    if (averageHour < 22) return 'dinner';
    return 'late night';
  }

  /**
   * Get preferred social context from user profile
   */
  private getPreferredSocialContext(userProfile: any): string {
    if (!userProfile.preferences) return 'casual';
    
    const groupSize = userProfile.preferences.groupSize;
    if (groupSize === 'solo') return 'solo';
    if (groupSize === 'couple') return 'couple';
    return 'group';
  }

  /**
   * Get all generated images for the current user
   */
  getUserGeneratedImages(): GeneratedImage[] {
    return this.generatedImages.slice().reverse(); // Most recent first
  }

  /**
   * Get a specific generated image by ID
   */
  getImageById(id: string): GeneratedImage | null {
    return this.generatedImages.find(img => img.id === id) || null;
  }

  /**
   * Delete a generated image
   */
  deleteImage(id: string): boolean {
    const index = this.generatedImages.findIndex(img => img.id === id);
    if (index > -1) {
      this.generatedImages.splice(index, 1);
      this.saveImages();
      return true;
    }
    return false;
  }

  /**
   * Load stored images from localStorage
   */
  private loadStoredImages(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.generatedImages = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load stored images:', error);
      this.generatedImages = [];
    }
  }

  /**
   * Save images to localStorage
   */
  private saveImages(): void {
    try {
      // Keep only the last 20 images to prevent storage bloat
      const imagesToSave = this.generatedImages.slice(-20);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(imagesToSave));
      this.generatedImages = imagesToSave;
    } catch (error) {
      console.error('Failed to save generated images:', error);
    }
  }

  /**
   * Clear all generated images
   */
  clearAllImages(): void {
    this.generatedImages = [];
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Get image generation statistics
   */
  getGenerationStats(): {
    totalGenerated: number;
    favoriteRestaurant: string | null;
    favoriteDish: string | null;
    mostUsedStyle: string | null;
  } {
    const restaurantCounts: Record<string, number> = {};
    const dishCounts: Record<string, number> = {};
    const styleCounts: Record<string, number> = {};
    
    this.generatedImages.forEach(img => {
      restaurantCounts[img.restaurantName] = (restaurantCounts[img.restaurantName] || 0) + 1;
      dishCounts[img.dishName] = (dishCounts[img.dishName] || 0) + 1;
      styleCounts[img.style] = (styleCounts[img.style] || 0) + 1;
    });
    
    const getFavorite = (counts: Record<string, number>) => {
      const entries = Object.entries(counts);
      if (entries.length === 0) return null;
      return entries.sort(([,a], [,b]) => b - a)[0][0];
    };
    
    return {
      totalGenerated: this.generatedImages.length,
      favoriteRestaurant: getFavorite(restaurantCounts),
      favoriteDish: getFavorite(dishCounts),
      mostUsedStyle: getFavorite(styleCounts)
    };
  }
}

// Export singleton instance
export const imageGenerationService = new ImageGenerationService();
