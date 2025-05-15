
# FUD Buddy Components

This directory contains all the UI components used throughout the FUD Buddy application.

## Overview

Components are organized by function and follow React best practices. Each component is designed to be reusable, well-typed with TypeScript, and styled with Tailwind CSS.

## Key Components

### FUDChat

The core conversational interface for the application. It handles:
- Displaying chat messages
- Sending user input to AI service
- Showing typing indicators
- Managing chat history

**Usage Example:**
```tsx
<FUDChat 
  chatType="whereToGo"
  onBack={() => navigate('/')} 
/>
```

### RobotLogo

An interactive logo component with subtle animation. Features:
- Mouse-tracking animation
- Accessibility considerations (respects reduced motion preference)
- Responsive sizing

**Usage Example:**
```tsx
<RobotLogo size={280} />
```

### ActionButton

Custom button component for the main action items on the home screen.

**Usage Example:**
```tsx
<ActionButton 
  label="Where to Go" 
  icon={<MapPin />}
  onClick={() => handleActionClick('whereToGo')} 
/>
```

### ChatInput

Text input component for the chat interface with send button.

**Usage Example:**
```tsx
<ChatInput 
  onSend={handleSendMessage} 
  placeholder="Enter your location..." 
/>
```

### ChatMessage

Styled message component for displaying user and bot messages.

**Usage Example:**
```tsx
<ChatMessage 
  content="Hello, how can I help you today?" 
  type="bot" 
/>
```

### ThemeToggle

Dark/light mode toggle with icons.

**Usage Example:**
```tsx
<ThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
```

### PrivacyToggle

Toggle for enabling/disabling analytics tracking.

**Usage Example:**
```tsx
<PrivacyToggle enabled={trackingEnabled} onToggle={handleToggleChange} />
```

### ConfigLink

Navigation link to the configuration page.

**Usage Example:**
```tsx
<ConfigLink />
```

## UI Component Library

FUD Buddy uses the shadcn/ui component library, which provides:
- Accessible UI components
- Consistent theming
- Dark mode support
- Responsive design

These UI components are in the `ui` subdirectory and should be used when possible for consistent design.
