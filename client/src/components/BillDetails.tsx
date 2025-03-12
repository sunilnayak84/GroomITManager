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
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Bill Generated</DialogTitle>
              <DialogDescription>
                Your bill has been generated successfully.
              </DialogDescription>
            </DialogHeader>

            <div className="border rounded-md p-4 my-4 bg-muted/20">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium">Total Amount:</div>
                <div className="text-sm">₹{billData.totalAmount?.toFixed(2)}</div>

                <div className="text-sm font-medium">Services:</div>
                <div className="text-sm">{billData.items?.length || 0}</div>

                <div className="text-sm font-medium">Status:</div>
                <div className="text-sm capitalize">{billData.status?.toLowerCase().replace('_', ' ')}</div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
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