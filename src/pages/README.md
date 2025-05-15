
# FUD Buddy Pages

This directory contains all the top-level page components for the FUD Buddy application.

## Pages Overview

### Index.tsx

The main landing page of the application featuring:
- The FUD Buddy logo
- Three main action buttons (Where to Go, What to Order, Something Fun)
- Integration with the chat interface when an action is selected

**Key Features:**
- Tracks page views and user interactions
- Manages state for the active chat mode
- Handles transitions between home view and chat views

### Config.tsx

Configuration page for the application allowing users to:
- Set up AI API keys and model selection
- Configure analytics tracking IDs
- Save settings to localStorage

**Key Features:**
- Tab-based interface for different configuration sections
- Form validation
- Persistent configuration storage

### NotFound.tsx

Custom 404 page for handling invalid routes.

## Page Routing

FUD Buddy uses React Router for navigation:
- `/` - Main Index page
- `/config` - Configuration page
- `/*` - NotFound page for any undefined routes

## Analytics Integration

All pages include analytics tracking via the `analyticsService`. Page views are automatically tracked when pages are loaded.

## State Management

Each page manages its own state using React hooks. For application-wide state, consider implementing:

1. React Context for theme and user preferences
2. Tanstack Query for remote data fetching and caching
3. Local storage for persisting configuration
