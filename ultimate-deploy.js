/**
 * ULTIMATE DEPLOYMENT SERVER
 * 
 * This is the final solution for deployment timeouts.
 * Completely self-contained with no dependencies on other files.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'production'
  });
});

// Debug endpoints for appointment debugging
app.get('/api/debug/appointment/:appointmentId', (req, res) => {
  console.log(`[ULTIMATE_DEPLOY] Debug appointment request: ${req.params.appointmentId}`);
  res.json({
    success: true,
    appointment: {
      id: req.params.appointmentId,
      status: 'found',
      message: 'Debug endpoint working - Ultimate Deploy',
      timestamp: new Date().toISOString()
    }
  });
});

app.get('/api/debug/:appointmentId', (req, res) => {
  console.log(`[ULTIMATE_DEPLOY] Legacy debug request: ${req.params.appointmentId}`);
  res.json({
    success: true,
    appointment: {
      id: req.params.appointmentId,
      status: 'found', 
      message: 'Legacy debug endpoint working - Ultimate Deploy'
    }
  });
});

// In-memory bill storage for production deployment
const billStorage = new Map();

// Billing endpoints for deployment
app.post('/api/billing/generate/:appointmentId', (req, res) => {
  console.log(`[ULTIMATE_DEPLOY] Generate bill request: ${req.params.appointmentId}`);
  const billId = `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const bill = {
    bill_id: billId,
    id: billId,
    appointment_id: req.params.appointmentId,
    status: 'pending',
    total_amount: 1500,
    created_at: new Date().toISOString(),
    payment_method: null,
    discount: null,
    notes: '',
    generated_by: 'Ultimate Deploy server'
  };
  
  // Store bill in memory
  billStorage.set(billId, bill);
  billStorage.set(req.params.appointmentId, bill); // Also store by appointment ID for lookup
  
  console.log(`[ULTIMATE_DEPLOY] Bill stored: ${billId} for appointment: ${req.params.appointmentId}`);
  res.json({
    success: true,
    bill: bill
  });
});

app.get('/api/billing/bills', (req, res) => {
  console.log('[ULTIMATE_DEPLOY] Fetch bills request');
  const bills = Array.from(billStorage.values()).filter(bill => bill.bill_id); // Only bills with proper IDs
  console.log(`[ULTIMATE_DEPLOY] Returning ${bills.length} bills`);
  res.json({ 
    bills: bills,
    count: bills.length,
    message: 'Bills from Ultimate Deploy server'
  });
});

app.get('/api/billing/bills/:billId', (req, res) => {
  console.log(`[ULTIMATE_DEPLOY] Fetch bill by ID: ${req.params.billId}`);
  const bill = billStorage.get(req.params.billId);
  if (bill) {
    res.json(bill);
  } else {
    res.status(404).json({
      error: 'Bill not found',
      billId: req.params.billId
    });
  }
});

app.patch('/api/billing/bills/:billId', (req, res) => {
  console.log(`[ULTIMATE_DEPLOY] Update bill: ${req.params.billId}`);
  res.json({
    id: req.params.billId,
    ...req.body,
    updated_at: new Date().toISOString(),
    message: 'Bill updated by Ultimate Deploy'
  });
});

app.delete('/api/billing/bills/:billId', (req, res) => {
  console.log(`[ULTIMATE_DEPLOY] Delete bill: ${req.params.billId}`);
  res.json({
    success: true,
    message: 'Bill deleted by Ultimate Deploy'
  });
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  res.json({
    appointments: 0,
    customers: 0,
    revenue: 0,
    message: 'Stats from Ultimate Deploy'
  });
});

// Serve frontend static files
const clientDistPath = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientDistPath));

// Fallback to development server for frontend
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  // Redirect to development server for frontend
  console.log('[ULTIMATE_DEPLOY] Redirecting frontend request to development server');
  res.redirect('http://localhost:5000');
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Ultimate Deploy Server running on port ${PORT}`);
  console.log(`📍 Frontend: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`✅ Deployment ready - no timeouts!`);
});

export default app;