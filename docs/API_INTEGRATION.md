
# FUD Buddy API Integration Guide

This document provides detailed information on how to fully integrate FUD Buddy with AI and database services for production use.

## AI Integration

FUD Buddy is designed to work with OpenAI's GPT models, but the service layer is flexible enough to work with other AI providers.

### OpenAI Integration

1. **Sign up for an OpenAI API key**
   - Visit [OpenAI's platform](https://platform.openai.com/)
   - Create an account and generate an API key
   - Set up billing for production use

2. **Configure the AI service**
   - Add your API key in the FUD Buddy config page
   - Select your preferred model (GPT-3.5-Turbo or GPT-4)
   - Adjust temperature and other parameters as needed

3. **Update the AI service implementation**
   - Replace the mock implementation with actual API calls
   - Add proper error handling and rate limiting
   - Implement caching for frequent queries

**Example Production Code:**
```typescript
async sendMessage(message: string, chatType: AIChatType, previousMessages: any[] = []): Promise<string> {
  try {
    const response = await fetch(this.config.endpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS[chatType] },
          ...previousMessages,
          { role: 'user', content: message }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling AI API:", error);
    throw error;
  }
}
```

### Alternative AI Providers

FUD Buddy can also be adapted to work with other AI providers like:
- Perplexity AI
- Anthropic Claude
- Cohere
- Hugging Face

## Database Integration

### Airtable Integration

1. **Create an Airtable base**
   - Set up tables for Users, Interactions, and Analytics
   - Define fields and relationships

2. **Get your Airtable API key**
   - Visit [Airtable's developer portal](https://airtable.com/developers)
   - Create an API key with appropriate permissions

3. **Update the Airtable utility**
   - Replace mock implementations with actual API calls
   - Add proper error handling and rate limiting
   - Implement caching for frequent queries

**Example Production Code:**
```typescript
export const logToAirtable = async (table: string, data: any) => {
  try {
    const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${table}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        records: [
          {
            fields: {
              ...data,
              timestamp: data.timestamp || new Date().toISOString()
            }
          }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Airtable API request failed with status ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error logging to Airtable:', error);
    throw error;
  }
};
```

### SQL Database Integration

For more advanced use cases or higher scale, consider migrating to a SQL database like PostgreSQL with Supabase:

1. **Create a Supabase project**
   - Set up tables and relationships
   - Define access policies and authentication

2. **Update the database utility**
   - Create a new service for Supabase integration
   - Implement functions for CRUD operations
   - Add proper error handling and connection pooling

## Analytics Integration

### Google Analytics Integration

1. **Create a Google Analytics 4 property**
   - Set up a data stream for your web app
   - Get your measurement ID (G-XXXXXXX)

2. **Configure FUD Buddy**
   - Add your measurement ID in the config page
   - Customize event tracking as needed

### Facebook Pixel Integration

1. **Create a Facebook Pixel**
   - Set up a pixel in Facebook Business Manager
   - Get your Pixel ID

2. **Configure FUD Buddy**
   - Add your Pixel ID in the config page
   - Customize event tracking as needed

### Custom Analytics

For more advanced analytics needs:

1. **Set up a data warehouse**
   - Use BigQuery, Snowflake, or a similar solution
   - Create a data pipeline from your application

2. **Implement custom tracking**
   - Add events specific to your business needs
   - Set up dashboards and alerts
