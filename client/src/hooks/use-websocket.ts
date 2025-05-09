import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface WebSocketHook {
  connected: boolean;
  messages: WebSocketMessage[];
  sendMessage: (message: WebSocketMessage) => void;
  lastMessage: WebSocketMessage | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  error: Error | null;
  reconnect: () => void;
}

export const useWebSocket = (): WebSocketHook => {
  const [connected, setConnected] = useState<boolean>(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connectWebsocket = useCallback(() => {
    // Clean up any existing connection
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close();
    }

    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      setConnectionStatus('connecting');
      
      // Determine the WebSocket URL based on the current environment
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let wsUrl: string;
      
      // If we're in development and using Vite's dev server
      if (import.meta.env.DEV) {
        // Use the backend on port 3000
        const hostname = window.location.hostname;
        wsUrl = `${protocol}//${hostname}:3000/ws`;
      } else {
        // In production, use the same host but with the /ws path
        wsUrl = `${protocol}//${window.location.host}/ws`;
      }
      
      console.log('[WebSocket] Connecting to:', wsUrl);
      
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('[WebSocket] Connection established');
        setConnected(true);
        setConnectionStatus('connected');
        setError(null);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', data);
          setLastMessage(data);
          setMessages((prevMessages) => [...prevMessages, data]);
        } catch (err) {
          console.error('[WebSocket] Error parsing message:', err);
        }
      };

      socket.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', event.code, event.reason);
        setConnected(false);
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect after a delay
        reconnectTimeoutRef.current = window.setTimeout(() => {
          console.log('[WebSocket] Attempting to reconnect...');
          connectWebsocket();
        }, 5000) as unknown as number;
      };

      socket.onerror = (event) => {
        console.error('[WebSocket] Connection error:', event);
        setError(new Error('WebSocket connection error'));
        setConnectionStatus('error');
      };

    } catch (err) {
      console.error('[WebSocket] Setup error:', err);
      setError(err instanceof Error ? err : new Error('Unknown WebSocket error'));
      setConnectionStatus('error');
      
      // Attempt to reconnect after a delay
      reconnectTimeoutRef.current = window.setTimeout(() => {
        console.log('[WebSocket] Attempting to reconnect after error...');
        connectWebsocket();
      }, 5000) as unknown as number;
    }
  }, []);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const messageString = JSON.stringify(message);
      socketRef.current.send(messageString);
      console.log('[WebSocket] Message sent:', message);
      return true;
    } else {
      console.warn('[WebSocket] Cannot send message - connection not open');
      return false;
    }
  }, []);

  // Connect when the component mounts
  useEffect(() => {
    connectWebsocket();
    
    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebsocket]);

  return {
    connected,
    messages,
    sendMessage,
    lastMessage,
    connectionStatus,
    error,
    reconnect: connectWebsocket
  };
};