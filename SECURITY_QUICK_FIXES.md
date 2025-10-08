# Security Quick Fixes Implementation Guide

This document provides immediate code changes to address the most critical security vulnerabilities.

## 1. Fix XSS Vulnerability in ChatMessage Component

**Current vulnerable code:**
```tsx
// src/components/ChatMessage.tsx
<div dangerouslySetInnerHTML={{ __html: content }} />
```

**Fixed secure code:**
```tsx
// src/components/ChatMessage.tsx
import DOMPurify from 'dompurify';

const ChatMessage: React.FC<ChatMessageProps> = ({ content, type }) => {
  const sanitizedContent = DOMPurify.sanitize(content);
  
  return (
    <div className={`chat-bubble-${type}`}>
      {type === 'bot' ? (
        <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
      ) : (
        <div>{content}</div> // User messages as plain text only
      )}
    </div>
  );
};
```

**Installation required:**
```bash
npm install dompurify @types/dompurify
```

## 2. Add Input Validation to Chat Input

**Enhanced ChatInput component:**
```tsx
// src/components/ChatInput.tsx
const ChatInput: React.FC<ChatInputProps> = ({ onSend, placeholder }) => {
  const [message, setMessage] = useState('');
  const MAX_MESSAGE_LENGTH = 1000;

  const validateMessage = (msg: string): boolean => {
    // Check length
    if (msg.length > MAX_MESSAGE_LENGTH) return false;
    
    // Basic XSS pattern detection
    const xssPatterns = /<script|javascript:|on\w+=/i;
    if (xssPatterns.test(msg)) return false;
    
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    
    if (trimmedMessage && validateMessage(trimmedMessage)) {
      onSend(trimmedMessage);
      setMessage('');
    } else {
      // Show error message to user
      alert('Invalid message. Please check your input.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={placeholder}
        maxLength={MAX_MESSAGE_LENGTH}
        className="flex-1 px-4 py-3 rounded-full border-2 border-fud-teal focus:outline-none focus:ring-2 focus:ring-fud-teal"
      />
      <button 
        type="submit" 
        disabled={message.length === 0 || message.length > MAX_MESSAGE_LENGTH}
        className="bg-fud-teal text-white px-6 py-3 rounded-full hover:bg-opacity-90 transition-opacity disabled:opacity-50"
      >
        Send ({message.length}/{MAX_MESSAGE_LENGTH})
      </button>
    </form>
  );
};
```

## 3. Secure AI Server Input Validation

**Enhanced server.js validation:**
```javascript
// ai-server/server.js
const validator = require('validator');
const rateLimit = require('express-rate-limit');

// Stricter rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Reduced to 5 requests per minute
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Input validation middleware
const validateChatInput = (req, res, next) => {
  const { message, chatType, previousMessages } = req.body;
  
  // Validate message
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required and must be a string' });
  }
  
  // Length validation
  if (message.length > 1000) {
    return res.status(400).json({ error: 'Message too long' });
  }
  
  // XSS protection
  if (!validator.isLength(message, { min: 1, max: 1000 })) {
    return res.status(400).json({ error: 'Invalid message length' });
  }
  
  // Sanitize message
  req.body.message = validator.escape(message);
  
  // Validate chatType
  const validChatTypes = ['whereToGo', 'whatToOrder', 'somethingFun', 'home'];
  if (chatType && !validChatTypes.includes(chatType)) {
    return res.status(400).json({ error: 'Invalid chat type' });
  }
  
  // Validate previousMessages array
  if (previousMessages && !Array.isArray(previousMessages)) {
    return res.status(400).json({ error: 'Previous messages must be an array' });
  }
  
  next();
};

// Apply validation to chat endpoint
app.post('/api/chat', limiter, validateChatInput, async (req, res) => {
  // ... rest of chat handler
});
```

**Installation required:**
```bash
cd ai-server && npm install validator
```

## 4. Add Content Security Policy

**Create security middleware file:**
```javascript
// ai-server/middleware/security.js
const helmet = require('helmet');

const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.openai.com", "https://ipinfo.io"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

module.exports = securityMiddleware;
```

**Apply in server.js:**
```javascript
// ai-server/server.js
const securityMiddleware = require('./middleware/security');

// Apply security middleware
app.use(securityMiddleware);
```

## 5. Privacy Consent Modal

**Create PrivacyConsentModal component:**
```tsx
// src/components/PrivacyConsentModal.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const PrivacyConsentModal: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('privacy-consent');
    if (!consent) {
      setShowModal(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('privacy-consent', 'accepted');
    localStorage.setItem('privacy-consent-date', new Date().toISOString());
    setShowModal(false);
  };

  const handleDecline = () => {
    localStorage.setItem('privacy-consent', 'declined');
    // Disable tracking and data collection
    localStorage.setItem('tracking-disabled', 'true');
    setShowModal(false);
  };

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Privacy Notice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            We collect and process personal data to provide personalized food recommendations. 
            This includes location data, browsing behavior, and preferences.
          </p>
          <div className="space-y-2">
            <h4 className="font-medium">Data We Collect:</h4>
            <ul className="text-sm text-gray-600 list-disc list-inside">
              <li>Location information</li>
              <li>Device and browser information</li>
              <li>Usage patterns and preferences</li>
              <li>Chat interactions</li>
            </ul>
          </div>
          <p className="text-sm text-gray-600">
            You can withdraw consent at any time in Settings.
          </p>
          <div className="flex space-x-2">
            <Button onClick={handleAccept} className="flex-1">Accept</Button>
            <Button onClick={handleDecline} variant="outline" className="flex-1">Decline</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrivacyConsentModal;
```

## 6. Secure Local Storage Implementation

**Create secure storage utility:**
```typescript
// src/utils/secureStorage.ts
import CryptoJS from 'crypto-js';

class SecureStorage {
  private secretKey = 'fud-buddy-key-' + window.location.hostname;

  encrypt(data: any): string {
    return CryptoJS.AES.encrypt(JSON.stringify(data), this.secretKey).toString();
  }

  decrypt(encryptedData: string): any {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, this.secretKey);
      return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch {
      return null;
    }
  }

  setSecureItem(key: string, value: any): void {
    const encryptedValue = this.encrypt(value);
    localStorage.setItem(key, encryptedValue);
  }

  getSecureItem(key: string): any {
    const encryptedValue = localStorage.getItem(key);
    if (!encryptedValue) return null;
    return this.decrypt(encryptedValue);
  }

  removeSecureItem(key: string): void {
    localStorage.removeItem(key);
  }
}

export const secureStorage = new SecureStorage();
```

**Installation required:**
```bash
npm install crypto-js @types/crypto-js
```

## 7. Environment Variables Setup

**Create .env.example file:**
```bash
# .env.example
# AI Configuration
OPENAI_API_KEY=your_openai_api_key_here
AI_MODEL=gpt-3.5-turbo

# Analytics
GOOGLE_ANALYTICS_ID=GA4_ID_HERE
FACEBOOK_PIXEL_ID=FB_PIXEL_ID_HERE

# Security
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here

# External Services
IPINFO_API_KEY=your_ipinfo_api_key
GEOCODING_API_KEY=your_geocoding_api_key
```

**Update vite.config.ts to use environment variables:**
```typescript
// vite.config.ts
export default defineConfig(({ mode }) => ({
  define: {
    // Only expose non-sensitive config
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __APP_ENV__: JSON.stringify(mode),
  },
  // ... rest of config
}));
```

## 8. Immediate Action Items

### Run these commands immediately:

```bash
# Fix dependency vulnerabilities
npm audit fix

# Install security packages
npm install dompurify @types/dompurify crypto-js @types/crypto-js
cd ai-server && npm install validator helmet

# Check for hardcoded secrets
grep -r "api.*key\|secret\|password" src/ --exclude-dir=node_modules

# Install security linting
npm install -D eslint-plugin-security
```

### Add to package.json scripts:
```json
{
  "scripts": {
    "security-audit": "npm audit && eslint --ext .js,.ts,.tsx src/ --plugin security",
    "security-check": "grep -r \"api.*key\\|secret\\|password\" src/ --exclude-dir=node_modules || echo 'No secrets found'"
  }
}
```

## Priority Implementation Order:

1. **Immediate (Today):**
   - Fix dependency vulnerabilities
   - Add input validation
   - Fix XSS vulnerability

2. **This Week:**
   - Implement privacy consent modal
   - Add security headers
   - Secure local storage

3. **Next Week:**
   - Move API keys to server-side
   - Implement authentication
   - Add comprehensive logging

Remember: **DO NOT deploy to production** until at least the immediate fixes are implemented and tested.