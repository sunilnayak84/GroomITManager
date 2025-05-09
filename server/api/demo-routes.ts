/**
 * Demo Routes
 * This file contains routes for demonstration purposes only
 * These routes are NOT secured and should NOT be used in production
 */

import { Router, Request, Response } from 'express';
import { 
  broadcastMessage, 
  notifyAppointmentUpdate,
  notifyCustomerUpdate,
  notifyPetUpdate,
  notifyBillingEvent,
  getActiveConnectionsCount
} from '../websocket.js';
import { logger } from '../utils/logger.js';

export const demoRouter = Router();

// Get status of WebSocket connections
demoRouter.get('/status', (req: Request, res: Response) => {
  const connectionCount = getActiveConnectionsCount();
  return res.json({
    status: connectionCount > 0 ? 'active' : 'idle',
    connections: connectionCount,
    timestamp: new Date().toISOString()
  });
});

// Send a test broadcast message
demoRouter.post('/broadcast', (req: Request, res: Response) => {
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
    
    logger.info(`[DEMO] Broadcast message sent to ${clientCount} clients`);
    
    return res.json({
      success: true,
      message: 'Broadcast sent successfully',
      recipients: clientCount
    });
  } catch (error) {
    logger.error(`[DEMO] Error sending broadcast:`, error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to send broadcast' 
    });
  }
});

// Notify about appointment status changes
demoRouter.post('/appointment/:id', (req: Request, res: Response) => {
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
    
    logger.info(`[DEMO] Appointment notification (${action}) sent for ID ${id} to ${clientCount} clients`);
    
    return res.json({
      success: true,
      message: `Appointment ${action} notification sent successfully`,
      recipients: clientCount
    });
  } catch (error) {
    logger.error(`[DEMO] Error sending appointment notification:`, error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to send notification' 
    });
  }
});

// Notify about customer updates
demoRouter.post('/customer/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, data } = req.body;
    
    if (!action || !['created', 'updated', 'deleted'].includes(action)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid action is required (created, updated, deleted)' 
      });
    }
    
    const clientCount = notifyCustomerUpdate(id, action as any, data || {});
    
    logger.info(`[DEMO] Customer notification (${action}) sent for ID ${id} to ${clientCount} clients`);
    
    return res.json({
      success: true,
      message: `Customer ${action} notification sent successfully`,
      recipients: clientCount
    });
  } catch (error) {
    logger.error(`[DEMO] Error sending customer notification:`, error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to send notification' 
    });
  }
});

// Notify about pet updates
demoRouter.post('/pet/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, data } = req.body;
    
    if (!action || !['created', 'updated', 'deleted'].includes(action)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid action is required (created, updated, deleted)' 
      });
    }
    
    const clientCount = notifyPetUpdate(id, action as any, data || {});
    
    logger.info(`[DEMO] Pet notification (${action}) sent for ID ${id} to ${clientCount} clients`);
    
    return res.json({
      success: true,
      message: `Pet ${action} notification sent successfully`,
      recipients: clientCount
    });
  } catch (error) {
    logger.error(`[DEMO] Error sending pet notification:`, error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to send notification' 
    });
  }
});