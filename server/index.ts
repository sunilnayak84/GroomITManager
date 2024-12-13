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

// Global development mode flag
const isDevelopment = process.env.NODE_ENV === 'development';

// Initialize Firebase Admin with enhanced error handling
async function initializeFirebase(): Promise<boolean> {
  log(`Initializing Firebase in ${isDevelopment ? 'development' : 'production'} mode`, 'info');

  try {
    // Verify required environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!isDevelopment && (!projectId || !clientEmail || !privateKey)) {
      const missing = [];
      if (!projectId) missing.push('FIREBASE_PROJECT_ID');
      if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
      if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
      throw new Error(`Missing required Firebase environment variables: ${missing.join(', ')}`);
    }

    // Initialize Firebase with retry logic
    let retries = 3;
    let lastError = null;

    while (retries > 0) {
      try {
        const app = await getFirebaseAdmin();
        if (!app && !isDevelopment) {
          throw new Error('Failed to initialize Firebase Admin SDK');
        }
        log('Firebase Admin SDK initialized successfully', 'info');
        return true;
      } catch (error) {
        lastError = error;
        retries--;
        if (retries > 0) {
          log(`Firebase initialization attempt failed, retrying... (${retries} attempts left)`, 'warn');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (lastError) {
      const errorMessage = lastError instanceof Error ? lastError.message : 'Unknown error';
      log(`Firebase initialization error after all retries: ${errorMessage}`, 'error');
      
      if (isDevelopment) {
        log('Continuing in development mode despite Firebase error', 'warn');
        return true;
      }
      throw lastError;
    }

    return false;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Firebase initialization error: ${errorMessage}`, 'error');
    
    if (isDevelopment) {
      log('Continuing in development mode despite Firebase error', 'warn');
      return true;
    }
    throw error;
  }
}

async function setupDevelopmentAdmin(): Promise<void> {
  try {
    const firebaseApp = await getFirebaseAdmin();
    if (!firebaseApp) {
      throw new Error('Firebase Admin not initialized');
    }

    const adminEmail = 'admin@groomery.in';
    let adminUser;
    
    // Try to get existing admin
    try {
      adminUser = await firebaseApp.auth().getUserByEmail(adminEmail);
      log('Existing admin user found', 'info');
    } catch (error) {
      // Create new admin user if doesn't exist
      adminUser = await firebaseApp.auth().createUser({
        email: adminEmail,
        emailVerified: true,
        displayName: 'Admin User',
        password: 'admin123'
      });
      log('New admin user created', 'info');
    }

    // Get database reference
    const db = firebaseApp.database();
    const userRolesRef = db.ref(`roles/${adminUser.uid}`);

    // Set admin role in Realtime Database
    await userRolesRef.set({
      role: 'admin',
      permissions: [
        'manage_appointments',
        'view_appointments',
        'create_appointments',
        'cancel_appointments',
        'manage_customers',
        'view_customers',
        'create_customers',
        'edit_customer_info',
        'manage_services',
        'view_services',
        'create_services',
        'edit_services',
        'manage_inventory',
        'view_inventory',
        'update_stock',
        'manage_consumables',
        'manage_staff_schedule',
        'view_staff_schedule',
        'manage_own_schedule',
        'view_analytics',
        'view_reports',
        'view_financial_reports',
        'all'
      ],
      isAdmin: true,
      updatedAt: new Date().getTime()
    });

    log('Admin role set in database successfully', 'info');

    // Verify the role was set
    const roleSnapshot = await userRolesRef.once('value');
    log('Admin role data:', roleSnapshot.val());

    // Force token refresh
    await firebaseApp.auth().revokeRefreshTokens(adminUser.uid);
    log('Refresh tokens revoked to force token update', 'info');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Warning: Failed to setup admin user: ${errorMessage}`, 'warn');
    if (process.env.NODE_ENV === 'development') {
      log('Continuing despite error in development mode', 'warn');
      return;
    }
    throw error;
  }
}

// Database connection check with retries
async function checkDatabaseConnection(retries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      log(`Attempting database connection (attempt ${attempt}/${retries})`, 'info');
      const result = await db.execute(sql`SELECT 1`);
      if (result) {
        log("Database connection successful", 'info');
        return true;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Database connection failed (attempt ${attempt}/${retries}): ${errorMessage}`, 'warn');
      if (attempt < retries) {
        // Wait for 2 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        log("All database connection attempts failed", 'error');
        if (process.env.NODE_ENV === 'development') {
          log("Continuing in development mode without database", 'warn');
          return true;
        }
        return false;
      }
    }
  }
  return false;
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

// Error handling for module imports
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'status' in err) {
    log(`Syntax Error: ${err.message}`, 'error');
    return res.status(400).send({ status: false, message: err.message });
  }
  next(err);
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
  const isDevelopment = process.env.NODE_ENV === 'development';
  const maxRetries = 3;
  
  try {
    log(`Starting server (attempt ${retryCount + 1}/${maxRetries})...`, 'info');
    log(`Environment: ${isDevelopment ? 'development' : 'production'}`, 'info');
    log(`Port: ${port}`, 'info');

    // Step 1: Clean up port
    try {
      await terminateProcessOnPort(port);
      log('Port cleanup successful', 'info');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Port cleanup warning: ${errorMessage}`, 'warn');
    }

    // Step 2: Initialize Firebase with retries
    let firebaseInitialized = false;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        log(`Initializing Firebase (attempt ${attempt}/${maxRetries})`, 'info');
        firebaseInitialized = await initializeFirebase();
        
        if (firebaseInitialized) {
          log('Firebase initialized successfully', 'info');
          break;
        }
        
        if (attempt < maxRetries) {
          log('Firebase initialization incomplete, retrying...', 'warn');
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else if (isDevelopment) {
          log('Continuing without Firebase in development mode', 'warn');
          break;
        } else {
          throw new Error('Firebase initialization failed after all retries');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log(`Firebase initialization error: ${errorMessage}`, 'error');
        
        if (attempt === maxRetries) {
          if (isDevelopment) {
            log('Continuing without Firebase in development mode', 'warn');
            break;
          }
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Step 3: Check database connection
    try {
      log('Checking database connection...', 'info');
      const isDatabaseConnected = await checkDatabaseConnection(3);
      
      if (!isDatabaseConnected) {
        if (isDevelopment) {
          log('Database connection failed, continuing in development mode', 'warn');
        } else {
          throw new Error('Database connection failed after retries');
        }
      } else {
        log('Database connection successful', 'info');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Database connection error: ${errorMessage}`, 'error');
      
      if (!isDevelopment) {
        throw error;
      }
      log('Continuing without database in development mode', 'warn');
    }

    // Step 4: Create and configure HTTP server
    log('Creating HTTP server...', 'info');
    const server = createServer(app);

    // Step 5: Register routes
    try {
      log('Registering routes...', 'info');
      registerRoutes(app);
      log('Routes registered successfully', 'info');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Failed to register routes: ${errorMessage}`, 'error');
      throw error;
    }

    // Setup development or production serving
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

    // Enhanced error handling for server startup
    return new Promise<void>((resolve, reject) => {
      const startupTimeout = setTimeout(() => {
        reject(new Error(`Server failed to start within 10 seconds on port ${port}`));
      }, 10000);

      server
        .listen(port, '0.0.0.0')
        .once('error', (error: Error & { code?: string }) => {
          clearTimeout(startupTimeout);
          if (error.code === 'EADDRINUSE' && retryCount < 3) {
            log(`Port ${port} is in use, retrying in 2 seconds...`, 'warn');
            setTimeout(() => {
              startServer({ port, retryCount: retryCount + 1 })
                .then(resolve)
                .catch(reject);
            }, 2000);
          } else {
            reject(error);
          }
        })
        .once('listening', () => {
          clearTimeout(startupTimeout);
          log(`Server started successfully on port ${port}`, 'info');
          setupGracefulShutdown(server);
          resolve();
        });
    });

    // Step 6: Start the server with improved error handling
    try {
      log(`Attempting to start server on port ${port}...`, 'info');
      
      await new Promise<void>((resolve, reject) => {
        // Set a timeout for server startup
        const startupTimeout = setTimeout(() => {
          reject(new Error(`Server failed to start within 10 seconds on port ${port}`));
        }, 10000);

        const handleError = (error: Error & { code?: string }) => {
          clearTimeout(startupTimeout);
          
          if (error.code === 'EADDRINUSE' && retryCount < maxRetries) {
            log(`Port ${port} is in use, will retry in 2 seconds...`, 'warn');
            setTimeout(() => {
              startServer({ port, retryCount: retryCount + 1 })
                .then(resolve)
                .catch(reject);
            }, 2000);
          } else {
            log(`Server startup error: ${error.message}`, 'error');
            reject(error);
          }
        };

        server
          .listen(port, '0.0.0.0')
          .once('error', handleError)
          .once('listening', () => {
            clearTimeout(startupTimeout);
            log(`Server started successfully on port ${port}`, 'info');
            setupGracefulShutdown(server);
            resolve();
          });
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Server startup failed: ${errorMessage}`, 'error');

      if (retryCount >= maxRetries) {
        throw new Error(`Failed to start server after ${maxRetries} attempts: ${errorMessage}`);
      }

      log(`Waiting 2 seconds before retry ${retryCount + 1}/${maxRetries}...`, 'warn');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return startServer({ port, retryCount: retryCount + 1 });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Fatal server error: ${errorMessage}`, 'error');
    
    if (isDevelopment) {
      log('Server failed to start in development mode', 'error');
      return;
    }
    throw error;
  }
}

// Start the server
const PORT = parseInt(process.env.PORT || '3001', 10);

// Ensure clean shutdown of previous instance
process.on('SIGTERM', () => {
  log('Received SIGTERM signal', 'warn');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Received SIGINT signal', 'warn');
  process.exit(0);
});

startServer({ port: PORT }).catch(error => {
  log(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
  // Don't exit in development mode
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
});