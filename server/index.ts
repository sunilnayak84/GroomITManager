import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic } from "./vite.js";
import { type Server, createServer } from "http";
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

// Port configuration
const DEFAULT_PORT = 3000;
let PORT: number;

try {
  PORT = parseInt(process.env.PORT || DEFAULT_PORT.toString(), 10);
  
  // Validate port configuration
  if (isNaN(PORT) || PORT <= 0 || PORT > 65535) {
    throw new Error(`Invalid port number: ${process.env.PORT}`);
  }
  
  // Log port configuration
  log(`Configured to use port: ${PORT}`, 'info');
} catch (error) {
  log(`Port configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
  PORT = DEFAULT_PORT;
  log(`Falling back to default port: ${DEFAULT_PORT}`, 'warn');
}

// Configure Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Test endpoint with detailed response and CORS verification
app.get('/api/test', (req, res) => {
  const response = {
    status: 'success',
    server: {
      message: 'Server is working correctly',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      port: process.env.PORT || 3000,
      hostname: req.hostname
    },
    request: {
      origin: req.headers.origin || 'no origin',
      host: req.headers.host,
      protocol: req.protocol,
      method: req.method,
      path: req.path
    },
    cors: {
      allowedOrigins: allowedOrigins,
      requestOrigin: req.headers.origin
    }
  };
  
  log('[TEST] Endpoint accessed with details:', 'info');
  log(JSON.stringify(response, null, 2), 'info');
  
  res.json(response);
});

// Additional test endpoint for CORS verification
app.options('/api/test-cors', cors(), (req, res) => {
  log('[CORS] Preflight request received', 'info');
  res.status(200).send('OK');
});

app.get('/api/test-cors', (req, res) => {
  log('[CORS] Test request received', 'info');
  res.json({
    message: 'CORS test successful',
    origin: req.headers.origin
  });
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ 
    status: 'healthy',
    serverTime: new Date().toISOString(),
    port: process.env.PORT || 3000
  });
});
app.set('trust proxy', 1);

// CORS configuration
import cors from 'cors';
const allowedOrigins = [
  'http://localhost:5174',
  'http://0.0.0.0:5174',
  `http://localhost:${PORT}`,
  `http://0.0.0.0:${PORT}`,
  'http://localhost:3000',
  'http://0.0.0.0:3000',
  process.env.CORS_ORIGIN,
  process.env.REPL_SLUG ? [
    `https://${process.env.REPL_SLUG}.repl.co`,
    `https://${process.env.REPL_SLUG}-00.${process.env.REPL_OWNER}.repl.co`,
    `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
  ] : [],
].flat().filter(Boolean) as string[];

// Enhanced CORS configuration with detailed logging
app.use(cors({
  origin: (origin, callback) => {
    log(`Processing CORS request from origin: ${origin || 'no origin'}`, 'info');
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      log(`Allowing request with no origin (local request)`, 'info');
      return callback(null, true);
    }
    
    // In development, log more details about the request
    if (process.env.NODE_ENV === 'development') {
      log(`Development mode - Allowing request from: ${origin}`, 'info');
      return callback(null, true);
    }
    
    // Check against allowed origins
    const isAllowed = allowedOrigins.some(allowedOrigin => 
      origin.startsWith(allowedOrigin) || 
      origin.includes('.repl.co')
    );
    
    if (isAllowed) {
      log(`Allowing request from verified origin: ${origin}`, 'info');
      callback(null, true);
    } else {
      log(`Blocked request from unauthorized origin: ${origin}`, 'warn');
      log(`Allowed origins are: ${JSON.stringify(allowedOrigins)}`, 'info');
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  optionsSuccessStatus: 200,
  preflightContinue: false,
  maxAge: 86400 // 24 hours
}));

// Log all incoming requests
app.use((req, res, next) => {
  log(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'no origin'}`, 'info');
  next();
});

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
  let server: Server | null = null;
  
  try {
    log(`Starting server initialization on port ${port}...`, 'info');

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
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is not set');
      }
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
    server = createServer(app);
    registerRoutes(app);
    
    // Store server reference for cleanup
    activeServer = server;

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
      const MAX_PORT = 3010; // Maximum port to try
      const findAvailablePort = async (startPort: number): Promise<number> => {
        if (startPort > MAX_PORT) {
          throw new Error(`Could not find an available port between ${port} and ${MAX_PORT}`);
        }
        
        return new Promise((portResolve, portReject) => {
          const testServer = createServer();
          testServer.listen(startPort, '0.0.0.0')
            .once('listening', () => {
              testServer.close(() => portResolve(startPort));
            })
            .once('error', (err: Error & { code?: string }) => {
              if (err.code === 'EADDRINUSE') {
                log(`Port ${startPort} is in use, trying next port...`, 'info');
                portResolve(findAvailablePort(startPort + 1));
              } else {
                portReject(err);
              }
            });
        });
      };

      findAvailablePort(port)
        .then((availablePort) => {
          if (!server) {
            throw new Error('Server instance not initialized');
          }

          if (availablePort !== port) {
            log(`Original port ${port} was in use, using port ${availablePort} instead`, 'warn');
          }
          
          server.listen(availablePort, '0.0.0.0')
            .once('listening', () => {
              log(`Server started successfully on port ${availablePort}`, 'info');
              process.env.PORT = availablePort.toString();
              activeServer = server;
              resolve();
            })
            .once('error', (error: Error & { code?: string }) => {
              const errorMessage = `Server startup error on port ${availablePort}: ${error.message}`;
              log(errorMessage, 'error');
              reject(new Error(errorMessage));
            });
        })
        .catch((error) => {
          log(`Fatal error during port selection: ${error.message}`, 'error');
          reject(error);
        });
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Fatal server error: ${errorMessage}`, 'error');
    throw error;
  }
}

// Global server reference for cleanup
let activeServer: Server | null = null;

// Cleanup function
async function cleanup() {
  try {
    if (activeServer) {
      await new Promise<void>((resolve) => {
        activeServer?.close(() => {
          log('Server closed successfully', 'info');
          resolve();
        });
      });
    }
    process.exit(0);
  } catch (error) {
    log(`Error during cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    process.exit(1);
  }
}

// Export the active server for external usage
export { activeServer };

// Handle process signals
process.on('SIGTERM', () => {
  log('Received SIGTERM signal', 'warn');
  cleanup();
});

process.on('SIGINT', () => {
  log('Received SIGINT signal', 'warn');
  cleanup();
});

// Start the server
log(`Starting server on port ${PORT}`, 'info');
startServer(PORT).catch(error => {
  log(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
  process.exit(1);
});