export interface AppointmentWithRelations extends Appointment {
  customerName: string;
  petName: string;
  groomerName: string;
  billId?: string;
}