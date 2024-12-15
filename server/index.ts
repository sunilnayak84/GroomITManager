import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic } from "./vite.js";
import { createServer } from "http";
import { terminateProcessOnPort } from "./utils/port_cleanup.js";
// Server imports
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

// CORS configuration with enhanced stability
import cors from 'cors';
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.NODE_ENV === 'development'
      ? ['http://localhost:5174', 'https://c2ee078f-4b26-4083-bd08-de31e29653e1-00-348t03dcz03jn.sisko.replit.dev', 'https://c2ee078f-4b26-4083-bd08-de31e29653e1-00-348t03dcz03jn.sisko.replit.dev:5174']
      : [process.env.CORS_ORIGIN || 'https://c2ee078f-4b26-4083-bd08-de31e29653e1-00-348t03dcz03jn.sisko.replit.dev'];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      log(`Rejected CORS request from origin: ${origin}`, 'warn');
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

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
  
  // Create HTTP server and register routes
  const server = createServer(app);
  registerRoutes(app);

  // Setup development mode
  if (isDevelopment) {
    log('Setting up Vite middleware...', 'info');
    await setupVite(app, server);
  } else {
    const distPath = path.resolve(process.cwd(), "client", "dist");
    app.use(express.static(distPath));
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  // Initialize Firebase with retry logic and proper error handling
  const initializeFirebaseWithRetry = async (maxRetries = 3, delayMs = 2000): Promise<void> => {
    log('Starting Firebase initialization...', 'info');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const app = await initializeFirebaseAdmin();
        if (!app) {
          throw new Error('Firebase Admin initialization returned null');
        }
        
        // Verify database connection
        const db = getDatabase(app);
        await db.ref('.info/connected').once('value');
        
        log('Firebase initialized and database connection verified', 'info');
        return;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log(`Firebase initialization attempt ${attempt} failed: ${errorMessage}`, 'warn');
        
        if (attempt === maxRetries) {
          log(`Firebase initialization failed after ${maxRetries} attempts`, 'error');
          throw error;
        }
        
        log(`Retrying in ${delayMs}ms...`, 'info');
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 1.5; // Exponential backoff
      }
    }
  };

  // Initialize Firebase before starting the server
  try {
    await initializeFirebaseWithRetry();
    log('Firebase initialization completed successfully', 'info');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Fatal: Firebase initialization failed - ${errorMessage}`, 'error');
    process.exit(1);
  }

  // Start the server
  return new Promise((resolve, reject) => {
    server.listen(port, '0.0.0.0', () => {
      log(`Server started on port ${port}`, 'info');
      resolve();
    }).on('error', (error) => {
      log(`Server startup error: ${error.message}`, 'error');
      reject(error);
    });
  });
}

// Start the server
const PORT = parseInt(process.env.PORT || '3000', 10);

// Attempt to clean up the port before starting
await terminateProcessOnPort(PORT).catch(error => {
  log(`Port cleanup warning: ${error.message}`, 'warn');
});

// Simple error handling
process.on('unhandledRejection', (reason) => {
  log(`Unhandled Rejection: ${reason}`, 'error');
});

process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`, 'error');
});

// Simple startup sequence
const startupSequence = async () => {
  try {
    log('Starting server...', 'info');
    if (process.env.NODE_ENV === 'development') {
      log('Running in development mode', 'info');
      // In development, we don't need to serve static files
      const server = createServer(app);
      registerRoutes(app);
      await new Promise<void>((resolve, reject) => {
        server.listen(PORT, '0.0.0.0', () => {
          log(`Development server started on port ${PORT}`, 'info');
          resolve();
        }).on('error', reject);
      });
    } else {
      await startServer(PORT);
    }
    log(`Server successfully started on port ${PORT}`, 'info');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Server startup error: ${errorMessage}`, 'error');
    throw error;
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