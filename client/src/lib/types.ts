
export type Gender = "male" | "female" | "other";
export type PetType = "dog" | "cat" | "bird" | "fish" | "other";
export type WeightUnit = "kg" | "lbs";

export interface Customer {
  id: string;
  firebaseId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string | null;
  gender: Gender | null;
  petCount: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface Pet {
  id: string;
  firebaseId: string | null;
  name: string;
  type: PetType;
  breed: string;
  customerId: string;
  dateOfBirth: string | null;
  age: number | null;
  gender: Gender | null;
  weight: string | null;
  weightUnit: WeightUnit;
  notes: string | null;
  image: string | null;
  createdAt: string;
  updatedAt: string | null;
  owner?: {
    id: string;
    name: string;
  } | null;
}

export interface InsertCustomer extends Omit<Customer, 'id' | 'firebaseId' | 'petCount' | 'createdAt' | 'updatedAt'> {}
export interface InsertPet extends Omit<Pet, 'id' | 'firebaseId' | 'createdAt' | 'updatedAt'> {}
