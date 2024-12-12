import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { createServer } from "http";
import { db } from "../db";
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

// Initialize Firebase Admin if not in development mode
if (process.env.NODE_ENV !== 'development') {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    };

    if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
      });
      log('Firebase Admin initialized successfully', 'info');
    } else {
      log('Firebase credentials not found, running in development mode', 'warn');
    }
  } catch (error) {
    log(`Firebase initialization error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
    log('Falling back to development mode', 'warn');
  }
} else {
  log('Running in development mode - skipping Firebase initialization', 'info');
}
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);

// CORS configuration
const isDevelopment = app.get("env") === "development";
app.use((req, res, next) => {
  const origin = isDevelopment 
    ? (req.get('origin') || 'http://localhost:5000') 
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
  try {
    // Check database connection before starting server
    const isDatabaseConnected = await checkDatabaseConnection();
    if (!isDatabaseConnected) {
      throw new Error("Cannot start server without database connection");
    }

    // Register routes with error handling
    try {
      registerRoutes(app);
      log("Routes registered successfully", 'info');
    } catch (error) {
      log(`Failed to register routes: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error;
    }

    const server = createServer(app);

    // Set up graceful shutdown
    setupGracefulShutdown(server);

    // Setup Vite or static serving based on environment
    if (app.get("env") === "development") {
      try {
        // Ensure routes are registered before setting up Vite
        registerRoutes(app);
        log("Routes registered successfully", 'info');

        await setupVite(app, server);
        log("Vite middleware setup complete", 'info');
      } catch (error) {
        log(`Warning: Development server setup error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
      }
    } else {
      try {
        // For production, serve static files first
        serveStatic(app);
        log("Static file serving setup complete", 'info');
        
        // Then register API routes
        registerRoutes(app);
        log("Routes registered successfully", 'info');
      } catch (error) {
        log(`Warning: Production server setup error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
      }
    }

    // Start the server with port handling
    const PORT = parseInt(process.env.PORT || '3001', 10);
    server.listen(PORT, '0.0.0.0', () => {
      log(`Server listening on http://0.0.0.0:${PORT}`, 'info');
    }).on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        log(`Port ${PORT} is already in use. Please use a different port or close the application using this port.`, 'error');
      } else {
        log(`Failed to start server: ${error.message}`, 'error');
      }
      process.exit(1);
    });
  } catch (error: any) {
    log(`Failed to start server: ${error.message}`, 'error');
    if (process.env.NODE_ENV !== 'development') {
      process.exit(1);
    }
  }
})();
