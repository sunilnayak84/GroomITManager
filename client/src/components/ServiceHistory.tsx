
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { format } from 'date-fns';

interface ServiceHistoryProps {
  petId: string;
}

export function ServiceHistory({ petId }: ServiceHistoryProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      const historyRef = collection(db, 'service_history');
      try {
        const historyQuery = query(
          historyRef,
          where('petId', '==', petId),
          orderBy('createdAt', 'desc')
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
    return <div>Loading history...</div>;
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {history.map((record) => (
        <AccordionItem key={record.id} value={record.id}>
          <AccordionTrigger>
            Service on {format(new Date(record.createdAt), 'PPP')}
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 p-4">
              <div>
                <h4 className="font-semibold">Observations</h4>
                <p>{record.observations || 'No observations recorded'}</p>
              </div>
              <div>
                <h4 className="font-semibold">Recommendations</h4>
                <p>{record.recommendations || 'No recommendations recorded'}</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
