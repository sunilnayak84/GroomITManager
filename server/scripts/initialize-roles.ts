
import { getDatabase, ref, set } from 'firebase/database';
import { app } from '../firebase';

const db = getDatabase(app);

const roles = {
  admin: {
    name: 'admin',
    permissions: ['manage_users', 'manage_roles', 'manage_services', 'manage_appointments', 'manage_inventory', 'view_reports'],
    description: 'Full system access'
  },
  manager: {
    name: 'manager',
    permissions: ['manage_services', 'manage_appointments', 'manage_inventory', 'view_reports'],
    description: 'Manage daily operations'
  },
  receptionist: {
    name: 'receptionist',
    permissions: ['manage_appointments', 'view_customers'],
    description: 'Handle appointments and customers'
  },
  staff: {
    name: 'staff',
    permissions: ['view_appointments', 'update_appointment_status'],
    description: 'Basic staff access'
  }
};

async function initializeRoles() {
  try {
    const rolesRef = ref(db, 'role-definitions');
    await set(rolesRef, roles);
    console.log('Roles initialized successfully');
  } catch (error) {
    console.error('Error initializing roles:', error);
  }
}

initializeRoles();
