
# FUD Buddy - AI Food Recommendation App

## Overview

FUD Buddy is an AI-powered food recommendation application that helps users discover:
- Where to go for food
- What to order at restaurants
- Fun and unique food experiences

The app combines modern web technologies with AI to deliver personalized recommendations.

## Architecture

FUD Buddy is built with:

- **Frontend**: React + TypeScript + Vite
- **UI Framework**: Tailwind CSS + shadcn/ui
- **State Management**: React Hooks + Context
- **Analytics**: Google Analytics & Facebook Pixel integration
- **Data Storage**: Airtable (mock implementation currently)
- **AI Integration**: OpenAI GPT (mock implementation currently)

## Key Features

- Conversational UI for natural interaction
- Three specialized recommendation modes
- Analytics tracking for user behavior
- Dark mode support
- Responsive design for all devices

## Setup & Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/fud-buddy.git
cd fud-buddy
```

2. Install dependencies:
```
npm install
```

3. Start the development server:
```
npm run dev
```

4. Configure the application:
   - Navigate to the `/config` path in the app
   - Set up your AI provider API key
   - Configure analytics tracking IDs

## Configuration Guide

FUD Buddy requires configuration in two key areas:

### AI Integration

1. Obtain an API key from OpenAI
2. Add your key in the `/config` page under AI Integration tab
3. Select your preferred AI model

### Analytics Setup

1. Create Google Analytics 4 property and obtain measurement ID
2. Create Facebook Pixel and obtain Pixel ID
3. Add these IDs in the `/config` page under Analytics tab

## API Integration

FUD Buddy is designed to connect with OpenAI's GPT models through a service layer that handles:
- API authentication
- Context management
- Specialized prompts for each recommendation type

The service gracefully falls back to mock responses during development or when API keys aren't configured.

## Database Integration

The current implementation uses mock Airtable functions for data persistence. The planned database schema includes:

- **Users**: User profiles and preferences
- **Interactions**: Chat history and recommendations
- **Analytics**: User behavior and events
- **Restaurants**: Curated restaurant data

## Next Steps for Production

1. **AI Integration**: Replace mock implementation with actual OpenAI API calls
2. **Database**: Complete Airtable integration or migrate to SQL/NoSQL database
3. **Authentication**: Add user accounts and profile management
4. **Testing**: Implement comprehensive test suite
5. **Caching**: Add response caching for improved performance

## Migration to Windsuft

Consider migrating to Windsuft when:

1. **Scale Requirements**: You need to handle thousands of concurrent users
2. **Complex Backend Logic**: Your backend requirements exceed what Airtable can provide
3. **Performance Bottlenecks**: You need more control over server infrastructure
4. **Advanced Authentication**: You need enterprise-grade auth with complex permissions
5. **Deployment Flexibility**: You need specialized deployment configurations

The migration path would involve:
1. Extracting core business logic
2. Setting up Windsuft infrastructure
3. Migrating data from Airtable
4. Deploying as a decoupled frontend/backend architecture

## Contributing

Contributions are welcome! Please check the open issues or submit a pull request.

## License

[MIT License](LICENSE)
