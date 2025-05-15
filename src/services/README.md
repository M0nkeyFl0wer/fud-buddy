
# FUD Buddy Service Layer

This directory contains service modules that handle external integrations for the FUD Buddy application.

## AI Service

The AI service (`aiService.ts`) provides integration with Large Language Models (LLMs) like OpenAI's GPT. It handles:

- Chat interactions with different specialized prompts based on the feature
- Context management for maintaining conversation history
- Mock responses for development when API keys aren't available

### Configuration

The AI service can be configured with:
- API key
- Model selection
- Custom endpoint (for self-hosted models)

### Usage Example

```typescript
import { aiService, AIChatType } from '@/services/aiService';

// Send a message to the AI
const response = await aiService.sendMessage(
  "What restaurants are near me?", 
  'whereToGo',
  previousMessages // optional array of previous messages for context
);
```

## Analytics Service

The analytics service (`analyticsService.ts`) handles user behavior tracking through:

- Google Analytics integration
- Facebook Pixel integration
- Internal tracking via Airtable

### Configuration

Analytics can be configured with:
- Google Analytics ID
- Facebook Pixel ID

### Usage Example

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
