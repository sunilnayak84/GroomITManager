import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic } from "./vite.js";
import { createServer } from "http";
// import { terminateProcessOnPort } from "./utils/port_cleanup.js"; // Removed port cleanup dependency
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
    if (isDevelopment) {
      // Development mode - try real credentials first, then fallback to test
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (projectId && clientEmail && privateKey) {
        log('Using real Firebase credentials in development mode', 'info');
        try {
          // Initialize with real credentials
          await initializeFirebaseAdmin();
          log('Firebase Admin SDK initialized with real credentials', 'info');
          return true;
        } catch (error) {
          log(`Failed to initialize with real credentials: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
        }
      }

      // Fallback to test mode if real credentials failed or weren't provided
      log('Falling back to test credentials for development mode', 'warn');
      try {
        // Initialize with test credentials (handled inside initializeFirebaseAdmin)
        await initializeFirebaseAdmin();
        log('Firebase Admin SDK initialized with test credentials', 'info');
        return true;
      } catch (error) {
        // In development, we can continue without Firebase
        log(`Development mode Firebase initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
        log('Continuing without Firebase in development mode', 'warn');
        return true;
      }
    } else {
      // Production mode - requires all environment variables
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKey) {
        const missing = [
          !projectId && 'FIREBASE_PROJECT_ID',
          !clientEmail && 'FIREBASE_CLIENT_EMAIL',
          !privateKey && 'FIREBASE_PRIVATE_KEY'
        ].filter(Boolean);
        throw new Error(`Missing required Firebase environment variables: ${missing.join(', ')}`);
      }

      // Initialize Firebase with production credentials
      await initializeFirebaseAdmin();
      log('Firebase Admin SDK initialized successfully in production mode', 'info');
      return true;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Firebase initialization error: ${errorMessage}`, 'error');
    
    if (isDevelopment) {
      log('Development mode: continuing despite Firebase error', 'warn');
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
async function checkDatabaseConnection(): Promise<boolean> {
  // Development mode - make database optional
  if (isDevelopment) {
    if (!process.env.DATABASE_URL) {
      log('Development mode: No DATABASE_URL provided', 'warn');
      return false;
    }
    
    try {
      await db.execute(sql`SELECT 1`);
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log(`Development mode: Database connection failed (${msg})`, 'warn');
      return false;
    }
  }

  // Production mode - database required
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required in production');
  }

  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Database connection failed: ${msg}`);
  }
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
}

async function startServer({ port }: ServerStartOptions): Promise<void> {
  try {
    log(`Starting server on port ${port}...`, 'info');
    log(`Environment: ${isDevelopment ? 'development' : 'production'}`, 'info');

    // Create HTTP server early
    const server = createServer(app);

    // Initialize Firebase (optional in development)
    try {
      const firebaseInitialized = await initializeFirebase();
      if (firebaseInitialized) {
        log('Firebase initialized successfully', 'info');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (isDevelopment) {
        log(`Development mode: continuing without Firebase (${msg})`, 'warn');
      } else {
        throw error;
      }
    }

    // Check database (optional in development)
    try {
      const isDatabaseConnected = await checkDatabaseConnection();
      if (isDatabaseConnected) {
        log('Database connection successful', 'info');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (isDevelopment) {
        log(`Development mode: continuing without database (${msg})`, 'warn');
      } else {
        throw error;
      }
    }

    // Register routes
    registerRoutes(app);
    log('Routes registered successfully', 'info');

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

    // Start server
    return new Promise<void>((resolve, reject) => {
      server
        .listen(port, '0.0.0.0')
        .once('error', (error: Error) => {
          log(`Server startup error: ${error.message}`, 'error');
          reject(error);
        })
        .once('listening', () => {
          log(`Server started successfully on port ${port}`, 'info');
          setupGracefulShutdown(server);
          resolve();
        });
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Fatal server error: ${errorMessage}`, 'error');
    
    if (isDevelopment) {
      log('Development mode: continuing despite error', 'warn');
      console.error(error);
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