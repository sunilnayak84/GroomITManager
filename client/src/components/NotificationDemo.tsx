import React, { useState } from 'react';
import { useWebSocketNotifications } from '../utils/websocket-helpers';
import { Button } from './ui/button';
import { Input } from './ui/input';

/**
 * NotificationDemo - A simple component to demonstrate WebSocket notification functionality
 * 
 * This component allows users to send test notifications through WebSockets.
 * It can be placed anywhere in the application to test the notification system.
 */
const NotificationDemo: React.FC = () => {
  const [message, setMessage] = useState('');
  const [appointmentId, setAppointmentId] = useState('test-appointment-123');
  const [customerId, setCustomerId] = useState('test-customer-123');
  const { 
    connected, 
    broadcastMessage,
    sendAppointmentNotification,
    sendCustomerNotification 
  } = useWebSocketNotifications();

  // Handle sending a broadcast message
  const handleBroadcast = () => {
    if (!message.trim()) {
      alert('Please enter a message to broadcast');
      return;
    }
    
    broadcastMessage(message);
    setMessage('');
  };
  
  // Handle appointment notification
  const handleAppointmentNotification = (action: 'created' | 'updated' | 'deleted' | 'status-changed') => {
    if (!appointmentId.trim()) {
      alert('Please enter an appointment ID');
      return;
    }
    
    sendAppointmentNotification(action, appointmentId, {
      date: new Date().toISOString(),
      service: 'Test Service',
      customer: 'Test Customer'
    });
  };
  
  // Handle customer notification
  const handleCustomerNotification = (action: 'created' | 'updated' | 'deleted') => {
    if (!customerId.trim()) {
      alert('Please enter a customer ID');
      return;
    }
    
    sendCustomerNotification(action, customerId, {
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '1234567890'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto my-8">
      <h2 className="text-2xl font-bold mb-6">WebSocket Notification Demo</h2>
      
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <span className={`h-3 w-3 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span className="text-sm">WebSocket Status: {connected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <p className="text-sm text-gray-600">
          Use this demo component to test sending real-time notifications through WebSockets.
          Make sure to check the notification bell in the header.
        </p>
      </div>
      
      {/* Broadcast Message Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-md">
        <h3 className="font-semibold mb-3">Broadcast Message</h3>
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter a message to broadcast"
            className="flex-grow"
          />
          <Button 
            onClick={handleBroadcast}
            disabled={!connected}
          >
            Send
          </Button>
        </div>
      </div>
      
      {/* Appointment Notifications Section */}
      <div className="mb-6 p-4 bg-blue-50 rounded-md">
        <h3 className="font-semibold mb-3">Appointment Notifications</h3>
        <Input
          value={appointmentId}
          onChange={(e) => setAppointmentId(e.target.value)}
          placeholder="Appointment ID"
          className="mb-3"
        />
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={() => handleAppointmentNotification('created')}
            disabled={!connected}
            variant="outline"
            className="bg-green-100 hover:bg-green-200"
          >
            Created
          </Button>
          <Button 
            onClick={() => handleAppointmentNotification('updated')}
            disabled={!connected}
            variant="outline"
            className="bg-blue-100 hover:bg-blue-200"
          >
            Updated
          </Button>
          <Button 
            onClick={() => handleAppointmentNotification('status-changed')}
            disabled={!connected}
            variant="outline"
            className="bg-amber-100 hover:bg-amber-200"
          >
            Status Changed
          </Button>
          <Button 
            onClick={() => handleAppointmentNotification('deleted')}
            disabled={!connected}
            variant="outline"
            className="bg-red-100 hover:bg-red-200"
          >
            Deleted
          </Button>
        </div>
      </div>
      
      {/* Customer Notifications Section */}
      <div className="p-4 bg-purple-50 rounded-md">
        <h3 className="font-semibold mb-3">Customer Notifications</h3>
        <Input
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          placeholder="Customer ID"
          className="mb-3"
        />
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={() => handleCustomerNotification('created')}
            disabled={!connected}
            variant="outline"
            className="bg-green-100 hover:bg-green-200"
          >
            Created
          </Button>
          <Button 
            onClick={() => handleCustomerNotification('updated')}
            disabled={!connected}
            variant="outline"
            className="bg-blue-100 hover:bg-blue-200"
          >
            Updated
          </Button>
          <Button 
            onClick={() => handleCustomerNotification('deleted')}
            disabled={!connected}
            variant="outline"
            className="bg-red-100 hover:bg-red-200"
          >
            Deleted
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationDemo;