import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useWebSocket, WebSocketHook } from '../hooks/use-websocket';

// Create a context for the WebSocket functionality
const WebSocketContext = createContext<WebSocketHook | null>(null);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const websocket = useWebSocket();

  // Log connection status changes
  useEffect(() => {
    console.log('[WebSocketProvider] Connection status:', websocket.connectionStatus);
  }, [websocket.connectionStatus]);

  // Automatically send a ping every 30 seconds to keep the connection alive
  useEffect(() => {
    if (!websocket.connected) return;

    const pingInterval = setInterval(() => {
      websocket.sendMessage({
        type: 'ping',
        timestamp: new Date().toISOString()
      });
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [websocket.connected, websocket.sendMessage]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => websocket, [
    websocket.connected,
    websocket.connectionStatus,
    websocket.error,
    websocket.lastMessage,
    websocket.messages.length
  ]);

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook to use the WebSocket context
export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};