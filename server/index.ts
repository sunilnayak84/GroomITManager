import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic } from "./vite.js";
import { createServer } from "http";
import { terminateProcessOnPort } from "./utils/port_cleanup.js";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { initializeFirebaseAdmin, getFirebaseAdmin } from "./firebase.js";
import path from "path";
import fs from "fs";

// Utility function for logging
function log(message: string, type: 'info' | 'error' | 'warn' = 'info') {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const prefix = type === 'error' ? '🔴' : type === 'warn' ? '🟡' : '🟢';
  console.log(`${formattedTime} [express] ${prefix} ${message}`);
}

// Configure Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);

// CORS configuration
import cors from 'cors';
app.use(cors({
  origin: process.env.NODE_ENV === 'development'
    ? ['http://localhost:5174', 'https://c2ee078f-4b26-4083-bd08-de31e29653e1-00-348t03dcz03jn.sisko.replit.dev', 'https://c2ee078f-4b26-4083-bd08-de31e29653e1-00-348t03dcz03jn.sisko.replit.dev:5174']
    : process.env.CORS_ORIGIN || 'https://c2ee078f-4b26-4083-bd08-de31e29653e1-00-348t03dcz03jn.sisko.replit.dev',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  optionsSuccessStatus: 200
}));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      const logType = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      log(logLine, logType);
    }
  });
  next();
});

// Global error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  log(`Error: ${err.message}`, 'error');
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Main server startup function
async function startServer(port: number): Promise<void> {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  try {
    log('Starting server initialization...', 'info');

    // Step 1: Initialize Firebase Admin
    try {
      log('Initializing Firebase Admin...', 'info');
      await initializeFirebaseAdmin();
      log('Firebase Admin initialized successfully', 'info');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Firebase initialization error: ${errorMessage}`, 'error');
      if (!isDevelopment) {
        throw error;
      }
      log('Continuing without Firebase in development mode', 'warn');
    }

    // Step 2: Check database connection
    try {
      log('Checking database connection...', 'info');
      await db.execute(sql`SELECT 1`);
      log('Database connection successful', 'info');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Database connection error: ${errorMessage}`, 'error');
      if (!isDevelopment) {
        throw error;
      }
      log('Continuing without database in development mode', 'warn');
    }

    // Step 3: Create HTTP server and register routes
    const server = createServer(app);
    registerRoutes(app);

    // Step 4: Setup serving mode
    if (isDevelopment) {
      await setupVite(app, server);
      log('Vite middleware setup complete', 'info');
    } else {
      const distPath = path.resolve(process.cwd(), "client", "dist");
      if (!fs.existsSync(distPath)) {
        log('Build directory not found, falling back to development mode', 'warn');
        await setupVite(app, server);
      } else {
        app.use(express.static(distPath));
        app.use("*", (_req, res) => {
          res.sendFile(path.resolve(distPath, "index.html"));
        });
        log('Static file serving setup complete', 'info');
      }
    }

    // Step 5: Start the server
    return new Promise((resolve, reject) => {
      server.listen(port, '0.0.0.0', () => {
        log(`Server started successfully on port ${port}`, 'info');
        resolve();
      }).on('error', (error: Error & { code?: string }) => {
        if (error.code === 'EADDRINUSE') {
          log(`Port ${port} is in use, attempting cleanup...`, 'warn');
          terminateProcessOnPort(port)
            .then(() => startServer(port))
            .then(resolve)
            .catch(reject);
        } else {
          log(`Server startup error: ${error.message}`, 'error');
          reject(error);
        }
      });
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Fatal server error: ${errorMessage}`, 'error');
    throw error;
  }
}

// Start the server
const PORT = parseInt(process.env.PORT || '3000', 10);

// Add unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}\nReason: ${reason}`, 'error');
});

// Add uncaught exception handler
process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`, 'error');
  log(error.stack || '', 'error');
  // Don't exit the process, let it attempt recovery
  log('Attempting to recover from uncaught exception...', 'warn');
});

log(`Starting server on port ${PORT}...`, 'info');

// Enhanced port cleanup and server start sequence
const startupSequence = async () => {
  try {
    // First attempt: Try to terminate any process on the port
    log(`Attempting to clean up port ${PORT}...`, 'info');
    await terminateProcessOnPort(PORT);
    
    // Second attempt: Force kill any remaining process
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await terminateProcessOnPort(PORT);
    } catch (error) {
      log('Secondary port cleanup attempt completed', 'info');
    }

    // Wait a moment before starting the server
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    log('Starting server after port cleanup...', 'info');
    await startServer(PORT);
    log(`Server successfully started on port ${PORT}`, 'info');
  } catch (error) {
    log(`Error during startup sequence: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    if (error instanceof Error && error.stack) {
      log(`Stack trace: ${error.stack}`, 'error');
    }
    // Attempt recovery instead of exiting
    log('Attempting startup recovery...', 'warn');
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return startupSequence(); // Recursive retry
  }
};

// Begin startup sequence
startupSequence().catch(error => {
  log(`Fatal error during server startup: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
  if (error instanceof Error && error.stack) {
    log(`Stack trace: ${error.stack}`, 'error');
  }
  process.exit(1);
});

// Handle process signals
process.on('SIGTERM', () => {
  log('Received SIGTERM signal, shutting down gracefully', 'warn');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Received SIGINT signal, shutting down gracefully', 'warn');
  process.exit(0);
});