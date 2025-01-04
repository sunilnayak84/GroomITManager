
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc, collection } from 'firebase/firestore';
import { toast } from '@/components/ui/use-toast';
import type { InsertStaff, Staff } from '@/lib/staff-types';

export class StaffManagement {
  private static async getToken() {
    const token = await getAuth().currentUser?.getIdToken();
    if (!token) throw new Error('No authentication token available');
    return token;
  }

  static async createStaff(data: InsertStaff): Promise<Staff> {
    const token = await this.getToken();
    
    const response = await fetch('/api/users/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: data.email,
        name: data.name,
        role: data.role,
        phone: data.phone || '',
        password: 'ChangeMe123!',
        isGroomer: data.role === 'groomer',
        experienceYears: data.experienceYears || 0,
        maxDailyAppointments: data.maxDailyAppointments || 8,
        specialties: data.specialties || [],
        petTypePreferences: data.petTypePreferences || [],
        isActive: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create staff member');
    }

    return response.json();
  }
}
