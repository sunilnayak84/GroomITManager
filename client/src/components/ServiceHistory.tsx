import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
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
          console.log('Fetching service history - Raw data:', data);
          
          const services = await Promise.all((data.services || []).map(async (serviceId: string) => {
            const serviceDoc = await getDocs(collection(db, 'services'));
            const service = serviceDoc.docs.find(doc => doc.id === serviceId);
            return service ? service.data().name : 'Unknown Service';
          }));

          // Get service history document
          const serviceHistoryRef = collection(db, 'service_history');
          const serviceHistoryQuery = query(serviceHistoryRef, where('appointmentId', '==', doc.id));
          const serviceHistorySnap = await getDocs(serviceHistoryQuery);
          
          const serviceHistory = serviceHistorySnap.docs[0]?.data();
          const items = serviceHistory?.productsUsed || serviceHistory?.usedItems || [];
          console.log('Service history data:', items);

          // Fetch product details for used items
          const usedProducts = await Promise.all(items.map(async (item: any) => {
            console.log('Processing item:', item);
            try {
              const itemId = item?.itemId || item?.id;
              if (!itemId) {
                console.error('Invalid item:', item);
                return null;
              }
              console.log('Fetching product with ID:', itemId);
              const itemRef = doc(db, 'inventory', itemId);
              const itemSnap = await getDoc(itemRef);
              
              if (itemSnap.exists()) {
                const product = itemSnap.data();
                console.log('Found product:', product);
                return {
                  name: product.name || 'Unknown Product',
                  quantity: item.quantity || 0,
                  unit: product.unit || 'units',
                  category: item.categoryId || product.category || 'Unknown Category'
                };
              }
              console.error('Product not found:', item.itemId);
              return null;
            } catch (error) {
              console.error('Error fetching product:', error);
              return null;
            }
          }));
          console.log('Processed used products:', usedProducts);
          
          console.log('Processed products:', usedProducts);

          const formattedProducts = usedProducts.filter(Boolean);

          return {
            id: doc.id,
            ...data,
            services,
            usedProducts: formattedProducts,
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
    <div className="space-y-4 mt-4">
      <Accordion type="single" collapsible className="w-full space-y-2">
        {history.map((record) => (
          <AccordionItem key={record.id} value={record.id}>
            <AccordionTrigger>
              Service on {record.date ? format(new Date(record.date), 'PPP') : 'Unknown Date'}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 p-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Services</h4>
                    <ul className="list-disc pl-4">
                      {record.services?.map((service: string, index: number) => (
                        <li key={index}>{service}</li>
                      ))}
                    </ul>
                  </div>
                  
                  {record.usedProducts && record.usedProducts.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Products Used</h4>
                      <ul className="list-disc pl-4">
                        {record.usedProducts.map((item: any, index: number) => (
                          <li key={index} className="text-sm text-muted-foreground">
                            {item.name} - {item.quantity} {item.unit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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