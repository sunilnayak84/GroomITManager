import { useState, useEffect, useCallback, useRef } from 'react';

export enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface WebSocketHook {
  connected: boolean;
  connectionStatus: ConnectionStatus;
  connectionId: string | null;
  error: Error | null;
  messages: WebSocketMessage[];
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: WebSocketMessage) => void;
  connect: () => void;
  disconnect: () => void;
  clearMessages: () => void;
}

export function useWebSocket(): WebSocketHook {
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Create WebSocket connection
  const connect = useCallback(() => {
    // Close existing connection if any
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    try {
      setConnectionStatus(ConnectionStatus.CONNECTING);
      setError(null);
      
      // Determine proper WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('[WebSocket] Connecting to', wsUrl);
      
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      
      // Connection opened
      socket.addEventListener('open', () => {
        console.log('[WebSocket] Connection established');
        setConnected(true);
        setConnectionStatus(ConnectionStatus.CONNECTED);
        
        // Send initial ping to get connection ID
        const pingMessage = {
          type: 'ping',
          timestamp: new Date().toISOString()
        };
        socket.send(JSON.stringify(pingMessage));
      });
      
      // Connection closed
      socket.addEventListener('close', (event) => {
        console.log('[WebSocket] Connection closed', event.code, event.reason);
        setConnected(false);
        setConnectionStatus(ConnectionStatus.DISCONNECTED);
        socketRef.current = null;
        
        // Implement reconnection logic here if needed
        if (event.code !== 1000) { // 1000 is normal closure
          // Reconnect after a delay
          if (reconnectTimeoutRef.current) {
            window.clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, 5000);
        }
      });
      
      // Connection error
      socket.addEventListener('error', (event) => {
        console.error('[WebSocket] Connection error', event);
        setError(new Error('WebSocket connection error'));
        setConnectionStatus(ConnectionStatus.ERROR);
      });
      
      // Listen for messages
      socket.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Message received', data);
          
          // Extract connection ID from server response if available
          if (data.type === 'connection_established' && data.connectionId) {
            setConnectionId(data.connectionId);
          }
          
          // Store the message
          setLastMessage(data);
          setMessages(prev => [data, ...prev]);
        } catch (err) {
          console.error('[WebSocket] Error parsing message', err, event.data);
        }
      });
    } catch (err) {
      console.error('[WebSocket] Setup error', err);
      setError(err instanceof Error ? err : new Error('WebSocket setup error'));
      setConnectionStatus(ConnectionStatus.ERROR);
    }
  }, []);
  
  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('[WebSocket] Manually disconnecting');
      socketRef.current.close();
      socketRef.current = null;
      setConnected(false);
      setConnectionStatus(ConnectionStatus.DISCONNECTED);
    }
    
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);
  
  // Send message through WebSocket
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify(message));
        console.log('[WebSocket] Message sent', message);
        return true;
      } catch (err) {
        console.error('[WebSocket] Error sending message', err);
        return false;
      }
    } else {
      console.warn('[WebSocket] Cannot send message, socket not connected');
      return false;
    }
  }, []);
  
  // Clear message history
  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastMessage(null);
  }, []);
  
  // Connect on component mount and disconnect on unmount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);
  
  return {
    connected,
    connectionStatus,
    connectionId,
    error,
    messages,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
    clearMessages
  };
}