
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
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
      
      try {
        const historyRef = collection(db, 'appointments');
        const historyQuery = query(
          historyRef,
          where('petId', '==', petId),
          where('status', '==', 'completed'),
          orderBy('date', 'desc')
        );

        const snapshot = await getDocs(historyQuery);
        const historyData = await Promise.all(snapshot.docs.map(async doc => {
          const data = doc.data();
          
          // Fetch service details
          const services = await Promise.all((data.services || []).map(async (serviceId: string) => {
            const serviceDoc = await getDocs(collection(db, 'services'));
            const service = serviceDoc.docs.find(doc => doc.id === serviceId);
            return service ? service.data().name : 'Unknown Service';
          }));
          
          return {
            id: doc.id,
            ...data,
            services,
            date: data.date?.toDate?.()?.toISOString() || null
          };
        }));
        
        setHistory(historyData);
      } catch (error) {
        console.error('Error fetching service history:', error);
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
              Service on {record.date ? format(new Date(record.date), 'PPP') : 'Unknown Date'}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 p-4">
                <div>
                  <h4 className="font-semibold mb-2">Services</h4>
                  <ul className="list-disc pl-4">
                    {record.services?.map((service: string, index: number) => (
                      <li key={index}>{service}</li>
                    ))}
                  </ul>
                </div>
                
                {record.observations && (
                  <div>
                    <h4 className="font-semibold mb-2">Observations</h4>
                    <p className="text-sm text-muted-foreground">{record.observations}</p>
                  </div>
                )}
                
                {record.recommendations && (
                  <div>
                    <h4 className="font-semibold mb-2">Recommendations</h4>
                    <p className="text-sm text-muted-foreground">{record.recommendations}</p>
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
