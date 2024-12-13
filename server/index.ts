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
  log(`Initializing Firebase in ${isDevelopment ? 'development' : 'production'} mode`, 'info');

  try {
    // Clean up any existing Firebase apps
    if (admin.apps.length) {
      log('Cleaning up existing Firebase apps', 'info');
      await Promise.all(admin.apps.map(app => app?.delete()));
    }

    // Configure Firebase
    const firebaseConfig = {
      projectId: isDevelopment ? 'dev-project' : process.env.FIREBASE_PROJECT_ID,
      clientEmail: isDevelopment ? 'dev@example.com' : process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: isDevelopment 
        ? '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC9QFi8Lg3Xy+Vj\nVGQiXhKlLS0xGS4YgW4UF9l4A5H4KlUZ8JfVhqggXmVBITM1Mj1nW7R02eCGXjJ4\nF1HGJ9REh/Qr0kH4NxjWnFxvj4VhZk+zRhSmPEm80u7KnXWW0v0idTzVqeVwnVZF\nX8WAIhN7CfXQZGl1xd/ftUU9EBGgm/ZY7DTqf4TGI3LWxG1dDlh4l2Y=\n-----END PRIVATE KEY-----\n'
        : process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    };

    // Validate credentials in production
    if (!isDevelopment) {
      if (!firebaseConfig.projectId || !firebaseConfig.clientEmail || !firebaseConfig.privateKey) {
        throw new Error('Missing required Firebase credentials in production mode');
      }
    }

    // Initialize Firebase Admin SDK
    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig as admin.ServiceAccount)
    });

    if (isDevelopment) {
      await setupDevelopmentAdmin();
    }

    log('Firebase Admin SDK initialized successfully', 'info');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Firebase initialization error: ${errorMessage}`, 'error');
    
    if (isDevelopment) {
      log('Continuing in development mode despite Firebase error', 'warn');
      return true; // Continue in development mode even if initialization fails
    }
    throw error;
  }
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
    log(`Starting server (attempt ${retryCount + 1})...`, 'info');

    // Initialize Firebase (continue even if it fails in development)
    const firebaseInitialized = await initializeFirebase();
    if (!firebaseInitialized && process.env.NODE_ENV !== 'development') {
      throw new Error('Firebase initialization failed');
    }

    // Check database connection
    const isDatabaseConnected = await checkDatabaseConnection();
    if (!isDatabaseConnected) {
      throw new Error('Database connection failed');
    }

    // Clean up port
    try {
      await terminateProcessOnPort(port);
    } catch (error) {
      log(`Port cleanup warning: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
    }

    // Create HTTP server
    const server = createServer(app);

    // Register routes
    registerRoutes(app);
    log('Routes registered successfully', 'info');

    // Setup development or production serving
    const isDevelopment = app.get("env") === "development";
    if (isDevelopment) {
      await setupVite(app, server);
      log('Vite middleware setup complete', 'info');
    } else {
      serveStatic(app);
      log('Static file serving setup complete', 'info');
    }

    // Start the server
    await new Promise<void>((resolve, reject) => {
      const handleError = (error: Error & { code?: string }) => {
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
      };

      server
        .listen(port, '0.0.0.0')
        .once('listening', () => {
          log(`Server started successfully on port ${port}`, 'info');
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

// Start the server
const PORT = parseInt(process.env.PORT || '3000', 10);
startServer({ port: PORT }).catch(error => {
  log(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
  process.exit(1);
});