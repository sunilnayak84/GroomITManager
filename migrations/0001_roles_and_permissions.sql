CREATE TABLE IF NOT EXISTS "roles" (
  "id" varchar(50) PRIMARY KEY NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" text,
  "permissions" text[] NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp
);

-- Add default roles
INSERT INTO "roles" (id, name, description, permissions) VALUES
('admin', 'Administrator', 'Full system access with user management capabilities', ARRAY[
  'manage_appointments', 'view_appointments', 'create_appointments', 'cancel_appointments',
  'manage_customers', 'view_customers', 'create_customers', 'edit_customer_info',
  'manage_services', 'view_services', 'create_services', 'edit_services',
  'manage_inventory', 'view_inventory', 'update_stock', 'manage_consumables',
  'manage_staff_schedule', 'view_staff_schedule', 'manage_own_schedule',
  'view_analytics', 'view_reports', 'view_financial_reports', 'all'
]),
('manager', 'Manager', 'Branch management with staff oversight', ARRAY[
  'view_appointments', 'create_appointments', 'cancel_appointments',
  'view_customers', 'create_customers', 'edit_customer_info',
  'view_services', 'view_inventory', 'update_stock',
  'manage_staff_schedule', 'view_staff_schedule', 'manage_own_schedule',
  'view_analytics'
]),
('staff', 'Staff', 'Basic service provider access', ARRAY[
  'view_appointments', 'create_appointments',
  'view_customers', 'create_customers',
  'view_services', 'view_inventory',
  'manage_own_schedule'
]),
('receptionist', 'Receptionist', 'Front desk operations', ARRAY[
  'view_appointments', 'create_appointments',
  'view_customers', 'create_customers',
  'view_services'
]);

-- Add role_id foreign key to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role_id" varchar(50) REFERENCES "roles"(id);

-- Update existing users to have the staff role by default
UPDATE "users" SET "role_id" = 'staff' WHERE "role_id" IS NULL;

-- Make role_id non-nullable after setting defaults
ALTER TABLE "users" ALTER COLUMN "role_id" SET NOT NULL;
