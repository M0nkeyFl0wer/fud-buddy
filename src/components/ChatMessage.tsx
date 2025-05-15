
import React from 'react';

export type MessageType = 'user' | 'bot';

interface ChatMessageProps {
  content: string;
  type: MessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ content, type }) => {
  const bubbleClass = type === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot';
  
  return (
    <div className={`${bubbleClass} my-2 animate-fade-in`}>
      {content}
    </div>
  );
};

export default ChatMessage;
