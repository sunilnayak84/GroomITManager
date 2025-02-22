import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { createServer } from "http";
import { terminateProcessOnPort } from "./utils/port_cleanup.js";
import { initializeFirebaseAdmin } from "./firebase.js";
import { setupAuth } from "./auth.js";
import cors from 'cors';
import { logger } from "./utils/logger.js";
import { setupVite } from "./vite.js";

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
    query: req.query,
    body: req.body
  });
  next();
});

// API routes prefix middleware
app.use('/api', (req, res, next) => {
  console.log('[API] Request received:', {
    method: req.method,
    path: req.path,
    url: req.url,
    originalUrl: req.originalUrl
  });
  res.setHeader('Content-Type', 'application/json');
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

    // Start server
    const server = createServer(app);

    // Register API routes BEFORE Vite setup
    registerRoutes(app);
    logger.info('API routes registered');

    // Handle API 404s before Vite takes over
    app.use('/api/*', (req, res) => {
      logger.warn(`API route not found: ${req.method} ${req.originalUrl}`);
      res.status(404).json({
        error: 'Not Found',
        message: `API route ${req.method} ${req.originalUrl} not found`
      });
    });

    // Setup Vite AFTER API routes
    await setupVite(app, server);
    logger.info('Vite middleware setup completed');

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