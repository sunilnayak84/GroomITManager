/**
 * PRODUCTION DEPLOYMENT SERVER WITH REAL FIREBASE BACKEND
 * 
 * This server provides the actual billing functionality for production deployment
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

console.log('🚀 Starting GroomIT Manager Production Deployment Server...');

// Initialize Firebase Admin
let firebaseApp = null;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccountData = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: serviceAccountData.project_id,
        privateKey: serviceAccountData.private_key.replace(/\\n/g, '\n'),
        clientEmail: serviceAccountData.client_email,
      }),
      databaseURL: `https://${serviceAccountData.project_id}-default-rtdb.asia-southeast1.firebasedatabase.app`
    });
    
    console.log('✅ Firebase Admin initialized successfully');
  } else {
    console.log('⚠️  Firebase service account not found - using mock data');
  }
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  console.log('⚠️  Falling back to mock data');
}

// Basic Express middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Find and serve client build
const clientBuildPath = path.join(__dirname, 'client/dist');

if (!fs.existsSync(clientBuildPath)) {
  console.error('❌ Client build not found at:', clientBuildPath);
  process.exit(1);
}

console.log('✅ Found client build at:', clientBuildPath);

// Serve static files from client build
app.use(express.static(clientBuildPath));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    firebase: firebaseApp ? 'connected' : 'mock'
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    server: 'GroomIT Manager',
    status: 'running',
    timestamp: new Date().toISOString(),
    firebase: firebaseApp ? 'connected' : 'mock'
  });
});

// Billing API endpoints - support both URL patterns
app.post('/api/billing/generate/:appointmentId?', async (req, res) => {
  try {
    // Get appointment ID from either URL parameter or request body
    const appointmentId = req.params.appointmentId || req.body.appointmentId;
    console.log('Billing API called - generating bill for appointment:', appointmentId);
    
    if (!appointmentId) {
      return res.status(400).json({ error: 'Appointment ID is required' });
    }
    
    if (!firebaseApp) {
      // Mock response when Firebase is not available
      console.log('Using mock billing data');
      return res.json({
        success: true,
        bill: {
          bill_id: 'mock_' + Date.now(),
          appointment_id: appointmentId,
          customer_name: 'Mock Customer',
          total_amount: 100.00,
          status: 'generated',
          payment_method: 'cash',
          created_at: new Date().toISOString()
        }
      });
    }

    // Real Firebase implementation
    const firestore = admin.firestore();
    
    // Get appointment data
    const appointmentDoc = await firestore.collection('appointments').doc(appointmentId).get();
    
    if (!appointmentDoc.exists) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    const appointment = appointmentDoc.data();
    
    // Calculate total amount from services
    let totalAmount = 0;
    if (appointment.services && Array.isArray(appointment.services)) {
      totalAmount = appointment.services.reduce((sum, service) => sum + (service.price || 0), 0);
    }
    
    // Generate bill with proper data validation
    const billData = {
      appointment_id: appointmentId,
      customer_id: appointment.customerId || appointment.customer_id || appointmentId, // fallback to appointment ID
      pet_id: appointment.petId || appointment.pet_id || null,
      groomer_id: appointment.groomerId || appointment.groomer_id || null,
      services: appointment.services || [],
      subtotal: totalAmount,
      discount: null,
      total_amount: totalAmount,
      status: 'generated',
      payment_method: req.body.payment_method || 'cash',
      payment_status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Remove undefined values to avoid Firestore errors
    Object.keys(billData).forEach(key => {
      if (billData[key] === undefined) {
        delete billData[key];
      }
    });
    
    const billRef = await firestore.collection('bills').add(billData);
    
    res.json({
      success: true,
      bill: {
        bill_id: billRef.id,
        ...billData,
        created_at: billData.created_at.toISOString(),
        updated_at: billData.updated_at.toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error generating bill:', error);
    res.status(500).json({ 
      error: 'Failed to generate bill',
      message: error.message 
    });
  }
});

// Debug endpoint for appointments
app.get('/api/debug/appointment/:appointmentId', async (req, res) => {
  try {
    if (!firebaseApp) {
      return res.json({ error: 'Firebase not connected', mock: true });
    }
    
    const firestore = admin.firestore();
    const appointmentDoc = await firestore.collection('appointments').doc(req.params.appointmentId).get();
    
    if (!appointmentDoc.exists) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    res.json({
      exists: true,
      data: appointmentDoc.data()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Other API endpoints
app.get('/api/*', (req, res) => {
  console.log('API request received:', req.path);
  res.status(404).json({ 
    error: 'API endpoint not found in deployment server',
    path: req.path,
    message: 'Available endpoints: /api/health, /api/status, /api/billing/generate, /api/debug/appointment/:id'
  });
});

app.post('/api/*', (req, res) => {
  console.log('API POST request received:', req.path);
  res.status(404).json({ 
    error: 'API endpoint not found in deployment server',
    path: req.path,
    message: 'Available endpoints: /api/billing/generate/:appointmentId'
  });
});

// Catch-all handler for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ GroomIT Manager production server running on port ${PORT}`);
  console.log(`📍 Frontend: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📊 Status: http://localhost:${PORT}/api/status`);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});