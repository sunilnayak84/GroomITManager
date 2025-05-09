/**
 * Notification Routes
 * This file contains routes for sending WebSocket notifications
 */

import { Router, Request, Response } from 'express';
import { 
  broadcastMessage, 
  notifyAppointmentUpdate,
  notifyCustomerUpdate,
  notifyBillingEvent,
  notifyStaff,
  getActiveConnectionsCount
} from '../websocket.js';
import { logger } from '../utils/logger.js';

export const notificationsRouter = Router();

// Get status of WebSocket connections
notificationsRouter.get('/status', (req: Request, res: Response) => {
  const connectionCount = getActiveConnectionsCount();
  return res.json({
    status: connectionCount > 0 ? 'active' : 'idle',
    connections: connectionCount,
    timestamp: new Date().toISOString()
  });
});

// Send a test broadcast message
notificationsRouter.post('/broadcast', (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Message is required' 
      });
    }
    
    const clientCount = broadcastMessage({
      type: 'broadcast',
      content: message,
      timestamp: new Date().toISOString()
    });
    
    logger.info(`[API] Broadcast message sent to ${clientCount} clients`);
    
    return res.json({
      success: true,
      message: 'Broadcast sent successfully',
      recipients: clientCount
    });
  } catch (error) {
    logger.error(`[API] Error sending broadcast:`, error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to send broadcast' 
    });
  }
});

// Notify about appointment status changes
notificationsRouter.post('/appointment/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, data } = req.body;
    
    if (!action || !['created', 'updated', 'deleted', 'status-changed'].includes(action)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid action is required (created, updated, deleted, status-changed)' 
      });
    }
    
    const clientCount = notifyAppointmentUpdate(id, action as any, data || {});
    
    logger.info(`[API] Appointment notification (${action}) sent for ID ${id} to ${clientCount} clients`);
    
    return res.json({
      success: true,
      message: `Appointment ${action} notification sent successfully`,
      recipients: clientCount
    });
  } catch (error) {
    logger.error(`[API] Error sending appointment notification:`, error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to send notification' 
    });
  }
});

// Notify staff members
notificationsRouter.post('/staff/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { type, message, data } = req.body;
    
    if (!type || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Notification type and message are required' 
      });
    }
    
    const clientCount = notifyStaff(id, type, message, data || {});
    
    logger.info(`[API] Staff notification sent to ID ${id} to ${clientCount} clients`);
    
    return res.json({
      success: true,
      message: 'Staff notification sent successfully',
      recipients: clientCount
    });
  } catch (error) {
    logger.error(`[API] Error sending staff notification:`, error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to send notification' 
    });
  }
});