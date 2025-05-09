import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useWebSocketContext } from '@/contexts/websocket-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { NotificationDemo } from '@/components/NotificationDemo';

const WebSocketDemoPage: React.FC = () => {
  const [message, setMessage] = useState('');
  const websocket = useWebSocketContext();
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const sendMessage = () => {
    if (!message.trim()) return;
    
    websocket?.sendMessage({
      type: 'chat',
      content: message,
      timestamp: new Date().toISOString()
    });
    
    setMessage('');
  };

  const checkStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/demo/status');
      const data = await response.json();
      setApiResponse(data);
    } catch (error) {
      console.error('Error checking WebSocket status:', error);
      setApiResponse({ error: 'Failed to check status' });
    } finally {
      setLoading(false);
    }
  };

  const broadcastMessage = async () => {
    if (!message.trim()) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/demo/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });
      
      const data = await response.json();
      setApiResponse(data);
      setMessage('');
    } catch (error) {
      console.error('Error broadcasting message:', error);
      setApiResponse({ error: 'Failed to broadcast message' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">WebSocket Demo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
            <CardDescription>
              Current WebSocket connection status: 
              <span className={`ml-2 font-bold ${websocket?.connected ? 'text-green-600' : 'text-red-600'}`}>
                {websocket?.connectionStatus}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>Connection ID: {websocket?.connectionId || 'Not connected'}</p>
              <p>Messages received: {websocket?.messages.length || 0}</p>
              {websocket?.error && (
                <p className="text-red-600">Error: {websocket.error.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => websocket?.connect()}
              disabled={websocket?.connected}
            >
              Connect
            </Button>
            <Button 
              variant="outline" 
              onClick={() => websocket?.disconnect()}
              disabled={!websocket?.connected}
            >
              Disconnect
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Send Message</CardTitle>
            <CardDescription>
              Send a direct message through the WebSocket connection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Input 
                value={message} 
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              />
              <Button onClick={sendMessage} disabled={!websocket?.connected}>Send</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />
      
      <Tabs defaultValue="messages" className="mt-6">
        <TabsList>
          <TabsTrigger value="messages">Received Messages</TabsTrigger>
          <TabsTrigger value="api">API Testing</TabsTrigger>
          <TabsTrigger value="notifications">Notification Demo</TabsTrigger>
        </TabsList>
        
        <TabsContent value="messages" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>WebSocket Messages</CardTitle>
              <CardDescription>
                Messages received from the WebSocket connection
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              {websocket?.messages.length === 0 ? (
                <p className="text-center text-muted-foreground">No messages received yet</p>
              ) : (
                <div className="space-y-2">
                  {websocket?.messages.map((msg, index) => (
                    <div key={index} className="p-3 bg-muted rounded-md">
                      <div className="flex justify-between">
                        <span className="font-medium">{msg.type}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <pre className="text-sm mt-1 whitespace-pre-wrap">
                        {JSON.stringify(msg, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                onClick={() => websocket?.clearMessages()}
                disabled={!websocket?.messages.length}
              >
                Clear Messages
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="api" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>WebSocket API Testing</CardTitle>
              <CardDescription>
                Test server-side WebSocket functionality
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Check WebSocket Status</h3>
                  <Button onClick={checkStatus} disabled={loading}>
                    {loading ? 'Checking...' : 'Check Status'}
                  </Button>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Broadcast Message</h3>
                  <div className="flex space-x-2">
                    <Input 
                      value={message} 
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Message to broadcast..."
                    />
                    <Button onClick={broadcastMessage} disabled={loading || !message.trim()}>
                      {loading ? 'Sending...' : 'Broadcast'}
                    </Button>
                  </div>
                </div>
                
                {apiResponse && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">API Response</h3>
                    <pre className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                      {JSON.stringify(apiResponse, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="mt-4">
          <NotificationDemo />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WebSocketDemoPage;