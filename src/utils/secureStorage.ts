import CryptoJS from 'crypto-js';

class SecureStorage {
  private secretKey: string;
  
  constructor() {
    // Generate a key based on domain and a fixed salt
    this.secretKey = this.generateKey();
  }

  private generateKey(): string {
    const domain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const salt = 'fud-buddy-storage-salt-2025';
    return CryptoJS.SHA256(domain + salt).toString();
  }

  /**
   * Encrypt data before storing
   */
  private encrypt(data: any): string {
    try {
      const jsonString = JSON.stringify(data);
      return CryptoJS.AES.encrypt(jsonString, this.secretKey).toString();
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data after retrieving
   */
  private decrypt(encryptedData: string): any {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.secretKey);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.warn('Decryption failed:', error);
      return null;
    }
  }

  /**
   * Store encrypted data in localStorage
   */
  setSecureItem(key: string, value: any, expireMinutes?: number): void {
    try {
      const dataToStore = {
        value,
        timestamp: Date.now(),
        expires: expireMinutes ? Date.now() + (expireMinutes * 60 * 1000) : null
      };
      
      const encryptedValue = this.encrypt(dataToStore);
      localStorage.setItem(`secure_${key}`, encryptedValue);
    } catch (error) {
      console.error('Failed to store secure item:', error);
    }
  }

  /**
   * Retrieve and decrypt data from localStorage
   */
  getSecureItem(key: string): any {
    try {
      const encryptedValue = localStorage.getItem(`secure_${key}`);
      if (!encryptedValue) return null;
      
      const decryptedData = this.decrypt(encryptedValue);
      if (!decryptedData) return null;
      
      // Check expiration
      if (decryptedData.expires && Date.now() > decryptedData.expires) {
        this.removeSecureItem(key);
        return null;
      }
      
      return decryptedData.value;
    } catch (error) {
      console.warn('Failed to retrieve secure item:', error);
      return null;
    }
  }

  /**
   * Remove encrypted data from localStorage
   */
  removeSecureItem(key: string): void {
    localStorage.removeItem(`secure_${key}`);
  }

  /**
   * Clear all secure storage items
   */
  clearSecureStorage(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('secure_')) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Check if a secure item exists and is not expired
   */
  hasSecureItem(key: string): boolean {
    return this.getSecureItem(key) !== null;
  }

  /**
   * Store sensitive configuration data
   */
  setSecureConfig(config: Record<string, any>): void {
    this.setSecureItem('app_config', config);
  }

  /**
   * Retrieve sensitive configuration data
   */
  getSecureConfig(): Record<string, any> | null {
    return this.getSecureItem('app_config');
  }

  /**
   * Store user session data securely
   */
  setSessionData(sessionData: any, expireMinutes: number = 60): void {
    this.setSecureItem('user_session', sessionData, expireMinutes);
  }

  /**
   * Retrieve user session data
   */
  getSessionData(): any {
    return this.getSecureItem('user_session');
  }

  /**
   * Clear user session
   */
  clearSession(): void {
    this.removeSecureItem('user_session');
  }

  /**
   * Migrate existing localStorage data to secure storage
   */
  migrateFromUnsecureStorage(keys: string[]): void {
    keys.forEach(key => {
      const existingValue = localStorage.getItem(key);
      if (existingValue) {
        try {
          const parsedValue = JSON.parse(existingValue);
          this.setSecureItem(key, parsedValue);
          localStorage.removeItem(key); // Remove old unsecure item
          console.log(`Migrated ${key} to secure storage`);
        } catch {
          // If it's not JSON, store as string
          this.setSecureItem(key, existingValue);
          localStorage.removeItem(key);
          console.log(`Migrated ${key} to secure storage (as string)`);
        }
      }
    });
  }
}

// Export singleton instance
export const secureStorage = new SecureStorage();

// Helper functions for common secure storage operations
export const secureStorageHelpers = {
  /**
   * Store API configuration securely (never store actual API keys client-side!)
   */
  setApiConfig: (config: { endpoint?: string; model?: string }) => {
    secureStorage.setSecureItem('api_config', config);
  },

  /**
   * Get API configuration
   */
  getApiConfig: () => {
    return secureStorage.getSecureItem('api_config');
  },

  /**
   * Store user preferences securely
   */
  setUserPreferences: (preferences: any) => {
    secureStorage.setSecureItem('user_preferences', preferences, 7 * 24 * 60); // 7 days
  },

  /**
   * Get user preferences
   */
  getUserPreferences: () => {
    return secureStorage.getSecureItem('user_preferences');
  },

  /**
   * Store privacy consent securely
   */
  setPrivacyConsent: (consent: { accepted: boolean; timestamp: string; version: string }) => {
    secureStorage.setSecureItem('privacy_consent', consent);
  },

  /**
   * Get privacy consent
   */
  getPrivacyConsent: () => {
    return secureStorage.getSecureItem('privacy_consent');
  }
};