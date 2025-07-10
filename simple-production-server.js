/**
 * SIMPLE PRODUCTION SERVER FOR REPLIT DEPLOYMENTS
 * 
 * This is a simplified, deployment-ready server that runs reliably on Replit
 */

import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080; // Use 8080 for production deployment

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/dist')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'production'
  });
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    server: 'running',
    timestamp: new Date().toISOString(),
    environment: 'production'
  });
});

// Debug endpoint for appointment data
app.get('/api/debug/appointment/:appointmentId', (req, res) => {
  const { appointmentId } = req.params;
  res.json({
    success: true,
    appointment: {
      id: appointmentId,
      status: 'found',
      message: 'Debug endpoint working'
    }
  });
});

// Mock billing endpoints for deployment (will be replaced with real Firebase)
app.get('/api/billing/bills', (req, res) => {
  res.json({ bills: [] });
});

app.post('/api/billing/generate/:appointmentId?', (req, res) => {
  const appointmentId = req.params.appointmentId || req.body.appointmentId;
  res.json({
    success: true,
    bill: {
      bill_id: 'mock_' + Date.now(),
      appointment_id: appointmentId,
      status: 'generated',
      total_amount: 0,
      created_at: new Date().toISOString()
    }
  });
});

app.put('/api/billing/bills/:billId', (req, res) => {
  res.json({ success: true, message: 'Bill updated' });
});

app.delete('/api/billing/bills/:billId', (req, res) => {
  res.json({ success: true, message: 'Bill deleted' });
});

// Catch-all for SPA routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 GroomIT Manager Production Server running on port ${PORT}`);
  console.log(`📍 Frontend: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`✅ Deployment ready - no more build delays!`);
});