import React, { useEffect, useState } from 'react';
import { useWebSocketContext } from '@/contexts/websocket-context';
import { Toast, ToastAction, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from '@/components/ui/toast';
import { Bell, Check, Calendar, Users, Paw, CreditCard } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  action?: string;
  actionLabel?: string;
  actionFn?: () => void;
}

export function WebSocketNotifications() {
  const websocket = useWebSocketContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Process incoming WebSocket messages
  useEffect(() => {
    if (!websocket || !websocket.lastMessage) return;

    // Handle different message types
    const msg = websocket.lastMessage;
    
    if (msg.type === 'appointment' || 
        msg.type === 'customer' || 
        msg.type === 'pet' || 
        msg.type === 'billing' ||
        msg.type === 'broadcast') {
      
      const notification: Notification = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: msg.type,
        title: msg.title || getDefaultTitle(msg),
        description: msg.content || msg.message || getDefaultDescription(msg),
        timestamp: msg.timestamp || new Date().toISOString()
      };
      
      // Add to notifications (newest first)
      setNotifications(prev => [notification, ...prev.slice(0, 9)]);
    }
  }, [websocket?.lastMessage]);

  // Helper functions to generate default notification content
  const getDefaultTitle = (msg: any): string => {
    const action = msg.action || 'updated';
    
    switch (msg.type) {
      case 'appointment':
        return `Appointment ${action}`;
      case 'customer':
        return `Customer ${action}`;
      case 'pet':
        return `Pet ${action}`;
      case 'billing':
        return 'Billing notification';
      case 'broadcast':
        return 'Broadcast message';
      default:
        return 'New notification';
    }
  };
  
  const getDefaultDescription = (msg: any): string => {
    const action = msg.action || 'updated';
    const itemId = msg.id || '';
    
    switch (msg.type) {
      case 'appointment':
        return `Appointment ${itemId} has been ${action}`;
      case 'customer':
        return `Customer profile ${itemId} has been ${action}`;
      case 'pet':
        return `Pet profile ${itemId} has been ${action}`;
      case 'billing':
        return `Billing notification for ${itemId}`;
      default:
        return 'You have a new notification';
    }
  };

  // Remove a notification by ID
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Get icon based on notification type
  const getIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="h-5 w-5" />;
      case 'customer':
        return <Users className="h-5 w-5" />;
      case 'pet':
        return <Paw className="h-5 w-5" />;
      case 'billing':
        return <CreditCard className="h-5 w-5" />;
      case 'broadcast':
        return <Bell className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  return (
    <ToastProvider>
      {notifications.map(notification => (
        <Toast key={notification.id} onOpenChange={() => removeNotification(notification.id)}>
          <div className="flex gap-3">
            <div className="mt-1 text-muted-foreground">
              {getIcon(notification.type)}
            </div>
            <div className="grid gap-1">
              <ToastTitle className="flex items-center gap-2">
                {notification.title}
              </ToastTitle>
              <ToastDescription>
                {notification.description}
              </ToastDescription>
            </div>
          </div>
          {notification.action && (
            <ToastAction altText={notification.actionLabel || 'Action'} onClick={notification.actionFn || (() => {})}>
              <Check className="h-4 w-4 mr-1" />
              {notification.actionLabel || 'OK'}
            </ToastAction>
          )}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport className="p-4" />
    </ToastProvider>
  );
}