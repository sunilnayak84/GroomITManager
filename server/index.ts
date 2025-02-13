import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { createServer } from "http";
import { terminateProcessOnPort } from "./utils/port_cleanup.js";
import { initializeFirebaseAdmin } from "./firebase.js";
import { setupAuth } from "./auth.js";
import path from "path";
import fs from "fs";
import cors from 'cors';

// Configure Express app
const app = express();

// Global middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.set('trust proxy', 1);

// CORS configuration - must come before routes
const corsOptions = {
  origin: ['http://localhost:5174', '*'], // Allow requests from frontend dev server and any other origin.  Change '*' to specific origins in production.
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ message: 'Invalid JSON' });
  }
  next(err);
});

async function startServer(port: number) {
  try {
    // Initialize Firebase
    const firebaseApp = await initializeFirebaseAdmin();
    if (!firebaseApp) {
      throw new Error('Failed to initialize Firebase Admin');
    }
    console.log('Firebase Admin initialized successfully');

    // Setup authentication
    await setupAuth(app);
    console.log('Authentication setup completed');

    // Register API routes
    registerRoutes(app);
    console.log('Routes registered successfully');

    // Start server
    const server = createServer(app);
    server.listen(port, '0.0.0.0', () => {
      console.log(`Server started on port ${port}`);

      // Log all registered routes
      app._router.stack.forEach((r: any) => {
        if (r.route && r.route.path) {
          console.log(`Route registered: ${Object.keys(r.route.methods).join(',')} ${r.route.path}`);
        }
      });
    });

    // Handle server errors
    server.on('error', (error: any) => {
      console.error('Server error:', error);
      process.exit(1);
    });

  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
}

// Start the server
const PORT = parseInt(process.env.PORT || '3000', 10);

// Clean up port before starting
await terminateProcessOnPort(PORT).catch(error => {
  console.warn('Port cleanup warning:', error.message);
});

// Start server
startServer(PORT);

// Handle process signals
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down gracefully');
  process.exit(0);
});