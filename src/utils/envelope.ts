
// This is a mock API envelope file that will be used to send data to the backend

// Mock function to send data to backend/Airtable
export const sendToBackend = async (
  endpoint: string,
  data: unknown
): Promise<{ success: true; message: string }> => {
  // In a real implementation, this would make an API call
  console.log(`[API] Sending to ${endpoint}:`, data);
  
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`[API] Response from ${endpoint}`);
      resolve({ success: true, message: 'Data successfully processed' });
    }, 500);
  });
};

// Mock function to get recommendations
type RecommendationParams = {
  type?: string;
  [key: string]: unknown;
};

export const getRecommendations = async (params: RecommendationParams): Promise<unknown> => {
  console.log('[API] Getting recommendations with params:', params);
  
  // Simulate API call delay
  return new Promise((resolve) => {
    setTimeout(() => {
      // Return mock data based on request type
      if (params.type === 'location') {
        resolve({
          places: [
            { name: 'The Hungry Robot', rating: 4.7, cuisine: 'American', priceLevel: '$$' },
            { name: 'Byte Bistro', rating: 4.5, cuisine: 'Fusion', priceLevel: '$$$' },
            { name: 'Data Diner', rating: 4.2, cuisine: 'Breakfast', priceLevel: '$$' }
          ]
        });
      } else if (params.type === 'menu') {
        resolve({
          items: [
            { name: 'Truffle Mushroom Burger', rating: 4.9, price: '$15' },
            { name: 'Sweet Potato Fries', rating: 4.8, price: '$6' }
          ]
        });
      } else {
        resolve({
          suggestion: {
            name: 'Korean Corn Dog',
            place: 'Seoul Food',
            distance: '10 minutes away'
          }
        });
      }
    }, 1000);
  });
};

// Mock fingerprinting function
export const generateFingerprint = () => {
  return {
    sessionId: Math.random().toString(36).substring(2, 15),
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    language: navigator.language,
    screenSize: `${window.screen.width}x${window.screen.height}`
  };
};
