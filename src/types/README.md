
# FUD Buddy Type Definitions

This directory contains TypeScript type definitions used throughout the FUD Buddy application.

## Type Definitions Overview

### Window Extensions (`window.d.ts`)

Extends the global Window interface to add types for third-party scripts:

```typescript
interface Window {
  dataLayer?: any[];  // Google Analytics data layer
  gtag?: (...args: any[]) => void;  // Google Analytics gtag function
  fbq?: (...args: any[]) => void;  // Facebook Pixel function
}
```

## Best Practices for Types

When extending or creating new types:

1. **Use Specific Types**: Avoid using `any` when possible
2. **Document Complex Types**: Add JSDoc comments for complex types
3. **Namespace Related Types**: Group related types together
4. **Export Types**: Make types available for reuse throughout the application

## Suggested Type Additions for Production

For a production implementation, consider adding these type definitions:

### User Types
```typescript
interface User {
  id: string;
  preferences: UserPreferences;
  history: ChatHistory[];
}

interface UserPreferences {
  dietaryRestrictions: string[];
  favoritesCuisines: string[];
  priceRange: 'low' | 'medium' | 'high';
}
```

### Chat Types
```typescript
interface ChatMessage {
  id: string;
  content: string;
  type: 'user' | 'bot';
  timestamp: string;
}

interface ChatHistory {
  id: string;
  messages: ChatMessage[];
  chatType: AIChatType;
  createdAt: string;
}
```

### Restaurant Types
```typescript
interface Restaurant {
  id: string;
  name: string;
  location: Location;
  cuisineType: string[];
  priceRange: 'low' | 'medium' | 'high';
  rating: number;
  recommendations: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  dietaryInfo: string[];
}

interface Location {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  }
}
```
