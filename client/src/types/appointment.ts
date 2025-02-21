
export interface Appointment {
  id: string;
  customerId: string;
  petId: string;
  groomerId: string;
  services: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  date: Date;
  notes?: string;
  billId?: string;
}

export interface AppointmentWithRelations extends Appointment {
  customerName: string;
  petName: string;
  groomerName: string;
  billId?: string;
}
