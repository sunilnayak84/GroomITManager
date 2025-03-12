import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BillDetailsProps {
  appointmentId: string;
}

export function BillDetails({ appointmentId }: BillDetailsProps) {
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false); // Added state for preview modal
  const [billData, setBillData] = useState(null);       // Added state for bill data
  const { toast } = useToast();

  const handleGenerateBill = async () => {
    try {
      setLoading(true);
      setShowPreview(false); //Hide preview before new generation

      // First debug the appointment to help with troubleshooting
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

      // Generate the bill
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
      setBillData(bill); //Store bill data for preview
      setShowPreview(true); //Show preview after successful generation
      toast({
        title: "Success",
        description: "Bill generated successfully",
      });
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
          <CardTitle>Generate Bill</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Bill Preview Dialog */}
      {showPreview && billData && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-xl">Bill Generated</DialogTitle>
              <DialogDescription>
                Your bill has been generated successfully.
              </DialogDescription>
            </DialogHeader>

            {/* Bill Header */}
            <div className="flex justify-between items-center border-b pb-3 mt-2">
              <div>
                <h3 className="font-medium">Invoice #{billData.id?.slice(0, 8)}</h3>
                <p className="text-sm text-gray-500">
                  {billData.createdAt && new Date(billData.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  billData.status === 'PENDING_PAYMENT' ? 'bg-amber-100 text-amber-800' :
                  billData.status === 'PAID' ? 'bg-green-100 text-green-800' :
                  billData.status === 'CANCELED' ? 'bg-gray-100 text-gray-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {billData.status}
                </span>
              </div>
            </div>

            {/* Bill Items */}
            <div className="space-y-2 my-4">
              <h3 className="font-medium">Services</h3>
              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {billData.items?.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm font-medium">{item.serviceName}</div>
                          {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">₹{item.price?.toFixed(2)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{item.quantity}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">₹{item.subtotal?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bill Totals */}
            <div className="space-y-2 border-t pt-2">
              <div className="flex justify-between">
                <span className="font-medium">Subtotal:</span>
                <span>₹{billData.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Tax:</span>
                <span>₹{billData.tax?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-1">
                <span>Total:</span>
                <span>₹{billData.totalAmount?.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Link */}
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
                <Button onClick={() => window.open(`/billing?billId=${billData.id}`, '_blank')}>
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