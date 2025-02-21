import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { createServer } from "http";
import { terminateProcessOnPort } from "./utils/port_cleanup.js";
import { initializeFirebaseAdmin } from "./firebase.js";
import { setupAuth } from "./auth.js";
import path from "path";
import fs from "fs";
import cors from 'cors';
import { logger } from "./utils/logger.js";

// Configure Express app
const app = express();

// Basic middleware setup
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.set('trust proxy', 1);

// CORS configuration
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`Incoming request: ${req.method} ${req.url}`, {
    headers: req.headers,
    query: req.query
  });
  next();
});

// Register API routes first
registerRoutes(app);

// Error handling middleware should be last
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Error in request:', { 
    error: err.message,
    stack: err.stack,
    path: req.path
  });

  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ message: 'Invalid JSON' });
  }

  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message
  });
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

    // Start server
    const server = createServer(app);
    server.listen(port, '0.0.0.0', () => {
      logger.info(`Server started on port ${port}`);

      // Log all registered routes
      app._router.stack.forEach((r: any) => {
        if (r.route && r.route.path) {
          logger.info(`Route registered: ${Object.keys(r.route.methods).join(',')} ${r.route.path}`);
        }
      });
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