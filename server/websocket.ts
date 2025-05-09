import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from './utils/logger.js';

// Store connected clients
const clients = new Map<string, WebSocket>();

// WebSocket server setup
export function setupWebSocketServer(httpServer: HttpServer) {
  // Create WebSocket server on a distinct path (not / to avoid conflict with Vite HMR)
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws' 
  });

  logger.info('[WebSocket] Server initialized on path: /ws');

  // Connection handler
  wss.on('connection', (ws, req) => {
    const clientId = req.headers['sec-websocket-key'] || `client-${Date.now()}-${Math.random()}`;
    
    // Store client connection
    clients.set(clientId as string, ws);
    
    logger.info(`[WebSocket] Client connected: ${clientId}`);
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to GroomIT Manager WebSocket Server',
      timestamp: new Date().toISOString()
    }));

    // Handle incoming messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        logger.info(`[WebSocket] Received message from ${clientId}:`, data);
        
        // Process messages based on type
        handleClientMessage(clientId as string, data);
      } catch (error) {
        logger.error(`[WebSocket] Error processing message: ${error}`);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      logger.info(`[WebSocket] Client disconnected: ${clientId}`);
      clients.delete(clientId as string);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error(`[WebSocket] Error with client ${clientId}:`, error);
    });
  });

  // Handle server errors
  wss.on('error', (error) => {
    logger.error('[WebSocket] Server error:', error);
  });

  return wss;
}

// Handle messages from clients
function handleClientMessage(clientId: string, data: any) {
  switch (data.type) {
    case 'ping':
      // Respond to ping
      const client = clients.get(clientId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
      }
      break;
      
    case 'broadcast':
      // Broadcast message to all connected clients
      broadcastMessage({
        type: 'broadcast',
        sender: clientId,
        content: data.content,
        timestamp: new Date().toISOString()
      });
      break;
      
    default:
      logger.warn(`[WebSocket] Unknown message type: ${data.type}`);
  }
}

// Broadcast message to all connected clients
export function broadcastMessage(message: any) {
  const messageStr = JSON.stringify(message);
  let sentCount = 0;
  
  clients.forEach((client, id) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
      sentCount++;
    }
  });
  
  logger.info(`[WebSocket] Broadcast message sent to ${sentCount} clients`);
  return sentCount;
}

// Send a message to a specific client
export function sendToClient(clientId: string, message: any) {
  const client = clients.get(clientId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
    return true;
  }
  return false;
}

// Notify about appointment updates
export function notifyAppointmentUpdate(appointmentId: string, action: 'created' | 'updated' | 'deleted' | 'status-changed', data: any) {
  return broadcastMessage({
    type: 'appointment-update',
    appointmentId,
    action,
    data,
    timestamp: new Date().toISOString()
  });
}

// Get active connections count
export function getActiveConnectionsCount() {
  return clients.size;
}