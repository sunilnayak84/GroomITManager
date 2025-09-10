
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
  customerName?: string;
  petName?: string;
  groomerName?: string;
  billStatus?: string;
  hasBill?: boolean;
}

export interface AppointmentWithRelations extends Appointment {
  customerName: string;
  petName: string;
  groomerName: string;
  billId?: string;
  billStatus?: string;
  hasBill?: boolean;
}
