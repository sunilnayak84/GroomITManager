/**
 * WebSocket Utility Functions
 * Provides helper functions for interacting with WebSockets in components
 */

import { useWebSocketContext } from "../contexts/websocket-context";

// Example usage: 
// const { sendAppointmentNotification } = useWebSocketNotifications();
// sendAppointmentNotification('created', appointmentId, appointmentData);

export function useWebSocketNotifications() {
  const { connected, sendMessage } = useWebSocketContext();
  
  // Function to send appointment notifications
  const sendAppointmentNotification = (
    action: 'created' | 'updated' | 'deleted' | 'status-changed',
    appointmentId: string,
    data: any = {}
  ) => {
    if (!connected) {
      console.warn('[WebSocket] Cannot send appointment notification - not connected');
      return false;
    }
    
    sendMessage({
      type: 'appointment-update',
      action,
      appointmentId,
      data,
      timestamp: new Date().toISOString()
    });
    
    return true;
  };
  
  // Function to send customer notifications
  const sendCustomerNotification = (
    action: 'created' | 'updated' | 'deleted',
    customerId: string,
    data: any = {}
  ) => {
    if (!connected) {
      console.warn('[WebSocket] Cannot send customer notification - not connected');
      return false;
    }
    
    sendMessage({
      type: 'customer-update',
      action,
      customerId,
      data,
      timestamp: new Date().toISOString()
    });
    
    return true;
  };
  
  // Function to send pet notifications
  const sendPetNotification = (
    action: 'created' | 'updated' | 'deleted',
    petId: string,
    data: any = {}
  ) => {
    if (!connected) {
      console.warn('[WebSocket] Cannot send pet notification - not connected');
      return false;
    }
    
    sendMessage({
      type: 'pet-update',
      action,
      petId,
      data,
      timestamp: new Date().toISOString()
    });
    
    return true;
  };
  
  // Function to send billing notifications
  const sendBillingNotification = (
    action: 'created' | 'paid' | 'cancelled' | 'refunded',
    billId: string,
    data: any = {}
  ) => {
    if (!connected) {
      console.warn('[WebSocket] Cannot send billing notification - not connected');
      return false;
    }
    
    sendMessage({
      type: 'billing-event',
      action,
      billId,
      data,
      timestamp: new Date().toISOString()
    });
    
    return true;
  };
  
  // Function to broadcast a general message to all clients
  const broadcastMessage = (content: string) => {
    if (!connected) {
      console.warn('[WebSocket] Cannot broadcast message - not connected');
      return false;
    }
    
    sendMessage({
      type: 'broadcast',
      content,
      timestamp: new Date().toISOString()
    });
    
    return true;
  };
  
  return {
    connected,
    sendAppointmentNotification,
    sendCustomerNotification,
    sendPetNotification,
    sendBillingNotification,
    broadcastMessage
  };
}