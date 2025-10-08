# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

FUD Buddy is a React-based food recommendation application that helps users decide where to eat and what to order. The app uses a conversational AI interface with three main features:
- **Where to Go**: Location-based restaurant recommendations
- **What to Order**: Menu item suggestions for specific restaurants  
- **Something Fun**: Creative food adventure recommendations

The application is built with TypeScript + React and uses a mock AI service that's designed to be easily replaced with real AI providers like OpenAI GPT.

## Development Commands

```bash
# Install dependencies (uses both bun and npm)
bun install
# or
npm install

# Start development server (port 8080)
bun dev
# or 
npm run dev

# Build for production
npm run build

# Build for development mode
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Architecture Overview

### Core Components Structure
- **App.tsx**: Main app shell with routing and theme management
- **pages/Index.tsx**: Home page with three main action buttons that launch chat interfaces
- **components/FUDChat.tsx**: Central chat interface component that handles all conversation flows
- **services/aiService.ts**: AI abstraction layer with mock responses (designed for easy real AI integration)
- **services/analyticsService.ts**: Analytics tracking with Google Analytics and Facebook Pixel support

### Key Architectural Patterns

**Chat Type System**: The app uses a type-safe `AIChatType` system (`'whereToGo' | 'whatToOrder' | 'somethingFun' | 'home'`) that flows through:
- Initial prompts (different greeting for each chat type)
- System prompts for AI (different personality/focus per type)
- Mock responses (different response patterns)
- Analytics tracking (different event categories)

**Service Layer Architecture**: The app uses a service-oriented architecture:
- `aiService`: Handles all AI communication with pluggable providers
- `analyticsService`: Manages multiple analytics providers (Google, Facebook, internal)
- `airtable.ts`: Database abstraction (currently mock, designed for real integration)

**Configuration System**: The app includes a `/config` route for setting up API keys and analytics IDs, making it easy to configure for production without code changes.

### Component Library
Uses shadcn/ui components extensively - most UI components are in `src/components/ui/` and follow the shadcn patterns. The app also includes custom components:
- `ActionButton`: Main feature buttons on home screen
- `ChatMessage`: Individual chat message rendering
- `ChatInput`: Chat input with send functionality
- `RobotLogo`: Animated SVG logo component

## Development Notes

### AI Service Integration
The `aiService.ts` contains commented production code for OpenAI integration. To integrate:
1. Uncomment the actual API call code in `sendMessage()`
2. Add API key via the `/config` route
3. Configure desired model and parameters

### Mock Data Patterns
Mock services are designed to be easily replaceable:
- `getMockResponse()` in aiService provides realistic demo responses
- `airtable.ts` includes mock database operations that mirror real API patterns
- All mocks include console logging to help with development

### Analytics Integration
Analytics are set up for production with Google Analytics and Facebook Pixel:
- IDs can be configured via `/config` route
- Events are automatically tracked for user interactions
- Custom events can be added via `analyticsService.trackEvent()`

### State Management
- Uses React Query for server state management
- Local state with useState for UI state
- Theme persistence in localStorage
- No global state management (Redux/Zustand) - kept simple for the scope

### Styling System
- Tailwind CSS with custom color scheme (`fud-teal`, etc.)
- Dark mode support with system/manual toggle
- Responsive design focused on mobile-first
- Custom animations for chat bubbles and loading states

## Testing Strategy
Currently no test files exist. When adding tests, focus on:
- Service layer unit tests (aiService, analyticsService)
- Component integration tests for chat flows
- Mock API response validation