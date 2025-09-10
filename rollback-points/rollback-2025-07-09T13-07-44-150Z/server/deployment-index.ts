import express, { type Request, type Response } from "express";
import { createServer } from "http";
import { terminateProcessOnPort } from "./utils/port_cleanup.js";
import { initializeFirebaseAdmin } from "./firebase.js";
import { setupAuthenticationFirestore } from "./auth-firestore.js";
import cors from 'cors';
import { logger } from "./utils/logger.js";
import { setupFrontendFirstMiddleware } from "./frontend-first-middleware.js";
import { setupWebSocketServer } from "./websocket.js";
import { registerRoutes } from "./routes.js";

// Configure Express app
const app = express();

// Basic middleware setup
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.set('trust proxy', 1);

// CORS configuration - Allow all origins in deployment mode
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`Incoming ${req.method} request to ${req.path}`, {
    headers: req.headers,
    query: req.query,
    body: req.body
  });
  next();
});

async function startDeploymentServer(port: number) {
  try {
    // Initialize Firebase
    const firebaseApp = await initializeFirebaseAdmin();
    if (!firebaseApp) {
      throw new Error('Failed to initialize Firebase Admin');
    }
    logger.info('Firebase Admin initialized successfully');

    // Setup authentication
    await setupAuthenticationFirestore(app);
    logger.info('Authentication setup completed');

    // Create HTTP server
    const server = createServer(app);
    
    // CRITICAL CHANGE: We serve frontend files BEFORE registering API routes
    // This ensures frontend files have priority over API endpoints
    setupFrontendFirstMiddleware(app);
    logger.info('Frontend-first middleware setup completed');
    
    // Now register API routes - these will only be matched if frontend routes don't match
    await registerRoutes(app);
    logger.info('API routes registered with secondary priority');
    
    // Set up WebSocket server
    const wss = setupWebSocketServer(server);
    logger.info('WebSocket server initialized');

    // Start listening
    server.listen(port, '0.0.0.0', () => {
      logger.info(`DEPLOYMENT SERVER started on port ${port}`);
      logger.info(`WebSocket server available at ws://localhost:${port}/ws`);
    });

    // Handle server errors
    server.on('error', (error: any) => {
      logger.error('Server error:', error);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Server startup error:', error);
    process.exit(1);
  }
}

// Start the server
const PORT = parseInt(process.env.PORT || '3000', 10);

// Using an immediately invoked async function to handle top-level await
(async () => {
  // Clean up port before starting
  await terminateProcessOnPort(PORT).catch(error => {
    logger.warn('Port cleanup warning:', error.message);
  });

  // Start server
  startDeploymentServer(PORT);
})();

// Handle process signals
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM signal, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT signal, shutting down gracefully');
  process.exit(0);
});