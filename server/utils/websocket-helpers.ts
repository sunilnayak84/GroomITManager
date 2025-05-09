/**
 * WebSocket Helper Functions
 * This file provides utility functions to integrate WebSocket notifications
 * with various parts of the application.
 */

import { logger } from './logger.js';
import { 
  notifyAppointmentUpdate, 
  notifyCustomerUpdate,
  notifyPetUpdate,
  notifyServiceUpdate,
  notifyBillingEvent,
  notifyStaff,
  getActiveConnectionsCount
} from '../websocket.js';

// Add WebSocket middleware integration for appointments
export const appointmentNotifier = {
  onCreate: (appointmentId: string, appointmentData: any) => {
    try {
      logger.info(`[WebSocket] Notifying about new appointment: ${appointmentId}`);
      const clientCount = notifyAppointmentUpdate(appointmentId, 'created', appointmentData);
      if (appointmentData.groomerId) {
        notifyStaff(
          appointmentData.groomerId, 
          'new-appointment', 
          `You have a new appointment scheduled on ${new Date(appointmentData.date).toLocaleDateString()}`, 
          { appointmentId }
        );
      }
      return clientCount;
    } catch (error) {
      logger.error(`[WebSocket] Error notifying about appointment creation: ${error}`);
      return 0;
    }
  },
  
  onUpdate: (appointmentId: string, appointmentData: any) => {
    try {
      logger.info(`[WebSocket] Notifying about updated appointment: ${appointmentId}`);
      return notifyAppointmentUpdate(appointmentId, 'updated', appointmentData);
    } catch (error) {
      logger.error(`[WebSocket] Error notifying about appointment update: ${error}`);
      return 0;
    }
  },
  
  onStatusChange: (appointmentId: string, newStatus: string, appointmentData: any) => {
    try {
      logger.info(`[WebSocket] Notifying about appointment status change: ${appointmentId} -> ${newStatus}`);
      const clientCount = notifyAppointmentUpdate(appointmentId, 'status-changed', {
        ...appointmentData,
        newStatus
      });
      
      // Special notifications for specific status changes
      if (newStatus === 'completed') {
        notifyBillingEvent(appointmentId, 'created', {
          appointmentId,
          message: 'Service completed - bill ready for payment'
        });
      }
      
      return clientCount;
    } catch (error) {
      logger.error(`[WebSocket] Error notifying about appointment status change: ${error}`);
      return 0;
    }
  },
  
  onDelete: (appointmentId: string, appointmentData: any) => {
    try {
      logger.info(`[WebSocket] Notifying about deleted appointment: ${appointmentId}`);
      return notifyAppointmentUpdate(appointmentId, 'deleted', appointmentData);
    } catch (error) {
      logger.error(`[WebSocket] Error notifying about appointment deletion: ${error}`);
      return 0;
    }
  }
};

// Add WebSocket middleware integration for customers
export const customerNotifier = {
  onCreate: (customerId: string, customerData: any) => {
    try {
      logger.info(`[WebSocket] Notifying about new customer: ${customerId}`);
      return notifyCustomerUpdate(customerId, 'created', customerData);
    } catch (error) {
      logger.error(`[WebSocket] Error notifying about customer creation: ${error}`);
      return 0;
    }
  },
  
  onUpdate: (customerId: string, customerData: any) => {
    try {
      logger.info(`[WebSocket] Notifying about updated customer: ${customerId}`);
      return notifyCustomerUpdate(customerId, 'updated', customerData);
    } catch (error) {
      logger.error(`[WebSocket] Error notifying about customer update: ${error}`);
      return 0;
    }
  }
};

// Add WebSocket middleware integration for billing
export const billingNotifier = {
  onPaymentComplete: (billId: string, billData: any) => {
    try {
      logger.info(`[WebSocket] Notifying about bill payment: ${billId}`);
      const clientCount = notifyBillingEvent(billId, 'paid', billData);
      
      // Notify staff about completed payment
      if (billData.staffId) {
        notifyStaff(
          billData.staffId,
          'payment-received',
          `Payment received for invoice #${billId.substring(0, 8)}`,
          { billId, amount: billData.amount }
        );
      }
      
      return clientCount;
    } catch (error) {
      logger.error(`[WebSocket] Error notifying about bill payment: ${error}`);
      return 0;
    }
  },
  
  onRefund: (billId: string, billData: any) => {
    try {
      logger.info(`[WebSocket] Notifying about bill refund: ${billId}`);
      return notifyBillingEvent(billId, 'refunded', billData);
    } catch (error) {
      logger.error(`[WebSocket] Error notifying about bill refund: ${error}`);
      return 0;
    }
  }
};

// Get diagnostic information about WebSocket connections
export function getWebSocketDiagnostics() {
  const activeConnections = getActiveConnectionsCount();
  return {
    activeConnections,
    status: activeConnections > 0 ? 'active' : 'idle',
    timestamp: new Date().toISOString()
  };
}