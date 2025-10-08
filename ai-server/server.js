const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration
const REMOTE_OLLAMA_HOST = process.env.REMOTE_OLLAMA_HOST || 'seshat.noosworx.com';
const REMOTE_OLLAMA_PORT = process.env.REMOTE_OLLAMA_PORT || '11434';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'qwen2.5:14b';

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting - adjust based on your needs
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per windowMs
  message: 'Too many requests, please try again later.'
});
app.use(limiter);

// Response cache to reduce model calls
const responseCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// System prompts for different chat types
const SYSTEM_PROMPTS = {
  whereToGo: "You are a friendly food AI assistant specialized in recommending restaurants and food establishments. Provide helpful, concise suggestions based on user location and preferences. Focus on local establishments when possible. Keep responses under 200 words.",
  whatToOrder: "You are a friendly food AI assistant specialized in recommending menu items. When a user mentions a restaurant, suggest specific dishes they might enjoy. Be concise but descriptive about what makes each dish special. Keep responses under 150 words.",
  somethingFun: "You are a friendly food AI assistant specialized in suggesting fun and unique food experiences. Recommend unexpected food adventures, fusion cuisines, or novel dining concepts. Be creative, fun, and inspirational. Keep responses under 200 words.",
  home: "You are a friendly food AI assistant. Help with any food-related questions the user might have. Be helpful and concise. Keep responses under 150 words."
};

// Function to get cached response
function getCachedResponse(cacheKey) {
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.response;
  }
  return null;
}

// Function to cache response
function cacheResponse(cacheKey, response) {
  responseCache.set(cacheKey, {
    response,
    timestamp: Date.now()
  });
}

// Function to clean old cache entries
function cleanCache() {
  const now = Date.now();
  for (const [key, value] of responseCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      responseCache.delete(key);
    }
  }
}

// Clean cache every 15 minutes
setInterval(cleanCache, 15 * 60 * 1000);

// Main AI chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, chatType = 'home', previousMessages = [] } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    // Create cache key
    const cacheKey = `${chatType}:${message.toLowerCase().trim()}`;
    
    // Check cache first
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse) {
      console.log('Cache hit for:', cacheKey.substring(0, 50) + '...');
      return res.json({ response: cachedResponse, cached: true });
    }

    // Prepare the prompt with system context
    const systemPrompt = SYSTEM_PROMPTS[chatType] || SYSTEM_PROMPTS.home;
    const fullPrompt = `${systemPrompt}\n\nUser: ${message}\n\nAssistant:`;

    console.log(`Processing ${chatType} request: "${message.substring(0, 50)}..."`);

    // Make request to remote Ollama via SSH tunnel
    const ollamaResponse = await fetch(`http://localhost:11434/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 300
        }
      })
    });

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama request failed: ${ollamaResponse.status}`);
    }

    const data = await ollamaResponse.json();
    const aiResponse = data.response?.trim() || "I'm having trouble generating a response right now.";

    // Cache the response
    cacheResponse(cacheKey, aiResponse);

    console.log(`Response generated (${aiResponse.length} chars)`);
    
    res.json({ 
      response: aiResponse, 
      cached: false,
      model: DEFAULT_MODEL 
    });

  } catch (error) {
    console.error('Error in /api/chat:', error);
    
    // Fallback response
    const fallbackResponses = {
      whereToGo: "I'm having trouble with my recommendations right now, but I'd suggest checking out popular review sites like Yelp or Google Maps for great local restaurants in your area!",
      whatToOrder: "I'm experiencing some technical difficulties, but I'd recommend asking your server for their most popular dishes or checking online reviews for menu highlights!",
      somethingFun: "I'm having connectivity issues, but here's a fun idea: try a cuisine you've never had before, or visit a food truck festival if there's one near you!",
      home: "I'm experiencing some technical difficulties right now. Please try again in a moment, or feel free to ask me about restaurants, menu items, or food adventures!"
    };

    const fallback = fallbackResponses[req.body.chatType] || fallbackResponses.home;
    
    res.status(500).json({ 
      error: 'AI service temporarily unavailable', 
      response: fallback,
      fallback: true 
    });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test connection to Ollama
    const testResponse = await fetch(`http://localhost:11434/api/tags`);
    const isOllamaHealthy = testResponse.ok;
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      ollama: isOllamaHealthy ? 'connected' : 'disconnected',
      cache_size: responseCache.size,
      model: DEFAULT_MODEL
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get available models
app.get('/api/models', async (req, res) => {
  try {
    const response = await fetch(`http://localhost:11434/api/tags`);
    const data = await response.json();
    
    res.json({
      models: data.models || [],
      default: DEFAULT_MODEL
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch models',
      message: error.message
    });
  }
});

// Clear cache endpoint (for debugging)
app.post('/api/cache/clear', (req, res) => {
  responseCache.clear();
  res.json({ message: 'Cache cleared', size: responseCache.size });
});

// Start server
app.listen(PORT, () => {
  console.log(`🤖 AI Server running on port ${PORT}`);
  console.log(`📡 Remote Ollama: ${REMOTE_OLLAMA_HOST}:${REMOTE_OLLAMA_PORT}`);
  console.log(`🧠 Default Model: ${DEFAULT_MODEL}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;