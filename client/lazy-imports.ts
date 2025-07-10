/**
 * LAZY IMPORTS FOR CODE SPLITTING
 * 
 * This file implements dynamic imports to further reduce initial bundle size
 */

import { lazy } from 'react';

// Lazy load heavy components
export const AppointmentsPage = lazy(() => import('./src/pages/AppointmentsPage'));
export const BillingPage = lazy(() => import('./src/pages/BillingPage'));
export const InventoryPage = lazy(() => import('./src/pages/InventoryPage'));
export const CustomersPage = lazy(() => import('./src/pages/CustomersPage'));
export const ServicesPage = lazy(() => import('./src/pages/ServicesPage'));
export const DashboardPage = lazy(() => import('./src/pages/DashboardPage'));

// Lazy load complex components
export const AppointmentForm = lazy(() => import('./src/components/AppointmentForm'));
export const PaymentDialog = lazy(() => import('./src/components/PaymentDialog'));
export const BillPreviewModal = lazy(() => import('./src/components/BillPreviewModal'));

// Calendar components (heavy)
export const CalendarView = lazy(() => import('./src/components/CalendarView'));

// Chart components
export const Charts = lazy(() => import('./src/components/ui/charts'));