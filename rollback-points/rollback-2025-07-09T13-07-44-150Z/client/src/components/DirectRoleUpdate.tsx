import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const ROLES = {
  admin: 'Admin',
  manager: 'Manager',
  staff: 'Staff',
  receptionist: 'Receptionist'
};

const ROLE_PERMISSIONS = {
  admin: [
    'appointments.read', 'appointments.create', 'appointments.update', 'appointments.delete',
    'customers.read', 'customers.create', 'customers.update', 'customers.delete',
    'pets.read', 'pets.create', 'pets.update', 'pets.delete',
    'services.read', 'services.create', 'services.update', 'services.delete',
    'billing.read', 'billing.create', 'billing.update', 'billing.delete',
    'staff.read', 'staff.create', 'staff.update', 'staff.delete',
    'inventory.read', 'inventory.create', 'inventory.update', 'inventory.delete',
    'reports.read', 'reports.create', 'reports.update', 'reports.delete',
    'users.read', 'users.create', 'users.update', 'users.delete',
    'system.manage', 'roles.manage'
  ],
  manager: [
    'appointments.read', 'appointments.create', 'appointments.update',
    'customers.read', 'customers.create', 'customers.update',
    'pets.read', 'pets.create', 'pets.update',
    'services.read', 'billing.read', 'billing.create', 'billing.update',
    'staff.read', 'inventory.read', 'reports.read'
  ],
  staff: [
    'appointments.read', 'appointments.create', 'appointments.update',
    'customers.read', 'pets.read', 'services.read',
    'billing.read', 'inventory.read'
  ],
  receptionist: [
    'appointments.read', 'appointments.create', 'appointments.update',
    'customers.read', 'customers.create', 'customers.update',
    'pets.read', 'pets.create', 'pets.update',
    'services.read', 'billing.read'
  ]
};

export function DirectRoleUpdate() {
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  const db = getFirestore();

  const updateCherylRole = async () => {
    if (!selectedRole) {
      toast({
        title: 'Error',
        description: 'Please select a role',
        variant: 'destructive'
      });
      return;
    }

    setIsUpdating(true);
    try {
      // Cheryl's known user ID - you can find this in Firebase Console
      const cherylUserId = 'your-cheryl-user-id'; // Replace with actual UID
      
      // Update Firestore directly
      const userRef = doc(db, 'users', cherylUserId);
      await updateDoc(userRef, {
        role: selectedRole,
        permissions: ROLE_PERMISSIONS[selectedRole as keyof typeof ROLE_PERMISSIONS],
        updatedAt: new Date().toISOString(),
        lastModifiedBy: 'direct-update'
      });

      // Create role history
      const historyRef = doc(db, 'role-history', `${cherylUserId}-${Date.now()}`);
      await updateDoc(historyRef, {
        userId: cherylUserId,
        role: selectedRole,
        permissions: ROLE_PERMISSIONS[selectedRole as keyof typeof ROLE_PERMISSIONS],
        timestamp: Date.now(),
        action: 'role_update',
        actorId: 'direct-update',
        reason: 'Direct role update via admin panel'
      });

      toast({
        title: 'Success',
        description: `Cheryl's role has been updated to ${ROLES[selectedRole as keyof typeof ROLES]}. She should refresh her browser to see the changes.`
      });

    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update role. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Direct Role Update for Cheryl</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Select New Role:</label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a role" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ROLES).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          onClick={updateCherylRole} 
          disabled={isUpdating || !selectedRole}
          className="w-full"
        >
          {isUpdating ? 'Updating...' : 'Update Cheryl\'s Role'}
        </Button>
        
        <p className="text-xs text-muted-foreground">
          Note: Cheryl will need to refresh her browser after the role update to see the changes.
        </p>
      </CardContent>
    </Card>
  );
}