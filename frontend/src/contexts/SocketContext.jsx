import React, { createContext, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';

export const SocketContext = createContext(null);

export default function SocketProvider({ children }) {
  const socket = useMemo(() => {
    const token = localStorage.getItem('token');
    const serverUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
    console.log('🔧 Creating socket connection to:', serverUrl);
    console.log('🔧 Token available:', !!token);
    
    return io(serverUrl, {
      auth: {
        token: token || '',
      },
      transports: ['polling', 'websocket'],
      forceNew: true,
      reconnection: true,
      timeout: 10000,
      upgrade: true,
    });
  }, []);

  useEffect(() => {
    // DEBUG: Enhanced connection logging
    socket.on('connect', () => {
      console.log('🔌 CLIENT socket connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('🔌 CLIENT connect_error:', err && err.message ? err.message : err);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 CLIENT disconnected:', reason);
    });

    // DEBUG: Log ALL incoming events
    socket.onAny((event, payload) => {
      console.log('⬅️ CLIENT recv event:', event, payload);
    });

    // DEBUG: Make socket available in window for console testing
    window.debugSocket = socket;
    console.log('🔧 DEBUG: socket available as window.debugSocket');

    // Cleanup on component unmount
    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.offAny();
      socket.disconnect();
    };
  }, [socket]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}
