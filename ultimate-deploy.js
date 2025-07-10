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

// Mock billing endpoints for deployment
app.get('/api/debug/:appointmentId', (req, res) => {
  res.json({
    success: true,
    appointment: {
      id: req.params.appointmentId,
      status: 'found',
      message: 'Debug endpoint working'
    }
  });
});

app.post('/api/billing/generate/:appointmentId', (req, res) => {
  res.json({
    success: true,
    bill: {
      bill_id: `mock_${Date.now()}`,
      appointment_id: req.params.appointmentId,
      status: 'generated',
      total_amount: 0,
      created_at: new Date().toISOString()
    }
  });
});

app.get('/api/billing/bills', (req, res) => {
  res.json({ bills: [] });
});

// Serve frontend static files
const clientDistPath = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientDistPath));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
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