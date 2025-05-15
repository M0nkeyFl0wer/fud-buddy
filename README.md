
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
- **UI Framework**: Tailwind CSS
- **State Management**: React Hooks + Context
- **Analytics**: Custom integration with Google Analytics & Facebook Pixel
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
git clone https://your-github-repo/fud-buddy.git
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

## API Integration

FUD Buddy supports integration with OpenAI's GPT models through a service layer that handles:
- API authentication
- Context management
- Specialized prompts for each recommendation type

The service is designed to gracefully fall back to mock responses during development or when API keys aren't configured.

## Database Integration

The current implementation uses mock Airtable functions for data persistence. The planned database schema includes:

- **Users**: User profiles and preferences
- **Interactions**: Chat history and recommendations
- **Analytics**: User behavior and events
- **Restaurants**: Curated restaurant data

## Analytics Implementation

FUD Buddy supports:
1. Google Analytics for general usage metrics
2. Facebook Pixel for conversion tracking
3. Internal analytics via Airtable for custom insights

## Next Steps for Production

1. **AI Integration**: Replace mock implementation with actual OpenAI API calls
2. **Database**: Complete Airtable integration or migrate to SQL/NoSQL database
3. **Authentication**: Add user accounts and profile management
4. **Testing**: Implement comprehensive test suite
5. **Caching**: Add response caching for improved performance
6. **Mobile App**: Consider React Native version for native mobile experience

## When to Consider Migration to Windsuft

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
