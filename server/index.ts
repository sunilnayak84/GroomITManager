import express, { type Request, type Response } from "express";
import { registerRoutes } from "./routes.js";
import { createServer } from "http";
import { terminateProcessOnPort } from "./utils/port_cleanup.js";
import { initializeFirebaseAdmin } from "./firebase.js";
import { setupAuth } from "./auth.js";
import cors from 'cors';
import { logger } from "./utils/logger.js";
import { setupVite } from "./vite.js";
import { setupProductionMiddleware } from "./production-middleware.js";
import { setupWebSocketServer } from "./websocket.js";

// Configure Express app
const app = express();

// Basic middleware setup
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.set('trust proxy', 1);

// CORS configuration
const isDevelopment = process.env.NODE_ENV === 'development';
app.use(cors({
  origin: isDevelopment 
    ? 'http://localhost:5174' 
    : ['https://groomery.replit.app', 'https://*.replit.dev', 'https://*.repl.co', 'https://*.sisko.replit.dev'],
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

async function startServer(port: number) {
  try {
    // Initialize Firebase
    const firebaseApp = await initializeFirebaseAdmin();
    if (!firebaseApp) {
      throw new Error('Failed to initialize Firebase Admin');
    }
    logger.info('Firebase Admin initialized successfully');

    // Setup authentication
    await setupAuth(app);
    logger.info('Authentication setup completed');

    // Register API routes before client-side routing to ensure proper API handling
    await registerRoutes(app);
    logger.info('API routes registered');
    
    // Create HTTP server
    const server = createServer(app);
    
    // In production, serve static files, otherwise use Vite dev server
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      try {
        setupProductionMiddleware(app);
        logger.info('Static file serving enabled for production');
      } catch (error) {
        logger.error('Failed to serve static files:', error);
        await setupVite(app, server);
        logger.info('Vite middleware setup completed as fallback after error');
      }
    } else {
      await setupVite(app, server);
      logger.info('Vite development middleware setup completed');
    }

    // Set up WebSocket server
    const wss = setupWebSocketServer(server);
    logger.info('WebSocket server initialized');

    // Start listening
    server.listen(port, '0.0.0.0', () => {
      logger.info(`Server started on port ${port}`);
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

// Clean up port before starting
await terminateProcessOnPort(PORT).catch(error => {
  logger.warn('Port cleanup warning:', error.message);
});

// Start server
startServer(PORT);

// Handle process signals
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM signal, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT signal, shutting down gracefully');
  process.exit(0);
});