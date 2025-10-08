
import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { toast } from '@/hooks/use-toast';

interface ChatInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, placeholder = "Type your message..." }) => {
  const [message, setMessage] = useState('');
  const MAX_MESSAGE_LENGTH = 1000;

  const validateMessage = (msg: string): { isValid: boolean; error?: string } => {
    // Check length
    if (msg.length > MAX_MESSAGE_LENGTH) {
      return { isValid: false, error: `Message too long (${msg.length}/${MAX_MESSAGE_LENGTH} characters)` };
    }

    // Check for minimum length
    if (msg.length < 1) {
      return { isValid: false, error: 'Message cannot be empty' };
    }

    // Basic XSS pattern detection
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi
    ];
    
    for (const pattern of xssPatterns) {
      if (pattern.test(msg)) {
        return { isValid: false, error: 'Message contains potentially unsafe content' };
      }
    }

    // Check for excessive HTML tags
    const htmlTagCount = (msg.match(/<[^>]+>/g) || []).length;
    if (htmlTagCount > 3) {
      return { isValid: false, error: 'Too many HTML tags detected' };
    }

    return { isValid: true };
  };

  const sanitizeMessage = (msg: string): string => {
    // First sanitize with DOMPurify to remove dangerous HTML
    const sanitized = DOMPurify.sanitize(msg, {
      ALLOWED_TAGS: [], // Remove all HTML tags
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    });

    // Additional cleanup
    return sanitized
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, '') // Remove control characters
      .trim();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    // Validate message
    const validation = validateMessage(trimmedMessage);
    if (!validation.isValid) {
      toast({
        title: "Invalid Message",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    // Sanitize message
    const sanitizedMessage = sanitizeMessage(trimmedMessage);
    
    // Double-check after sanitization
    if (!sanitizedMessage || sanitizedMessage.length === 0) {
      toast({
        title: "Invalid Message",
        description: "Message contains only invalid content",
        variant: "destructive"
      });
      return;
    }

    // Send sanitized message
    onSend(sanitizedMessage);
    setMessage('');
  };

  const isMessageTooLong = message.length > MAX_MESSAGE_LENGTH;
  const isMessageEmpty = message.trim().length === 0;
  const isValidLength = message.length > 0 && message.length <= MAX_MESSAGE_LENGTH;

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
      <div className="flex-1 relative">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          maxLength={MAX_MESSAGE_LENGTH + 100} // Allow typing beyond limit to show warning
          className={`w-full px-4 py-3 rounded-full border-2 focus:outline-none focus:ring-2 transition-colors ${
            isMessageTooLong 
              ? 'border-red-500 focus:ring-red-500' 
              : 'border-fud-teal focus:ring-fud-teal'
          }`}
        />
        <div className={`absolute bottom-1 right-3 text-xs transition-colors ${
          isMessageTooLong ? 'text-red-500' : message.length > MAX_MESSAGE_LENGTH * 0.8 ? 'text-orange-500' : 'text-gray-400'
        }`}>
          {message.length}/{MAX_MESSAGE_LENGTH}
        </div>
      </div>
      <button 
        type="submit" 
        disabled={isMessageEmpty || isMessageTooLong}
        className="bg-fud-teal text-white px-6 py-3 rounded-full hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Send
      </button>
    </form>
  );
};

export default ChatInput;
