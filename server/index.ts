import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { createServer } from "http";
import { terminateProcessOnPort } from "./utils/port_cleanup.js";
import { initializeFirebaseAdmin } from "./firebase.js";
import path from "path";
import fs from "fs";

// Configure Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);

// CORS configuration
import cors from 'cors';
const corsOptions = {
  origin: process.env.NODE_ENV === 'development'
    ? ['http://localhost:5174', 'https://c2ee078f-4b26-4083-bd08-de31e29653e1-00-348t03dcz03jn.sisko.replit.dev', 'http://0.0.0.0:5174']
    : [process.env.CORS_ORIGIN || 'https://c2ee078f-4b26-4083-bd08-de31e29653e1-00-348t03dcz03jn.sisko.replit.dev'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// Global error handling
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err.message);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

async function startServer(port: number) {
  try {
    // Initialize Firebase
    await initializeFirebaseAdmin();
    console.log('Firebase Admin initialized successfully');

    // Create HTTP server
    const server = createServer(app);

    // Register routes first
    registerRoutes(app);

    // Register any remaining API endpoints
    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) {
        console.log(`[API] Handling request: ${req.method} ${req.path}`);
      }
      next();
    });

    // API endpoints will be registered by registerRoutes
    console.log('Server routes registered successfully');

    // Start server
    server.listen(port, '0.0.0.0', () => {
      console.log(`Server started on port ${port}`);
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