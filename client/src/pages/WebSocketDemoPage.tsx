import React from 'react';
import NotificationDemo from '../components/NotificationDemo';

const WebSocketDemoPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8">WebSocket Notifications Demo</h1>
      <p className="mb-6 text-gray-600">
        This page demonstrates the real-time WebSocket notification system implemented in the GroomIT Manager application.
        The notification bell in the top-right corner will display real-time notifications when sent through this interface.
      </p>
      
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-8">
        <h3 className="font-semibold text-amber-800">How to use this demo</h3>
        <ol className="list-decimal ml-5 text-amber-700 mt-2">
          <li>Verify that the WebSocket connection is active (green indicator)</li>
          <li>Try sending different types of notifications using the forms below</li>
          <li>Watch the notification bell icon in the header for incoming notifications</li>
          <li>Click on the notification bell to see details of received notifications</li>
        </ol>
      </div>
      
      <NotificationDemo />
      
      <div className="mt-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Technical Implementation</h2>
        <p className="mb-4">
          The WebSocket notification system consists of several components:
        </p>
        <ul className="list-disc ml-5 space-y-2">
          <li><strong>Server-side WebSocket Server</strong>: Handles connections and broadcasts messages</li>
          <li><strong>Client WebSocket Hook</strong>: Manages WebSocket connection and message handling</li>
          <li><strong>WebSocket Context</strong>: Provides global access to WebSocket functionality</li>
          <li><strong>Notification Component</strong>: Displays real-time notifications in the UI</li>
          <li><strong>API Endpoints</strong>: Allow server-side code to send notifications</li>
        </ul>
      </div>
    </div>
  );
};

export default WebSocketDemoPage;