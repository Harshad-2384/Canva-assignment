import React, { createContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

export const SocketContext = createContext(null);

export default function SocketProvider({ children }) {
  const [chatMessages, setChatMessages] = useState([]);
  
  const socket = useMemo(() => {
    const token = localStorage.getItem('token');
    const serverUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    console.log('Creating socket connection to:', serverUrl);
    console.log('Token available:', !!token);
    
    return io(serverUrl, {
      auth: {
        token: token || '',
      },
      transports: ['polling', 'websocket'],
      forceNew: false, // Don't force new connection - reuse existing if available
      reconnection: true,
      timeout: 10000,
      upgrade: true,
      autoConnect: true,
    });
  }, []); // Empty dependency array ensures socket is created only once

  // Function to send chat message
  const sendChatMessage = (messageData) => {
    if (socket && messageData) {
      socket.emit('send-chat-message', messageData);
    }
  };

  // Function to clear chat messages
  const clearChatMessages = () => {
    setChatMessages([]);
  };

  useEffect(() => {
    if (!socket) return;

    // Connection handlers
    socket.on('connect', () => {
      console.log('CLIENT socket connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('CLIENT connect_error:', err && err.message ? err.message : err);
    });

    socket.on('disconnect', (reason) => {
      console.log('CLIENT disconnected:', reason);
    });

    // Chat message handler
    const handleChatMessage = (message) => {
      setChatMessages(prev => [...prev, message]);
    };

    // Register event listeners
    socket.on('chat-message', handleChatMessage);
    
    // DEBUG: Log ALL incoming events
    socket.onAny((event, payload) => {
      console.log('CLIENT recv event:', event, payload);
    });

    // DEBUG: Make socket available in window for console testing
    window.debugSocket = socket;
    console.log('DEBUG: socket available as window.debugSocket');

    // Cleanup on component unmount
    return () => {
      console.log('Cleaning up socket listeners and disconnecting...');
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('chat-message');
      socket.offAny();
      // Only disconnect if the socket is connected
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [socket]);

  // Context value
  const contextValue = useMemo(() => ({
    socket,
    chat: {
      messages: chatMessages,
      sendMessage: sendChatMessage,
      clearMessages: clearChatMessages
    }
  }), [socket, chatMessages]);

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}
