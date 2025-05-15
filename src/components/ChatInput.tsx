
import React, { useState } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, placeholder = "Type your message..." }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSend(message);
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-4 py-3 rounded-full border-2 border-fud-teal focus:outline-none focus:ring-2 focus:ring-fud-teal"
      />
      <button 
        type="submit" 
        className="bg-fud-teal text-white px-6 py-3 rounded-full hover:bg-opacity-90 transition-opacity"
      >
        Send
      </button>
    </form>
  );
};

export default ChatInput;
