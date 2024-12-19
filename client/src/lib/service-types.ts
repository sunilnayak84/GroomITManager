
export interface Service {
  service_id: string;
  name: string;
  description: string;
  category: string;
  duration: number;
  price: number;
  discount_percentage: number;
  isActive: boolean;
  selectedServices?: Service[];
  selectedAddons?: Service[];
}
