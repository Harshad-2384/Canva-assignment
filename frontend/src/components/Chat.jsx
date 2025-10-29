import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { SocketContext } from '../contexts/SocketContext';
import './Chat.css';

const Chat = ({ roomId }) => {
  const [message, setMessage] = useState('');
  const { chat } = useContext(SocketContext);
  const messagesEndRef = useRef(null);
  const currentUser = localStorage.getItem('username') || 'Anonymous';

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [chat.messages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const msgData = {
      roomId,
      user: currentUser,
      text: message,
      timestamp: new Date().toISOString()
    };

    chat.sendMessage(msgData);
    setMessage('');
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>Chat</h3>
      </div>
      <div className="messages-container">
        {chat.messages.length === 0 ? (
          <div className="no-messages">No messages yet. Say hi! 👋</div>
        ) : (
          chat.messages.map((msg, index) => (
            <div key={index} className="message">
              <span className="message-user">{msg.user}: </span>
              <span className="message-text">{msg.text}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="chat-input-container">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="chat-input"
        />
        <button type="submit" className="send-button">
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
