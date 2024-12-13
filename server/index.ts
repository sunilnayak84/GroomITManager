import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic } from "./vite.js";
import { createServer } from "http";
import { terminateProcessOnPort } from "./utils/port_cleanup.js";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import admin from "firebase-admin";

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
try {
  // Clean up any existing Firebase apps
  admin.apps.forEach(app => app?.delete());
  
  // Initialize Firebase Admin
  if (process.env.NODE_ENV === 'development') {
    // Development mode - use mock credentials
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: 'dev-project',
          clientEmail: 'dev@example.com',
          privateKey: 'dummy-key'
        } as admin.ServiceAccount),
        projectId: 'dev-project'
      });
      log('Firebase Admin initialized in development mode', 'info');
      
      // Set up initial admin user in development
      const devAdminUid = 'dev-admin-uid';
      admin.auth().createCustomToken(devAdminUid)
        .then(() => {
          return admin.auth().setCustomUserClaims(devAdminUid, {
            role: 'admin',
            permissions: ['all']
          });
        })
        .then(() => {
          log('Development admin user initialized', 'info');
        })
        .catch(err => {
          log(`Development admin setup warning: ${err.message}`, 'warn');
        });
    } catch (error) {
      log('Development Firebase initialization warning: ' + error.message, 'warn');
      // Continue in development mode despite Firebase errors
    }
  } else {
    // Production mode - use real credentials
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    };

    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      log('Missing Firebase credentials, but continuing in development-like mode', 'warn');
      // Set up a development-like environment
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: 'dev-project',
          clientEmail: 'dev@example.com',
          privateKey: 'dummy-key'
        } as admin.ServiceAccount),
        projectId: 'dev-project'
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
      });
      log('Firebase Admin initialized successfully', 'info');
    }
  }
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  log(`Firebase initialization error: ${errorMessage}`, 'warn');
  
  if (process.env.NODE_ENV === 'development') {
    log('Continuing in development mode despite Firebase error', 'warn');
  } else {
    log('Exiting due to Firebase initialization failure', 'error');
    process.exit(1);
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);

// CORS configuration
const isDevelopment = app.get("env") === "development";
app.use((req, res, next) => {
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
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

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

async function checkDatabaseConnection() {
  try {
    const result = await db.execute(sql`SELECT 1`);
    if (result) {
      log("Database connection successful", 'info');
      return true;
    }
  } catch (error: any) {
    log(`Database connection failed: ${error.message}`, 'error');
    return false;
  }
  return false;
}

// Graceful shutdown handling
function setupGracefulShutdown(server: any) {
  const shutdown = async () => {
    log("Received shutdown signal", 'warn');
    
    server.close(() => {
      log("HTTP server closed", 'info');
      process.exit(0);
    });

    // Force shutdown after 10s
    setTimeout(() => {
      log("Could not close connections in time, forcefully shutting down", 'error');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

(async () => {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  
  try {
    log("Starting server initialization...", 'info');
    
    // First, attempt to clean up the port
    try {
      log(`Cleaning up port ${PORT} before start...`, 'info');
      await terminateProcessOnPort(PORT);
      log("Port cleanup completed", 'info');
    } catch (cleanupError: any) {
      log(`Port cleanup warning: ${cleanupError.message}`, 'warn');
      // Continue anyway as the port might actually be free
    }

    // Check database connection
    const isDatabaseConnected = await checkDatabaseConnection();
    if (!isDatabaseConnected) {
      log("Cannot start server without database connection", 'error');
      process.exit(1);
    }

    // Create server instance
    const server = createServer(app);

    // Register routes
    registerRoutes(app);
    log("Routes registered successfully", 'info');

    // Setup development or production mode
    if (app.get("env") === "development") {
      await setupVite(app, server);
      log("Vite middleware setup complete", 'info');
    } else {
      serveStatic(app);
      log("Static file serving setup complete", 'info');
    }

    // Start server with retries
    const startServer = async (retryCount = 0) => {
      try {
        // Wait for any existing process to release the port
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try to terminate any process using the port
        try {
          await terminateProcessOnPort(PORT);
        } catch (cleanupError) {
          log(`Port cleanup warning: ${cleanupError}`, 'warn');
        }

        await new Promise<void>((resolve, reject) => {
          const serverInstance = server.listen(PORT, '0.0.0.0', () => {
            log(`Server started successfully on port ${PORT}`, 'info');
            log(`Server is accessible at http://0.0.0.0:${PORT}`, 'info');
            resolve();
          });

          serverInstance.on('error', async (err: Error & { code?: string }) => {
            if (err.code === 'EADDRINUSE' && retryCount < 3) {
              log(`Port ${PORT} is in use, retrying in 2 seconds...`, 'warn');
              serverInstance.close();
              setTimeout(async () => {
                try {
                  await startServer(retryCount + 1);
                  resolve();
                } catch (retryError) {
                  reject(retryError);
                }
              }, 2000);
            } else {
              reject(err);
            }
          });
        });
      } catch (error) {
        log(`Failed to start server after ${retryCount} retries: ${error}`, 'error');
        if (retryCount >= 3) {
          throw error;
        }
      }
    };

    await startServer();

    // Setup graceful shutdown
    setupGracefulShutdown(server);

  } catch (error: any) {
    log(`Failed to start server: ${error.message}`, 'error');
    process.exit(1);
  }
})();