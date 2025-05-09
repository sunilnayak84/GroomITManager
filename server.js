import express from 'express';
import path from 'path';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Set production mode
process.env.NODE_ENV = 'production';

// Create Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

// Basic middleware
app.use(cors());
app.use(express.json());

// IMPORTANT: Serve static files first
console.log('Serving static files from:', path.join(__dirname, 'client/dist'));
app.use(express.static(path.join(__dirname, 'client/dist')));

// Basic API routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Handle WebSockets
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('WebSocket message received:', data);
      ws.send(JSON.stringify({ type: 'response', data, timestamp: new Date().toISOString() }));
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// IMPORTANT: Place API endpoints before the catch-all route
// Any other API routes go here...

// Catch-all route to handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});