const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const path = require('path');

// Create Express server
const app = express();

// Basic middleware setup
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.set('trust proxy', true);

// CORS configuration
app.use(cors({
  origin: [
    'https://groomery.web.app', 
    'https://groomery.firebaseapp.com',
    // Add any custom domains here
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create HTTP function for API
exports.api = functions.https.onRequest(app);

// Optional: Create Callable Function for WebSockets if needed
exports.notifyAppointmentUpdate = functions.firestore
  .document('appointments/{appointmentId}')
  .onWrite((change, context) => {
    const appointmentId = context.params.appointmentId;
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;
    
    let action = 'updated';
    if (!before && after) action = 'created';
    if (before && !after) action = 'deleted';
    if (before && after && before.status !== after.status) action = 'status-changed';
    
    return { result: `Appointment ${appointmentId} ${action}` };
  });