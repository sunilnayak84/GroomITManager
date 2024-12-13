import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic } from "./vite.js";
import { createServer } from "http";
import { terminateProcessOnPort } from "./utils/port_cleanup.js";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import admin from "firebase-admin";

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

// Initialize Firebase Admin
async function initializeFirebase(): Promise<boolean> {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000; // 1 second

  async function attemptInitialization(attempt: number = 1): Promise<boolean> {
    try {
      log(`Initializing Firebase in ${isDevelopment ? 'development' : 'production'} mode (attempt ${attempt}/${MAX_RETRIES})`, 'info');

      // Clean up any existing Firebase apps
      if (admin.apps.length) {
        log('Cleaning up existing Firebase apps', 'info');
        await Promise.all(admin.apps.map(app => app?.delete()));
      }

      if (isDevelopment) {
        // In development, use a simple configuration that won't need real credentials
        log('Using development mode configuration', 'info');
        admin.initializeApp({
          projectId: 'demo-project',
          credential: admin.credential.applicationDefault()
        });
        return true;
      }

      // Production configuration
      const firebaseConfig = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      };

      // Validate production credentials
      const missingCredentials = [];
      if (!firebaseConfig.projectId) missingCredentials.push('FIREBASE_PROJECT_ID');
      if (!firebaseConfig.clientEmail) missingCredentials.push('FIREBASE_CLIENT_EMAIL');
      if (!firebaseConfig.privateKey) missingCredentials.push('FIREBASE_PRIVATE_KEY');

      if (missingCredentials.length > 0) {
        throw new Error(`Missing required Firebase credentials: ${missingCredentials.join(', ')}`);
      }

      // Validate private key format
      if (!firebaseConfig.privateKey.includes('BEGIN PRIVATE KEY') || !firebaseConfig.privateKey.includes('END PRIVATE KEY')) {
        throw new Error('Invalid private key format. Please check FIREBASE_PRIVATE_KEY environment variable');
      }

      // Initialize Firebase Admin SDK with enhanced error handling
      try {
        await admin.initializeApp({
          credential: admin.credential.cert(firebaseConfig as admin.ServiceAccount)
        });
      } catch (initError) {
        if (initError instanceof Error) {
          // Handle specific Firebase initialization errors
          if (initError.message.includes('invalid credential')) {
            throw new Error('Invalid Firebase credentials. Please check your service account configuration.');
          } else if (initError.message.includes('already exists')) {
            log('Firebase app already initialized, attempting cleanup and reinitialize', 'warn');
            await Promise.all(admin.apps.map(app => app?.delete()));
            await admin.initializeApp({
              credential: admin.credential.cert(firebaseConfig as admin.ServiceAccount)
            });
          } else {
            throw initError;
          }
        }
      }

      // Setup development admin if needed
      if (isDevelopment) {
        await setupDevelopmentAdmin();
      }

      // Verify initialization by making a test API call
      try {
        await admin.auth().listUsers(1);
        log('Firebase Admin SDK initialized and verified successfully', 'info');
        return true;
      } catch (verifyError) {
        throw new Error(`Firebase initialization verification failed: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Firebase initialization error (attempt ${attempt}/${MAX_RETRIES}): ${errorMessage}`, 'error');

      if (isDevelopment) {
        log('Continuing in development mode despite Firebase error', 'warn');
        return true;
      }

      // Implement exponential backoff for retries
      if (attempt < MAX_RETRIES) {
        const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
        log(`Retrying in ${retryDelay}ms...`, 'info');
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return attemptInitialization(attempt + 1);
      }

      throw new Error(`Firebase initialization failed after ${MAX_RETRIES} attempts: ${errorMessage}`);
    }
  }

  return attemptInitialization();
}

async function setupDevelopmentAdmin(): Promise<void> {
  try {
    const adminEmail = 'admin@groomery.in';
    // Delete existing admin if exists
    const existingUser = await admin.auth().getUserByEmail(adminEmail).catch(() => null);
    if (existingUser) {
      await admin.auth().deleteUser(existingUser.uid);
    }

    // Create new admin user
    const adminUser = await admin.auth().createUser({
      email: adminEmail,
      emailVerified: true,
      displayName: 'Admin User',
      password: 'admin123'
    });

    // Set admin role
    await admin.auth().setCustomUserClaims(adminUser.uid, {
      role: 'admin',
      permissions: ['all'],
      updatedAt: new Date().toISOString()
    });
    
    log('Development admin user setup completed', 'info');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Warning: Failed to setup admin user: ${errorMessage}`, 'warn');
  }
}

// Database connection check
async function checkDatabaseConnection() {
  try {
    const result = await db.execute(sql`SELECT 1`);
    if (result) {
      log("Database connection successful", 'info');
      return true;
    }
  } catch (error) {
    log(`Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    return false;
  }
  return false;
}

// Configure Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);

// CORS configuration
app.use((req, res, next) => {
  const isDevelopment = app.get("env") === "development";
  const origin = isDevelopment 
    ? (req.get('origin') || 'http://localhost:5173') 
    : req.get('origin');
    
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Expose-Headers", "Set-Cookie");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
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

// Graceful shutdown setup
function setupGracefulShutdown(server: any) {
  const shutdown = () => {
    log("Received shutdown signal", 'warn');
    server.close(() => {
      log("HTTP server closed", 'info');
      process.exit(0);
    });

    setTimeout(() => {
      log("Could not close connections in time, forcefully shutting down", 'error');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Main server startup function
interface ServerStartOptions {
  port: number;
  retryCount?: number;
}

async function startServer({ port, retryCount = 0 }: ServerStartOptions): Promise<void> {
  try {
    log(`Starting server (attempt ${retryCount + 1}) on port ${port}...`, 'info');
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Initialize Firebase with development mode fallback
    try {
      const firebaseInitialized = await initializeFirebase();
      if (!firebaseInitialized) {
        if (isDevelopment) {
          log('Firebase initialization failed in development mode - continuing with limited functionality', 'warn');
        } else {
          throw new Error('Firebase initialization failed in production mode');
        }
      }
    } catch (error) {
      if (isDevelopment) {
        log(`Firebase initialization error in development mode: ${error instanceof Error ? error.message : 'Unknown error'} - continuing`, 'warn');
      } else {
        throw error;
      }
    }

    // Check database connection with retries
    let isDatabaseConnected = false;
    for (let i = 0; i < 3; i++) {
      try {
        isDatabaseConnected = await checkDatabaseConnection();
        if (isDatabaseConnected) break;
      } catch (error) {
        log(`Database connection attempt ${i + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
        if (i < 2) await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!isDatabaseConnected) {
      throw new Error('Database connection failed after multiple attempts');
    }

    // Clean up port with better error handling
    try {
      await terminateProcessOnPort(port);
    } catch (error) {
      log(`Port ${port} cleanup warning: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
    }

    // Create HTTP server with enhanced logging
    const server = createServer(app);
    log('HTTP server created successfully', 'info');

    // Register routes with error handling
    try {
      registerRoutes(app);
      log('Routes registered successfully', 'info');
    } catch (error) {
      throw new Error(`Failed to register routes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Setup development or production serving
    if (isDevelopment) {
      try {
        await setupVite(app, server);
        log('Vite middleware setup complete', 'info');
      } catch (error) {
        log(`Vite setup warning: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
      }
    } else {
      serveStatic(app);
      log('Static file serving setup complete', 'info');
    }

    // Start the server with enhanced error handling and logging
    await new Promise<void>((resolve, reject) => {
      const handleError = (error: Error & { code?: string }) => {
        const errorMessage = `Server error: ${error.message} (code: ${error.code || 'none'})`;
        if (error.code === 'EADDRINUSE' && retryCount < 3) {
          log(`Port ${port} is in use, retrying in 2 seconds...`, 'warn');
          setTimeout(() => {
            startServer({ port, retryCount: retryCount + 1 })
              .then(resolve)
              .catch(reject);
          }, 2000);
        } else {
          log(errorMessage, 'error');
          reject(new Error(errorMessage));
        }
      };

      server
        .listen(port, '0.0.0.0')
        .once('listening', () => {
          const address = server.address();
          const actualPort = typeof address === 'object' && address ? address.port : port;
          log(`Server started successfully and listening on port ${actualPort}`, 'info');
          log(`Server URL: http://0.0.0.0:${actualPort}`, 'info');
          setupGracefulShutdown(server);
          resolve();
        })
        .once('error', handleError);
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Server startup failed: ${errorMessage}`, 'error');

    if (retryCount >= 3) {
      throw new Error(`Failed to start server after ${retryCount + 1} attempts: ${errorMessage}`);
    }

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, 2000));
    return startServer({ port, retryCount: retryCount + 1 });
  }
}

// Start the server with proper port handling
const PORT = parseInt(process.env.PORT || '3001', 10);
log(`Starting server with PORT=${PORT}`, 'info');
startServer({ port: PORT }).catch(error => {
  log(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
  process.exit(1);
});