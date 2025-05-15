
import React, { useState, useEffect, useRef } from 'react';
import ChatMessage, { MessageType } from './ChatMessage';
import ChatInput from './ChatInput';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  type: MessageType;
}

interface FUDChatProps {
  initialMessage?: string;
  chatType: 'whereToGo' | 'whatToOrder' | 'somethingFun';
  onBack: () => void;
}

// Mock responses based on chat type
const getMockResponse = (chatType: string, userInput: string): string => {
  switch(chatType) {
    case 'whereToGo':
      return `Based on your location, I'd recommend checking out "The Hungry Robot" on Main Street. It has great reviews for their burgers and shakes!

Alternatively, if you're feeling adventurous, "Byte Bistro" has some interesting fusion dishes that are getting a lot of buzz.`;
    case 'whatToOrder':
      return `At ${userInput}, I'd definitely recommend:

1. The Truffle Mushroom Burger - it's their top seller with a perfect umami balance
2. Their Sweet Potato Fries with maple aioli - people can't stop talking about these!`;
    case 'somethingFun':
      return "How about trying a Korean corn dog? They're crispy on the outside, chewy on the inside, and rolled in different toppings. There's a place called 'Seoul Food' about 10 minutes from you that makes them fresh!";
    default:
      return "I'm not sure how to help with that. Want to try one of our main features?";
  }
};

// Initial prompts for different chat types
const getInitialPrompt = (chatType: string): string => {
  switch(chatType) {
    case 'whereToGo':
      return "Hi there! I'd be happy to help you find a great place to eat. Could you share your location or the area you're interested in exploring?";
    case 'whatToOrder':
      return "Let's find you something delicious! What restaurant are you going to or looking at?";
    case 'somethingFun':
      return "Ready for a food adventure? Let me ask you a few questions. First, do you prefer sweet or savory foods?";
    default:
      return "Hi! How can I help you today?";
  }
};

const FUDChat: React.FC<FUDChatProps> = ({ initialMessage, chatType, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add initial bot message when component mounts
    const botMessage = initialMessage || getInitialPrompt(chatType);
    
    setMessages([
      {
        id: '1',
        content: botMessage,
        type: 'bot'
      }
    ]);
  }, [initialMessage, chatType]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simulate sending a message to the AI
  const handleSendMessage = (content: string) => {
    // Add user message to chat
    const newUserMessage = {
      id: Date.now().toString(),
      content,
      type: 'user' as MessageType
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    
    // Simulate AI thinking
    setIsTyping(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const botResponse = getMockResponse(chatType, content);
      
      const newBotMessage = {
        id: (Date.now() + 1).toString(),
        content: botResponse,
        type: 'bot' as MessageType
      };
      
      setMessages(prev => [...prev, newBotMessage]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center p-4 border-b">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
          <ArrowLeft />
        </Button>
        <h2 className="text-xl font-medium">FUD Buddy</h2>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map(message => (
          <ChatMessage 
            key={message.id} 
            content={message.content} 
            type={message.type} 
          />
        ))}
        
        {isTyping && (
          <div className="chat-bubble-bot my-2 opacity-70">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-fud-teal rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-fud-teal rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              <div className="w-2 h-2 bg-fud-teal rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t">
        <ChatInput 
          onSend={handleSendMessage} 
          placeholder={chatType === 'whereToGo' ? "Enter your location..." : 
                      chatType === 'whatToOrder' ? "Enter restaurant name..." : 
                      "Tell me what you like..."}
        />
      </div>
    </div>
  );
};

export default FUDChat;
