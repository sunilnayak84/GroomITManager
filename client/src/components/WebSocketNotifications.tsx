import React, { useState, useEffect } from 'react';
import { useWebSocketContext } from '../contexts/websocket-context';

interface Notification {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface WebSocketNotificationsProps {
  maxNotifications?: number;
}

const WebSocketNotifications: React.FC<WebSocketNotificationsProps> = ({
  maxNotifications = 5,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { connected, connectionStatus, lastMessage, sendMessage } = useWebSocketContext();

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!lastMessage) return;

    // Process different message types
    switch (lastMessage.type) {
      case 'connection':
      case 'broadcast':
      case 'appointment-update':
        // Add new notification
        const newNotification: Notification = {
          id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: lastMessage.type,
          message: lastMessage.message || getMessageForType(lastMessage),
          timestamp: lastMessage.timestamp || new Date().toISOString(),
          read: false,
        };
        
        setNotifications(prev => [newNotification, ...prev].slice(0, maxNotifications));
        break;
        
      case 'pong':
        // We don't need to show pong messages as notifications
        console.log('[WebSocket] Received pong from server');
        break;
        
      default:
        console.log('[WebSocket] Unhandled message type:', lastMessage.type);
    }
  }, [lastMessage, maxNotifications]);

  // Helper function to generate message text based on message type
  const getMessageForType = (message: any): string => {
    switch (message.type) {
      case 'connection':
        return 'Connected to notification server';
      case 'broadcast':
        return message.content || 'New broadcast message';
      case 'appointment-update':
        const action = message.action || 'updated';
        return `Appointment ${action}: ${message.appointmentId?.substring(0, 8) || 'Unknown'}`;
      default:
        return 'New notification received';
    }
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Send a test notification
  const sendTestNotification = () => {
    if (connected) {
      sendMessage({
        type: 'broadcast',
        content: 'Test notification from client',
        timestamp: new Date().toISOString()
      });
    } else {
      console.warn('[WebSocket] Cannot send test notification - not connected');
      
      // Add local notification about connection status
      const newNotification: Notification = {
        id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'error',
        message: 'Cannot send notification - WebSocket disconnected',
        timestamp: new Date().toISOString(),
        read: false,
      };
      
      setNotifications(prev => [newNotification, ...prev].slice(0, maxNotifications));
    }
  };

  // Get status indicator class
  const getStatusClass = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500 animate-pulse';
      case 'disconnected':
        return 'bg-red-500';
      case 'error':
        return 'bg-red-700';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="relative">
      {/* Notification bell icon with status indicator */}
      <button
        className="relative p-2 text-gray-700 hover:text-gray-900 focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        
        {/* Status indicator */}
        <span
          className={`absolute top-1 right-1 w-2 h-2 rounded-full ${getStatusClass()}`}
          title={`WebSocket: ${connectionStatus}`}
        ></span>
        
        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="text-sm font-semibold">Notifications</h3>
            <div className="flex space-x-2">
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-500 hover:text-blue-700"
              >
                Mark all as read
              </button>
              <button
                onClick={sendTestNotification}
                className="text-xs text-green-500 hover:text-green-700"
                title="Send test notification"
              >
                Test
              </button>
            </div>
          </div>

          {/* Connection status */}
          <div className={`px-3 py-1 text-xs ${
            connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
            connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            WebSocket: {connectionStatus}
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 text-center">No notifications</p>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`p-3 border-b border-gray-100 hover:bg-gray-50 ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      setNotifications(prev =>
                        prev.map(n => (n.id === notification.id ? { ...n, read: true } : n))
                      );
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        notification.type === 'connection' ? 'bg-green-100 text-green-800' :
                        notification.type === 'broadcast' ? 'bg-blue-100 text-blue-800' :
                        notification.type === 'appointment-update' ? 'bg-purple-100 text-purple-800' :
                        notification.type === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {notification.type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(notification.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{notification.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WebSocketNotifications;