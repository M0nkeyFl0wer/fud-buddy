import { apiClient } from './api';

export interface ImageGenerationRequest {
  prompt: string;
  style?: 'caricature' | 'cartoon' | 'realistic';
  userPreferences?: {
    location?: string;
    cuisine?: string[];
  };
}

export interface ImageGenerationResponse {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  imageUrl?: string;
  error?: string;
}

class ImageService {
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  async generate(
    request: ImageGenerationRequest,
    onProgress?: (status: ImageGenerationResponse) => void
  ): Promise<ImageGenerationResponse> {
    const response = await apiClient.post<ImageGenerationResponse>(
      '/api/images/generate',
      request
    );

    if (response.status === 'completed') {
      return response;
    }

    if (response.status === 'processing') {
      return this.pollForResult(response.id, onProgress);
    }

    return response;
  }

  private async pollForResult(
    imageId: string,
    onProgress?: (status: ImageGenerationResponse) => void
  ): Promise<ImageGenerationResponse> {
    return new Promise((resolve) => {
      this.pollInterval = setInterval(async () => {
        try {
          const status = await apiClient.get<ImageGenerationResponse>(
            `/api/images/${imageId}/status`
          );
          
          onProgress?.(status);

          if (status.status === 'completed' || status.status === 'failed') {
            if (this.pollInterval) {
              clearInterval(this.pollInterval);
            }
            resolve(status);
          }
        } catch (error) {
          if (this.pollInterval) {
            clearInterval(this.pollInterval);
          }
          resolve({
            id: imageId,
            status: 'failed',
            error: 'Failed to check image status',
          });
        }
      }, 2000);
    });
  }

  cancelPoll(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }
}

export const imageService = new ImageService();
