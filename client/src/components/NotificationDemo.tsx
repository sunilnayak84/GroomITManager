import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

type NotificationType = 'appointment' | 'customer' | 'pet' | 'billing';
type Action = 'created' | 'updated' | 'deleted' | 'status-changed' | 'payment' | 'reminder';

export const NotificationDemo: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [type, setType] = useState<NotificationType>('appointment');
  const [action, setAction] = useState<Action>('created');
  const [id, setId] = useState('');
  const [jsonData, setJsonData] = useState('{\n  "title": "Test notification",\n  "message": "This is a test notification"\n}');

  const sendNotification = async () => {
    if (!id.trim()) {
      alert('Please enter an ID');
      return;
    }

    let parsedData: any = {};
    try {
      parsedData = JSON.parse(jsonData);
    } catch (error) {
      alert('Please enter valid JSON data');
      return;
    }

    try {
      setLoading(true);
      
      const endpoint = `/api/demo/${type}/${id}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          data: parsedData
        })
      });
      
      const data = await response.json();
      setApiResponse(data);
    } catch (error) {
      console.error(`Error sending ${type} notification:`, error);
      setApiResponse({ error: `Failed to send ${type} notification` });
    } finally {
      setLoading(false);
    }
  };

  const actionOptions = (): Action[] => {
    switch (type) {
      case 'appointment':
        return ['created', 'updated', 'deleted', 'status-changed'];
      case 'customer':
      case 'pet':
        return ['created', 'updated', 'deleted'];
      case 'billing':
        return ['payment', 'reminder'];
      default:
        return ['created', 'updated', 'deleted'];
    }
  };

  const getPlaceholderData = (): string => {
    switch (type) {
      case 'appointment':
        return JSON.stringify({
          title: `Appointment ${action}`,
          message: `Appointment #${id} has been ${action}`,
          status: action === 'status-changed' ? 'completed' : 'pending',
          date: new Date().toISOString(),
          customer: {
            id: 'customer123',
            name: 'John Doe'
          }
        }, null, 2);
      case 'customer':
        return JSON.stringify({
          title: `Customer ${action}`,
          message: `Customer profile has been ${action}`,
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890'
        }, null, 2);
      case 'pet':
        return JSON.stringify({
          title: `Pet ${action}`,
          message: `Pet profile has been ${action}`,
          name: 'Fluffy',
          breed: 'Golden Retriever',
          owner: {
            id: 'customer123',
            name: 'John Doe'
          }
        }, null, 2);
      case 'billing':
        return JSON.stringify({
          title: action === 'payment' ? 'Payment processed' : 'Payment reminder',
          message: action === 'payment' ? 'Payment has been processed successfully' : 'Payment is due soon',
          amount: 500,
          currency: 'INR',
          dueDate: new Date().toISOString()
        }, null, 2);
      default:
        return '{\n  "title": "Test notification",\n  "message": "This is a test notification"\n}';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Tester</CardTitle>
        <CardDescription>
          Send test notifications through the WebSocket system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="notification-type">Notification Type</Label>
            <Select 
              value={type} 
              onValueChange={(value) => {
                setType(value as NotificationType);
                setAction(actionOptions()[0]);
                setJsonData(getPlaceholderData());
              }}
            >
              <SelectTrigger id="notification-type">
                <SelectValue placeholder="Select notification type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="appointment">Appointment</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="pet">Pet</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="action-type">Action</Label>
            <Select 
              value={action} 
              onValueChange={(value) => {
                setAction(value as Action);
                setJsonData(getPlaceholderData());
              }}
            >
              <SelectTrigger id="action-type">
                <SelectValue placeholder="Select action" />
              </SelectTrigger>
              <SelectContent>
                {actionOptions().map(action => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="item-id">ID</Label>
          <Input 
            id="item-id"
            value={id} 
            onChange={(e) => setId(e.target.value)}
            placeholder={`Enter ${type} ID`}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="json-data">Data (JSON)</Label>
          <Textarea 
            id="json-data"
            value={jsonData} 
            onChange={(e) => setJsonData(e.target.value)}
            placeholder="Enter notification data as JSON"
            className="font-mono h-40"
          />
        </div>
        
        <Button 
          onClick={sendNotification} 
          disabled={loading || !id.trim()}
          className="w-full"
        >
          {loading ? 'Sending...' : 'Send Notification'}
        </Button>
        
        {apiResponse && (
          <div className="mt-4 space-y-2">
            <h3 className="font-medium">API Response</h3>
            <pre className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};