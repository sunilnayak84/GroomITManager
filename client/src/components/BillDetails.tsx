import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { auth } from '@/lib/firebase';

interface BillDetailsProps {
  appointmentId: string;
  onBillGenerated?: () => void;
}

export function BillDetails({ appointmentId, onBillGenerated }: BillDetailsProps) {
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [billData, setBillData] = useState<any>(null);
  const [billGenerated, setBillGenerated] = useState(false); // Added state to track bill generation
  const { toast } = useToast();

  useEffect(() => {
    // Check if a bill already exists on component mount
    const checkBillStatus = async () => {
      try {
        const response = await fetch(`/api/billing/check/${appointmentId}`, { method: 'GET' });
        if (response.ok) {
          const data = await response.json();
          setBillGenerated(data.billGenerated);
        }
      } catch (error) {
        console.error("Error checking bill status:", error);
      }
    };
    checkBillStatus();
  }, [appointmentId]);


  const handleGenerateBill = async () => {
    try {
      setLoading(true);
      setShowPreview(false);

      console.log('[BILLING] Getting details for appointment:', appointmentId);
      const debugResponse = await fetch(`/api/debug/appointment/${appointmentId}`, {
        method: 'GET'
      });

      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        console.log('[BILLING] Appointment debug data:', debugData);
      } else {
        console.error('[BILLING] Failed to debug appointment');
      }

      const response = await fetch(`/api/billing/generate/${appointmentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        let errorMessage = 'Failed to generate bill';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error('[BILLING] Bill generation error:', errorData);
        } catch (err) {
          console.error('[BILLING] Error parsing error response:', err);
        }
        throw new Error(errorMessage);
      }

      const bill = await response.json();
      setBillData(bill);
      setShowPreview(true);
      setBillGenerated(true); // Update billGenerated state after successful generation
      toast({
        title: "Success",
        description: "Bill generated successfully",
      });
      
      if (onBillGenerated) {
        onBillGenerated();
      }
    } catch (error) {
      console.error('Error generating bill:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate bill",
        variant: "destructive",
      });
      setShowPreview(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Bill Generation</CardTitle>
        </CardHeader>
        <CardContent>
          {billGenerated ? (
            <div className="text-center">
              <div className="flex items-center justify-center text-green-600 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span>Bill already generated</span>
              </div>
              <Button 
                onClick={() => window.location.href = `/billing/${appointmentId}`}
                className="w-full"
                variant="outline"
              >
                View Bill
              </Button>
            </div>
          ) : (
            <Button 
              onClick={handleGenerateBill} 
              disabled={loading} 
              className="w-full"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : "Generate Bill"}
            </Button>
          )}
        </CardContent>
      </Card>

      {showPreview && billData && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-xl">Bill Generated</DialogTitle>
              <DialogDescription>
                Your bill has been generated successfully.
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-between items-center border-b pb-3 mt-2">
              <div>
                <h3 className="font-medium">Invoice #{billData.id?.slice(0, 8) || "N/A"}</h3>
                <p className="text-sm text-gray-500">
                  {billData.createdAt ? new Date(billData.createdAt).toLocaleString() : "N/A"}
                </p>
              </div>
              <div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  billData.status === 'PENDING_PAYMENT' ? 'bg-amber-100 text-amber-800' :
                  billData.status === 'PAID' ? 'bg-green-100 text-green-800' :
                  billData.status === 'CANCELED' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {billData.status || "N/A"}
                </span>
              </div>
            </div>

            <div className="space-y-2 my-4">
              <h3 className="font-medium">Services</h3>
              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(billData.items || []).map((item: any, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm font-medium">{item.serviceName || "N/A"}</div>
                          {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">₹{(item.price || 0).toFixed(2)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{item.quantity || 0}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">₹{(item.subtotal || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2 border-t pt-2">
              <div className="flex justify-between">
                <span className="font-medium">Subtotal:</span>
                <span>₹{(billData.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Tax:</span>
                <span>₹{(billData.tax || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-1">
                <span>Total:</span>
                <span>₹{(billData.totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>

            {billData.paymentLink && (
              <div className="border rounded-md p-3 bg-gray-50 mt-4">
                <div className="flex items-center text-sm">
                  <CreditCard className="mr-2 h-4 w-4 text-gray-500" />
                  <span>Online Payment:</span>
                  <a 
                    href={billData.paymentLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 underline truncate"
                  >
                    {billData.paymentLink}
                  </a>
                </div>
              </div>
            )}

            <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2 pt-4 mt-2">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Close
              </Button>
              <div className="flex gap-2">
                {billData.paymentLink && (
                  <Button onClick={() => window.open(billData.paymentLink, '_blank')} className="bg-green-600 hover:bg-green-700">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay Now
                  </Button>
                )}
                <Button onClick={() => window.open(`/billing?billId=${billData.id || ''}`, '_blank')}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Full Bill
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}