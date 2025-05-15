
import React, { useState, useEffect, useRef } from 'react';
import ChatMessage, { MessageType } from './ChatMessage';
import ChatInput from './ChatInput';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { aiService, getInitialPrompt, AIChatType } from '@/services/aiService';
import { analyticsService } from '@/services/analyticsService';

interface Message {
  id: string;
  content: string;
  type: MessageType;
}

interface FUDChatProps {
  initialMessage?: string;
  chatType: AIChatType;
  onBack: () => void;
}

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
    
    // Track chat started event
    analyticsService.trackEvent('chat_started', { chat_type: chatType });
  }, [initialMessage, chatType]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send a message to the AI service
  const handleSendMessage = async (content: string) => {
    // Add user message to chat
    const newUserMessage = {
      id: Date.now().toString(),
      content,
      type: 'user' as MessageType
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    
    // Show typing indicator
    setIsTyping(true);
    
    try {
      // Get previous messages in the format needed for context
      const messageHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
      
      // Call the AI service
      const response = await aiService.sendMessage(content, chatType, messageHistory);
      
      // Add the AI response to the chat
      const newBotMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        type: 'bot' as MessageType
      };
      
      setMessages(prev => [...prev, newBotMessage]);
      
      // Track user message sent
      analyticsService.trackEvent('message_sent', {
        chat_type: chatType,
        message_length: content.length
      });
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Add an error message
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I'm having trouble connecting right now. Please try again.",
        type: 'bot' as MessageType
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
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
