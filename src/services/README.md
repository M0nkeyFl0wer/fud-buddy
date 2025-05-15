
# FUD Buddy Service Layer

This directory contains service modules that handle external integrations and business logic for the FUD Buddy application.

## Services Overview

### AI Service (`aiService.ts`)

Provides integration with Large Language Models (LLMs) like OpenAI's GPT. The service handles:

- Chat interactions with different specialized prompts based on the feature
- Context management for maintaining conversation history
- Mock responses for development when API keys aren't available

**Configuration**:
The AI service can be configured with:
- API key
- Model selection
- Custom endpoint (for self-hosted models)

**Usage Example**:
```typescript
import { aiService, AIChatType } from '@/services/aiService';

// Send a message to the AI
const response = await aiService.sendMessage(
  "What restaurants are near me?", 
  'whereToGo',
  previousMessages // optional array of previous messages for context
);
```

### Analytics Service (`analyticsService.ts`)

Handles user behavior tracking through multiple platforms:
- Google Analytics integration
- Facebook Pixel integration
- Internal tracking via Airtable

**Configuration**:
Analytics can be configured with:
- Google Analytics ID
- Facebook Pixel ID

**Usage Example**:
```typescript
import { analyticsService } from '@/services/analyticsService';

// Track page view
analyticsService.trackPageView('/home', 'Home Page');

// Track custom event
analyticsService.trackEvent('button_click', { 
  button_id: 'submit',
  page: '/checkout' 
});
```

## Implementation Details

### AI Integration

The AI service is currently implemented with mock responses but is designed to be easily connected to a real AI provider like OpenAI. The service uses specialized system prompts for each chat type to deliver more relevant responses.

For production:
1. Set up proper API key management
2. Implement rate limiting and error handling
3. Add response caching to reduce API usage

### Analytics Integration

The analytics service supports multiple tracking systems simultaneously and provides a unified interface for the application. It includes:

1. **Initialization**: Dynamically loads tracking scripts
2. **Page Tracking**: Records user navigation
3. **Event Tracking**: Records user interactions
4. **Internal Logging**: Stores analytics in Airtable for custom reporting

## Production Considerations

When moving to production:

1. **API Keys**: Store API keys securely (not in localStorage)
2. **Error Handling**: Add more robust error handling and retry logic
3. **Performance**: Consider lazy loading services to improve initial load time
4. **Privacy**: Implement proper user consent management for analytics
