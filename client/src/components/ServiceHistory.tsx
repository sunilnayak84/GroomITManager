
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ServiceHistoryProps {
  petId: string;
}

export function ServiceHistory({ petId }: ServiceHistoryProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      if (!petId) {
        setIsLoading(false);
        return;
      }
      
      const historyRef = collection(db, 'appointments');
      try {
        const historyQuery = query(
          historyRef,
          where('petId', '==', petId),
          where('status', '==', 'completed'),
          orderBy('date', 'desc')
        );

        const snapshot = await getDocs(historyQuery);
        const historyData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setHistory(historyData);
      } catch (error) {
        console.error('Error fetching service history:', error);
        setHistory([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchHistory();
  }, [petId]);

  if (isLoading) {
    return <div className="p-4">Loading history...</div>;
  }

  if (history.length === 0) {
    return <div className="p-4 text-muted-foreground">No service history found.</div>;
  }

  return (
    <div className="space-y-4">
      <Accordion type="single" collapsible className="w-full">
        {history.map((record) => (
          <AccordionItem key={record.id} value={record.id}>
            <AccordionTrigger>
              Service on {format(new Date(record.date), 'PPP')}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold">Services</h4>
                  <ul className="list-disc pl-4">
                    {record.services?.map((service: any, index: number) => (
                      <li key={index}>{service.name}</li>
                    ))}
                  </ul>
                </div>
                {record.notes && (
                  <div>
                    <h4 className="font-semibold">Notes</h4>
                    <p className="text-sm text-muted-foreground">{record.notes}</p>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
